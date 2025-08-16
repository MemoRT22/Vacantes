/*
  # Create public functions and policies for vacancy system

  1. New Functions
    - `list_public_vacancies` - List active vacancies with filters
    - `get_public_vacancy` - Get vacancy details with required docs
    - `apply_to_vacancy` - Process application with idempotency

  2. Security
    - Drop and recreate RLS policy for public vacancy access
    - Ensure candidates and applications tables have proper RLS
*/

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Public can view active vacancies" ON vacancies;

-- Recreate the policy for public access to active vacancies
CREATE POLICY "Public can view active vacancies"
  ON vacancies
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Ensure candidates table has RLS enabled but no public access
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Ensure applications table has RLS enabled but no public access  
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Ensure application_docs table has RLS enabled but no public access
ALTER TABLE application_docs ENABLE ROW LEVEL SECURITY;

-- Function: List public vacancies (active only)
CREATE OR REPLACE FUNCTION list_public_vacancies(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_type vacancy_type DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER := (p_page - 1) * p_page_size;
  v_total INTEGER;
  v_items JSON;
BEGIN
  -- Get total count
  SELECT COUNT(*)
  INTO v_total
  FROM vacancies v
  WHERE v.is_active = true
    AND (p_type IS NULL OR v.type = p_type)
    AND (p_search IS NULL OR v.position ILIKE '%' || p_search || '%');

  -- Get items with pagination
  WITH filtered AS (
    SELECT
      v.id,
      v.position,
      v.type,
      v.is_active
    FROM vacancies v
    WHERE v.is_active = true
      AND (p_type IS NULL OR v.type = p_type)
      AND (p_search IS NULL OR v.position ILIKE '%' || p_search || '%')
    ORDER BY v.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  )
  SELECT COALESCE(
    JSON_AGG(JSON_BUILD_OBJECT(
      'id', id,
      'position', position,
      'type', type,
      'is_active', is_active
    )),
    '[]'::JSON
  )
  INTO v_items
  FROM filtered;

  RETURN JSON_BUILD_OBJECT(
    'items', v_items,
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(v_total::FLOAT / p_page_size)
  );
END;
$$;

-- Function: Get public vacancy details
CREATE OR REPLACE FUNCTION get_public_vacancy(
  p_vacancy_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vacancy JSON;
  v_required_docs JSON;
BEGIN
  -- Get vacancy details (only if active)
  SELECT JSON_BUILD_OBJECT(
    'id', v.id,
    'position', v.position,
    'type', v.type,
    'objetivos', v.objetivos,
    'funciones', v.funciones,
    'escolaridad', v.escolaridad,
    'experiencia_minima', v.experiencia_minima,
    'conocimientos_tecnicos', v.conocimientos_tecnicos,
    'habilidades', v.habilidades
  )
  INTO v_vacancy
  FROM vacancies v
  WHERE v.id = p_vacancy_id AND v.is_active = true;

  IF v_vacancy IS NULL THEN
    RAISE EXCEPTION 'Vacancy not found or not active';
  END IF;

  -- Get required documents
  SELECT COALESCE(
    JSON_AGG(JSON_BUILD_OBJECT(
      'doc', vrd.doc,
      'phase', vrd.phase
    )),
    '[]'::JSON
  )
  INTO v_required_docs
  FROM vacancy_required_docs vrd
  WHERE vrd.vacancy_id = p_vacancy_id;

  -- Combine vacancy data with required docs
  RETURN v_vacancy || JSON_BUILD_OBJECT('required_docs', v_required_docs);
END;
$$;

-- Function: Apply to vacancy (with idempotency)
CREATE OR REPLACE FUNCTION apply_to_vacancy(
  p_vacancy_id UUID,
  p_candidate JSON,
  p_files JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_candidate_id UUID;
  v_application_id UUID;
  v_folio TEXT;
  v_existing_folio TEXT;
  v_file JSON;
  v_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  v_sequence INTEGER;
BEGIN
  -- Validate vacancy is active
  IF NOT EXISTS (
    SELECT 1 FROM vacancies 
    WHERE id = p_vacancy_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Vacancy not found or not active';
  END IF;

  -- Create or get candidate
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

  -- Check if application already exists (idempotency)
  SELECT id, folio INTO v_application_id, v_existing_folio
  FROM applications
  WHERE vacancy_id = p_vacancy_id AND candidate_id = v_candidate_id;

  IF v_existing_folio IS NOT NULL THEN
    -- Return existing application
    RETURN JSON_BUILD_OBJECT(
      'folio', v_existing_folio,
      'status', 'RevisionDeDocumentos'
    );
  END IF;

  -- Generate new folio
  SELECT COALESCE(MAX(
    CASE 
      WHEN folio LIKE 'BIN-' || v_year || '-%' 
      THEN CAST(SUBSTRING(folio FROM 'BIN-' || v_year || '-(.*)') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO v_sequence
  FROM applications;

  v_folio := 'BIN-' || v_year || '-' || LPAD(v_sequence::TEXT, 5, '0');

  -- Create application
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
  FOR v_file IN SELECT * FROM JSON_ARRAY_ELEMENTS(p_files)
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

  -- Log the application creation
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

  RETURN JSON_BUILD_OBJECT(
    'folio', v_folio,
    'status', 'RevisionDeDocumentos'
  );
END;
$$;