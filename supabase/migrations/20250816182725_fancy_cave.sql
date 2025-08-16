/*
  # Create folio generation function and application management

  1. Functions
    - `generate_folio()` - Generate BIN-YYYY-##### format folio
    - `apply_to_vacancy()` - Handle complete application process

  2. Storage
    - Create candidate-docs bucket for file storage

  3. Audit
    - Add audit logging for application creation and document uploads
*/

-- Function to generate folio in BIN-YYYY-##### format
CREATE OR REPLACE FUNCTION generate_folio()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  sequence_num INTEGER;
  folio TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get next sequence number for current year
  SELECT COALESCE(MAX(
    CASE 
      WHEN folio ~ ('^BIN-' || current_year || '-[0-9]{5}$') 
      THEN CAST(SUBSTRING(folio FROM LENGTH('BIN-' || current_year || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM applications;
  
  -- Format as BIN-YYYY-#####
  folio := 'BIN-' || current_year || '-' || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN folio;
END;
$$ LANGUAGE plpgsql;

-- Function to handle complete application process
CREATE OR REPLACE FUNCTION apply_to_vacancy(
  p_vacancy_id UUID,
  p_candidate JSONB,
  p_files JSONB
) RETURNS JSONB AS $$
DECLARE
  v_candidate_id UUID;
  v_application_id UUID;
  v_folio TEXT;
  v_file JSONB;
  v_existing_application RECORD;
BEGIN
  -- Validate vacancy exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM vacancies 
    WHERE id = p_vacancy_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Vacancy not found or not active';
  END IF;

  -- Upsert candidate by email
  INSERT INTO candidates (full_name, email, phone)
  VALUES (
    p_candidate->>'full_name',
    p_candidate->>'email',
    p_candidate->>'phone'
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone
  RETURNING id INTO v_candidate_id;

  -- Check if application already exists
  SELECT id, folio INTO v_existing_application
  FROM applications
  WHERE vacancy_id = p_vacancy_id AND candidate_id = v_candidate_id;

  IF v_existing_application.id IS NOT NULL THEN
    -- Return existing application folio
    RETURN jsonb_build_object(
      'folio', v_existing_application.folio,
      'status', 'RevisionDeDocumentos',
      'message', 'Application already exists'
    );
  END IF;

  -- Generate folio
  v_folio := generate_folio();

  -- Create new application
  INSERT INTO applications (
    folio,
    candidate_id,
    vacancy_id,
    status
  ) VALUES (
    v_folio,
    v_candidate_id,
    p_vacancy_id,
    'RevisionDeDocumentos'
  ) RETURNING id INTO v_application_id;

  -- Save documents
  FOR v_file IN SELECT * FROM jsonb_array_elements(p_files)
  LOOP
    INSERT INTO application_docs (
      application_id,
      doc,
      phase,
      url,
      version
    ) VALUES (
      v_application_id,
      v_file->>'doc',
      'NECESARIO',
      v_file->>'temp_url',
      1
    );
  END LOOP;

  -- Log application creation
  INSERT INTO audit_log (
    application_id,
    action,
    to_status,
    note
  ) VALUES (
    v_application_id,
    'APPLICATION_CREATE',
    'RevisionDeDocumentos',
    'Application created via public site'
  );

  -- Log document uploads
  FOR v_file IN SELECT * FROM jsonb_array_elements(p_files)
  LOOP
    INSERT INTO audit_log (
      application_id,
      action,
      note
    ) VALUES (
      v_application_id,
      'DOC_UPLOAD',
      'Document uploaded: ' || (v_file->>'doc')
    );
  END LOOP;

  RETURN jsonb_build_object(
    'folio', v_folio,
    'status', 'RevisionDeDocumentos'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;