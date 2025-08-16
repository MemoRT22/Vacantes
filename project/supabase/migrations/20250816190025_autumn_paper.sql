/*
  # Application List Functions - Fixed

  1. Functions for listing applications
    - list_applications_for_rh: RH can see all applications
    - get_application_details: Get full application details
    - Proper filtering and pagination

  2. Security
    - RLS enforcement
    - Role-based access control
*/

-- Function to list applications for RH
CREATE OR REPLACE FUNCTION list_applications_for_rh(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20,
  p_status text DEFAULT NULL,
  p_vacancy_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset integer;
  v_total integer;
  v_items jsonb;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Only RH users can list all applications';
  END IF;
  
  -- Calculate offset
  v_offset := (p_page - 1) * p_page_size;
  
  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM applications a
  JOIN candidates c ON c.id = a.candidate_id
  JOIN vacancies v ON v.id = a.vacancy_id
  JOIN staff_users s ON s.id = v.manager_id
  WHERE (p_status IS NULL OR a.status::text = p_status)
    AND (p_vacancy_id IS NULL OR a.vacancy_id = p_vacancy_id);
  
  -- Get items
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'folio', a.folio,
      'candidate_id', a.candidate_id,
      'vacancy_id', a.vacancy_id,
      'status', a.status,
      'scheduled_rh_at', a.scheduled_rh_at,
      'scheduled_rh_location', a.scheduled_rh_location,
      'scheduled_manager_at', a.scheduled_manager_at,
      'scheduled_manager_location', a.scheduled_manager_location,
      'created_at', a.created_at,
      'candidate', jsonb_build_object(
        'full_name', c.full_name,
        'email', c.email,
        'phone', c.phone
      ),
      'vacancy', jsonb_build_object(
        'position', v.position,
        'type', v.type,
        'manager_name', s.full_name
      )
    )
    ORDER BY a.created_at DESC
  ) INTO v_items
  FROM applications a
  JOIN candidates c ON c.id = a.candidate_id
  JOIN vacancies v ON v.id = a.vacancy_id
  JOIN staff_users s ON s.id = v.manager_id
  WHERE (p_status IS NULL OR a.status::text = p_status)
    AND (p_vacancy_id IS NULL OR a.vacancy_id = p_vacancy_id)
  LIMIT p_page_size OFFSET v_offset;
  
  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::jsonb),
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(v_total::float / p_page_size)
  );
END;
$$;

-- Function to get application details
CREATE OR REPLACE FUNCTION get_application_details(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Check if user is RH or manager of the vacancy
  IF NOT (is_rh_user() OR EXISTS (
    SELECT 1 FROM applications a
    JOIN vacancies v ON v.id = a.vacancy_id
    WHERE a.id = p_application_id AND v.manager_id = auth.uid()
  )) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT jsonb_build_object(
    'id', a.id,
    'folio', a.folio,
    'candidate_id', a.candidate_id,
    'vacancy_id', a.vacancy_id,
    'status', a.status,
    'scheduled_rh_at', a.scheduled_rh_at,
    'scheduled_rh_location', a.scheduled_rh_location,
    'scheduled_manager_at', a.scheduled_manager_at,
    'scheduled_manager_location', a.scheduled_manager_location,
    'created_at', a.created_at,
    'candidate', jsonb_build_object(
      'id', c.id,
      'full_name', c.full_name,
      'email', c.email,
      'phone', c.phone,
      'created_at', c.created_at
    ),
    'vacancy', jsonb_build_object(
      'id', v.id,
      'position', v.position,
      'type', v.type,
      'objetivos', v.objetivos,
      'funciones', v.funciones,
      'escolaridad', v.escolaridad,
      'experiencia_minima', v.experiencia_minima,
      'conocimientos_tecnicos', v.conocimientos_tecnicos,
      'habilidades', v.habilidades,
      'manager_id', v.manager_id,
      'manager_name', s.full_name,
      'is_active', v.is_active,
      'created_at', v.created_at
    ),
    'documents', COALESCE(docs.docs, '[]'::jsonb)
  ) INTO v_result
  FROM applications a
  JOIN candidates c ON c.id = a.candidate_id
  JOIN vacancies v ON v.id = a.vacancy_id
  JOIN staff_users s ON s.id = v.manager_id
  LEFT JOIN (
    SELECT 
      ad.application_id,
      jsonb_agg(
        jsonb_build_object(
          'id', ad.id,
          'doc', ad.doc,
          'phase', ad.phase,
          'url', ad.url,
          'version', ad.version,
          'uploaded_at', ad.uploaded_at
        )
        ORDER BY ad.uploaded_at DESC
      ) as docs
    FROM application_docs ad
    GROUP BY ad.application_id
  ) docs ON docs.application_id = a.id
  WHERE a.id = p_application_id;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  RETURN v_result;
END;
$$;