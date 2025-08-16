/*
  # Application Status Query System

  1. New Functions
    - `get_application_status` - Query application status by folio + email
    - `build_timeline` - Build status timeline for application
    - `get_document_progress` - Get document upload progress

  2. Security
    - Service role function to prevent direct table access
    - Email normalization and validation
    - Rate limiting considerations

  3. Auditing
    - Log status queries in audit_log
*/

-- Function to build timeline based on current status
CREATE OR REPLACE FUNCTION build_timeline(current_status application_status)
RETURNS jsonb AS $$
DECLARE
  timeline jsonb := '[]'::jsonb;
  steps text[] := ARRAY['RevisionDeDocumentos', 'EntrevistaConRH', 'EntrevistaConManager', 'Evaluando'];
  step text;
  step_reached boolean;
  is_current boolean;
  final_status text := null;
BEGIN
  -- Determine final status
  IF current_status = 'Aceptado' THEN
    final_status := 'Aceptado';
  ELSIF current_status = 'Rechazado' THEN
    final_status := 'Rechazado';
  END IF;

  -- Build timeline for each step
  FOREACH step IN ARRAY steps
  LOOP
    step_reached := CASE 
      WHEN step = 'RevisionDeDocumentos' THEN true
      WHEN step = 'EntrevistaConRH' THEN current_status::text IN ('EntrevistaConRH', 'EntrevistaConManager', 'Evaluando', 'Aceptado', 'Rechazado')
      WHEN step = 'EntrevistaConManager' THEN current_status::text IN ('EntrevistaConManager', 'Evaluando', 'Aceptado', 'Rechazado')
      WHEN step = 'Evaluando' THEN current_status::text IN ('Evaluando', 'Aceptado', 'Rechazado')
      ELSE false
    END;

    is_current := (step = current_status::text);

    timeline := timeline || jsonb_build_object(
      'step', step,
      'reached', step_reached,
      'current', is_current
    );
  END LOOP;

  -- Add final step
  timeline := timeline || jsonb_build_object(
    'step', 'Final',
    'reached', final_status IS NOT NULL,
    'current', current_status::text IN ('Aceptado', 'Rechazado'),
    'value', final_status
  );

  RETURN timeline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get document progress for an application
CREATE OR REPLACE FUNCTION get_document_progress(app_id uuid, vacancy_id uuid)
RETURNS jsonb AS $$
DECLARE
  necesarios_required text[];
  necesarios_uploaded text[];
  despues_required text[];
  despues_uploaded text[];
  result jsonb;
