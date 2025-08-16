/*
  # Vacancy Management System

  1. New Tables
    - `vacancies`
      - `id` (uuid, primary key)
      - `type` (vacancy_type enum: ADMINISTRATIVO, OPERATIVO)
      - `position` (text, job title)
      - `objetivos` (text, objectives)
      - `funciones` (text, functions)
      - `escolaridad` (text, education requirements)
      - `experiencia_minima` (text, minimum experience)
      - `conocimientos_tecnicos` (text, technical knowledge)
      - `habilidades` (text, skills)
      - `manager_id` (uuid, references staff_users)
      - `is_active` (boolean, default true)
      - `created_by` (uuid, references staff_users)
      - `created_at` (timestamp)

    - `vacancy_required_docs`
      - `vacancy_id` (uuid, references vacancies)
      - `doc` (doc_type enum)
      - `phase` (doc_phase enum: NECESARIO, DESPUES)
      - Primary key: (vacancy_id, doc, phase)

  2. Security
    - Enable RLS on both tables
    - Public can read active vacancies
    - Managers can read their assigned vacancies
    - RH can manage all vacancies

  3. Functions
    - `list_vacancies_admin` - RH lists all vacancies
    - `list_my_vacancies` - Manager lists assigned vacancies
    - `get_vacancy_with_docs` - Get vacancy with required documents
    - `create_vacancy_with_docs` - Create vacancy with documents
    - `update_vacancy_with_docs` - Update vacancy
    - `set_vacancy_required_docs` - Manage required documents

  4. Indexes
    - Performance indexes for common queries
    - Manager and type filtering
*/

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vacancies_manager_active ON vacancies (manager_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vacancies_type_active ON vacancies (type, is_active);
CREATE INDEX IF NOT EXISTS idx_vacancies_active_public ON vacancies (is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacancy_required_docs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vacancies
CREATE POLICY "Public can view active vacancies"
  ON vacancies
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Managers can view assigned vacancies"
  ON vacancies
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "RH can manage all vacancies"
  ON vacancies
  FOR ALL
  TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

-- RLS Policies for vacancy_required_docs
CREATE POLICY "Public can view docs for active vacancies"
  ON vacancy_required_docs
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vacancies v 
      WHERE v.id = vacancy_id AND v.is_active = true
    )
  );

CREATE POLICY "Managers can view docs for assigned vacancies"
  ON vacancy_required_docs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vacancies v 
      WHERE v.id = vacancy_id AND v.manager_id = auth.uid()
    )
  );

CREATE POLICY "RH can manage all vacancy docs"
  ON vacancy_required_docs
  FOR ALL
  TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

-- Function: List all vacancies (RH only)
CREATE OR REPLACE FUNCTION list_vacancies_admin(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_type vacancy_type DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_items JSON;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  v_offset := (p_page - 1) * p_page_size;

  -- Get total count
  SELECT COUNT(*)
  INTO v_total
  FROM vacancies v
  JOIN staff_users s ON v.manager_id = s.id
  WHERE (p_type IS NULL OR v.type = p_type)
    AND (p_is_active IS NULL OR v.is_active = p_is_active);

  -- Get items
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', v.id,
      'type', v.type,
      'position', v.position,
      'objetivos', v.objetivos,
      'funciones', v.funciones,
      'escolaridad', v.escolaridad,
      'experiencia_minima', v.experiencia_minima,
      'conocimientos_tecnicos', v.conocimientos_tecnicos,
      'habilidades', v.habilidades,
      'manager_id', v.manager_id,
      'manager_name', s.full_name,
      'is_active', v.is_active,
      'created_by', v.created_by,
      'created_at', v.created_at
    )
  )
  INTO v_items
  FROM vacancies v
  JOIN staff_users s ON v.manager_id = s.id
  WHERE (p_type IS NULL OR v.type = p_type)
    AND (p_is_active IS NULL OR v.is_active = p_is_active)
  ORDER BY v.created_at DESC
  LIMIT p_page_size OFFSET v_offset;

  RETURN JSON_BUILD_OBJECT(
    'items', COALESCE(v_items, '[]'::JSON),
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(v_total::FLOAT / p_page_size)
  );
END;
$$;

-- Function: List my vacancies (Manager only)
CREATE OR REPLACE FUNCTION list_my_vacancies(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_type vacancy_type DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_items JSON;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is an active manager
  IF NOT EXISTS (
    SELECT 1 FROM staff_users 
    WHERE id = v_user_id AND role = 'MANAGER' AND active = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Active Manager role required.';
  END IF;

  v_offset := (p_page - 1) * p_page_size;

  -- Get total count
  SELECT COUNT(*)
  INTO v_total
  FROM vacancies v
  JOIN staff_users s ON v.manager_id = s.id
  WHERE v.manager_id = v_user_id
    AND (p_type IS NULL OR v.type = p_type)
    AND (p_is_active IS NULL OR v.is_active = p_is_active);

  -- Get items
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', v.id,
      'type', v.type,
      'position', v.position,
      'objetivos', v.objetivos,
      'funciones', v.funciones,
      'escolaridad', v.escolaridad,
      'experiencia_minima', v.experiencia_minima,
      'conocimientos_tecnicos', v.conocimientos_tecnicos,
      'habilidades', v.habilidades,
      'manager_id', v.manager_id,
      'manager_name', s.full_name,
      'is_active', v.is_active,
      'created_by', v.created_by,
      'created_at', v.created_at
    )
  )
  INTO v_items
  FROM vacancies v
  JOIN staff_users s ON v.manager_id = s.id
  WHERE v.manager_id = v_user_id
    AND (p_type IS NULL OR v.type = p_type)
    AND (p_is_active IS NULL OR v.is_active = p_is_active)
  ORDER BY v.created_at DESC
  LIMIT p_page_size OFFSET v_offset;

  RETURN JSON_BUILD_OBJECT(
    'items', COALESCE(v_items, '[]'::JSON),
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(v_total::FLOAT / p_page_size)
  );
END;
$$;

-- Function: Get vacancy with documents
CREATE OR REPLACE FUNCTION get_vacancy_with_docs(p_vacancy_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vacancy JSON;
  v_docs JSON;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Get vacancy data
  SELECT JSON_BUILD_OBJECT(
    'id', v.id,
    'type', v.type,
    'position', v.position,
    'objetivos', v.objetivos,
    'funciones', v.funciones,
    'escolaridad', v.escolaridad,
    'experiencia_minima', v.experiencia_minima,
    'conocimientos_tecnicos', v.conocimientos_tecnicos,
    'habilidades', v.habilidades,
    'manager_id', v.manager_id,
    'manager_name', s.full_name,
    'is_active', v.is_active,
    'created_by', v.created_by,
    'created_at', v.created_at
  )
  INTO v_vacancy
  FROM vacancies v
  JOIN staff_users s ON v.manager_id = s.id
  WHERE v.id = p_vacancy_id
    AND (
      v.is_active = true OR -- Public access to active vacancies
      v.manager_id = v_user_id OR -- Manager access to assigned vacancies
      is_rh_user() -- RH access to all vacancies
    );

  IF v_vacancy IS NULL THEN
    RAISE EXCEPTION 'Vacancy not found or access denied';
  END IF;

  -- Get required documents
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'doc', vrd.doc,
      'phase', vrd.phase
    )
  )
  INTO v_docs
  FROM vacancy_required_docs vrd
  WHERE vrd.vacancy_id = p_vacancy_id;

  -- Add documents to vacancy object
  SELECT JSON_BUILD_OBJECT(
    'id', (v_vacancy->>'id')::UUID,
    'type', v_vacancy->>'type',
    'position', v_vacancy->>'position',
    'objetivos', v_vacancy->>'objetivos',
    'funciones', v_vacancy->>'funciones',
    'escolaridad', v_vacancy->>'escolaridad',
    'experiencia_minima', v_vacancy->>'experiencia_minima',
    'conocimientos_tecnicos', v_vacancy->>'conocimientos_tecnicos',
    'habilidades', v_vacancy->>'habilidades',
    'manager_id', (v_vacancy->>'manager_id')::UUID,
    'manager_name', v_vacancy->>'manager_name',
    'is_active', (v_vacancy->>'is_active')::BOOLEAN,
    'created_by', (v_vacancy->>'created_by')::UUID,
    'created_at', v_vacancy->>'created_at',
    'required_docs', COALESCE(v_docs, '[]'::JSON)
  )
  INTO v_vacancy;

  RETURN v_vacancy;
END;
$$;

-- Function: Create vacancy with documents
CREATE OR REPLACE FUNCTION create_vacancy_with_docs(
  p_type vacancy_type,
  p_position TEXT,
  p_manager_id UUID,
  p_objetivos TEXT DEFAULT NULL,
  p_funciones TEXT DEFAULT NULL,
  p_escolaridad TEXT DEFAULT NULL,
  p_experiencia_minima TEXT DEFAULT NULL,
  p_conocimientos_tecnicos TEXT DEFAULT NULL,
  p_habilidades TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true,
  p_required_docs JSON DEFAULT '[]'::JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vacancy_id UUID;
  v_user_id UUID;
  v_doc JSON;
BEGIN
  v_user_id := auth.uid();

  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  -- Validate manager exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM staff_users 
    WHERE id = p_manager_id AND role = 'MANAGER' AND active = true
  ) THEN
    RAISE EXCEPTION 'Invalid manager_id. Manager must exist and be active.';
  END IF;

  -- Create vacancy
  INSERT INTO vacancies (
    type, position, objetivos, funciones, escolaridad, 
    experiencia_minima, conocimientos_tecnicos, habilidades,
    manager_id, is_active, created_by
  )
  VALUES (
    p_type, p_position, p_objetivos, p_funciones, p_escolaridad,
    p_experiencia_minima, p_conocimientos_tecnicos, p_habilidades,
    p_manager_id, p_is_active, v_user_id
  )
  RETURNING id INTO v_vacancy_id;

  -- Add required documents
  FOR v_doc IN SELECT * FROM JSON_ARRAY_ELEMENTS(p_required_docs)
  LOOP
    INSERT INTO vacancy_required_docs (vacancy_id, doc, phase)
    VALUES (
      v_vacancy_id,
      (v_doc->>'doc')::doc_type,
      (v_doc->>'phase')::doc_phase
    )
    ON CONFLICT (vacancy_id, doc, phase) DO NOTHING;
  END LOOP;

  -- Log audit
  INSERT INTO audit_log (actor_staff_id, action, note)
  VALUES (v_user_id, 'VACANCY_CREATE', 'Created vacancy: ' || p_position);

  RETURN JSON_BUILD_OBJECT('id', v_vacancy_id);