BEGIN
  -- Get required documents for NECESARIO phase
  SELECT array_agg(doc::text) INTO necesarios_required
  FROM vacancy_required_docs 
  WHERE vacancy_required_docs.vacancy_id = get_document_progress.vacancy_id 
    AND phase = 'NECESARIO';

  -- Get uploaded documents for NECESARIO phase
  SELECT array_agg(DISTINCT doc::text) INTO necesarios_uploaded
  FROM application_docs 
  WHERE application_id = app_id 
    AND phase = 'NECESARIO';

  -- Get required documents for DESPUES phase
  SELECT array_agg(doc::text) INTO despues_required
  FROM vacancy_required_docs 
  WHERE vacancy_required_docs.vacancy_id = get_document_progress.vacancy_id 
    AND phase = 'DESPUES';

  -- Get uploaded documents for DESPUES phase
  SELECT array_agg(DISTINCT doc::text) INTO despues_uploaded
  FROM application_docs 
  WHERE application_id = app_id 
    AND phase = 'DESPUES';

  -- Handle nulls
  necesarios_required := COALESCE(necesarios_required, ARRAY[]::text[]);
  necesarios_uploaded := COALESCE(necesarios_uploaded, ARRAY[]::text[]);
  despues_required := COALESCE(despues_required, ARRAY[]::text[]);
  despues_uploaded := COALESCE(despues_uploaded, ARRAY[]::text[]);

  result := jsonb_build_object(
    'necesarios', jsonb_build_object(
      'required', to_jsonb(necesarios_required),
      'uploaded', to_jsonb(necesarios_uploaded),
      'pending', to_jsonb(
        ARRAY(
          SELECT unnest(necesarios_required) 
          EXCEPT 
          SELECT unnest(necesarios_uploaded)
        )
      )
    ),
    'despues', jsonb_build_object(
      'required', to_jsonb(despues_required),
      'uploaded', to_jsonb(despues_uploaded),
      'pending', to_jsonb(
        ARRAY(
          SELECT unnest(despues_required) 
          EXCEPT 
          SELECT unnest(despues_uploaded)
        )
      ),
      'can_upload', false -- Will be true only when status = 'Aceptado' in Module 9
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main function to get application status
CREATE OR REPLACE FUNCTION get_application_status(p_folio text, p_email text)
RETURNS jsonb AS $$
DECLARE
  app_record record;
  vacancy_record record;
  candidate_record record;
  timeline jsonb;
  schedules jsonb := '{}'::jsonb;
  docs jsonb;
  result jsonb;
  normalized_email text;
BEGIN
  -- Normalize email to lowercase
  normalized_email := lower(trim(p_email));

  -- Find application with matching folio and email
  SELECT a.*, c.email as candidate_email, c.full_name
  INTO app_record
  FROM applications a
  JOIN candidates c ON a.candidate_id = c.id
  WHERE a.folio = p_folio 
    AND lower(trim(c.email)) = normalized_email;

  -- If no match found, return generic error (avoid enumeration)
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'No se encontró una aplicación con esa combinación de folio y correo electrónico.'
    );
  END IF;

  -- Get vacancy information
  SELECT id, position, type
  INTO vacancy_record
  FROM vacancies
  WHERE id = app_record.vacancy_id;

  -- Build timeline
  timeline := build_timeline(app_record.status);

  -- Build schedules object
  IF app_record.scheduled_rh_at IS NOT NULL THEN
    schedules := schedules || jsonb_build_object(
      'rh', jsonb_build_object(
        'at', app_record.scheduled_rh_at,
        'location', app_record.scheduled_rh_location
      )
    );
  END IF;

  IF app_record.scheduled_manager_at IS NOT NULL THEN
    schedules := schedules || jsonb_build_object(
      'manager', jsonb_build_object(
        'at', app_record.scheduled_manager_at,
        'location', app_record.scheduled_manager_location
      )
    );
  END IF;

  -- Get document progress
  docs := get_document_progress(app_record.id, app_record.vacancy_id);

  -- Update can_upload flag for "despues" documents if status is Aceptado
  IF app_record.status = 'Aceptado' THEN
    docs := jsonb_set(docs, '{despues,can_upload}', 'true'::jsonb);
  END IF;

  -- Build final result
  result := jsonb_build_object(
    'folio', app_record.folio,
    'vacancy', jsonb_build_object(
      'id', vacancy_record.id,
      'position', vacancy_record.position,
      'type', vacancy_record.type
    ),
    'status', app_record.status,
    'timeline', timeline,
    'schedules', schedules,
    'docs', docs
  );

  -- Log the status query for auditing
  INSERT INTO audit_log (
    actor_staff_id,
    application_id,
    action,
    note,
    created_at
  ) VALUES (
    NULL, -- No staff user for public queries
    app_record.id,
    'STATUS_QUERY',
    jsonb_build_object(
      'folio', p_folio,
      'email_hash', encode(digest(normalized_email, 'sha256'), 'hex'),
      'source', 'public_status_page'
    )::text,
    now()
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION get_application_status(text, text) TO anon;
GRANT EXECUTE ON FUNCTION build_timeline(application_status) TO anon;
GRANT EXECUTE ON FUNCTION get_document_progress(uuid, uuid) TO anon;