END;
$$;

-- Function: Update vacancy
CREATE OR REPLACE FUNCTION update_vacancy_with_docs(
  p_vacancy_id UUID,
  p_type vacancy_type DEFAULT NULL,
  p_position TEXT DEFAULT NULL,
  p_objetivos TEXT DEFAULT NULL,
  p_funciones TEXT DEFAULT NULL,
  p_escolaridad TEXT DEFAULT NULL,
  p_experiencia_minima TEXT DEFAULT NULL,
  p_conocimientos_tecnicos TEXT DEFAULT NULL,
  p_habilidades TEXT DEFAULT NULL,
  p_manager_id UUID DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_old_active BOOLEAN;
  v_new_active BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  -- Check if vacancy exists
  SELECT is_active INTO v_old_active
  FROM vacancies 
  WHERE id = p_vacancy_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vacancy not found';
  END IF;

  -- Validate manager if provided
  IF p_manager_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM staff_users 
    WHERE id = p_manager_id AND role = 'MANAGER' AND active = true
  ) THEN
    RAISE EXCEPTION 'Invalid manager_id. Manager must exist and be active.';
  END IF;

  -- Update vacancy
  UPDATE vacancies SET
    type = COALESCE(p_type, type),
    position = COALESCE(p_position, position),
    objetivos = COALESCE(p_objetivos, objetivos),
    funciones = COALESCE(p_funciones, funciones),
    escolaridad = COALESCE(p_escolaridad, escolaridad),
    experiencia_minima = COALESCE(p_experiencia_minima, experiencia_minima),
    conocimientos_tecnicos = COALESCE(p_conocimientos_tecnicos, conocimientos_tecnicos),
    habilidades = COALESCE(p_habilidades, habilidades),
    manager_id = COALESCE(p_manager_id, manager_id),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_vacancy_id
  RETURNING is_active INTO v_new_active;

  -- Log audit
  INSERT INTO audit_log (actor_staff_id, action, note)
  VALUES (v_user_id, 'VACANCY_UPDATE', 'Updated vacancy: ' || p_vacancy_id);

  -- Log activation/deactivation if changed
  IF v_old_active != v_new_active THEN
    INSERT INTO audit_log (actor_staff_id, action, note)
    VALUES (
      v_user_id, 
      CASE WHEN v_new_active THEN 'VACANCY_ACTIVATE' ELSE 'VACANCY_DEACTIVATE' END,
      'Vacancy ' || p_vacancy_id || ' ' || CASE WHEN v_new_active THEN 'activated' ELSE 'deactivated' END
    );
  END IF;

  RETURN JSON_BUILD_OBJECT('ok', true);
END;
$$;

-- Function: Set vacancy required documents
CREATE OR REPLACE FUNCTION set_vacancy_required_docs(
  p_vacancy_id UUID,
  p_items JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_doc JSON;
BEGIN
  v_user_id := auth.uid();

  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  -- Check if vacancy exists
  IF NOT EXISTS (SELECT 1 FROM vacancies WHERE id = p_vacancy_id) THEN
    RAISE EXCEPTION 'Vacancy not found';
  END IF;

  -- Delete existing documents
  DELETE FROM vacancy_required_docs WHERE vacancy_id = p_vacancy_id;

  -- Add new documents
  FOR v_doc IN SELECT * FROM JSON_ARRAY_ELEMENTS(p_items)
  LOOP
    INSERT INTO vacancy_required_docs (vacancy_id, doc, phase)
    VALUES (
      p_vacancy_id,
      (v_doc->>'doc')::doc_type,
      (v_doc->>'phase')::doc_phase
    );
  END LOOP;

  -- Log audit
  INSERT INTO audit_log (actor_staff_id, action, note)
  VALUES (v_user_id, 'VACANCY_SET_DOCS', 'Updated required documents for vacancy: ' || p_vacancy_id);

  RETURN JSON_BUILD_OBJECT('ok', true);
END;
$$;