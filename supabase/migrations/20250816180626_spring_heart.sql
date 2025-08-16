/*
  # Fix vacancy listing functions with proper GROUP BY handling

  1. Functions Updated
    - `list_vacancies_admin` - RH function to list all vacancies with pagination
    - `list_my_vacancies` - Manager function to list their assigned vacancies with pagination

  2. Key Improvements
    - Uses CTE (Common Table Expression) to handle ORDER BY and LIMIT before aggregation
    - Eliminates GROUP BY issues by separating filtering/ordering from JSON aggregation
    - Maintains all existing functionality with better performance
    - Proper error handling and permission checks

  3. Security
    - RH role verification for admin function
    - Manager role verification for my vacancies function
    - Uses auth.uid() for user context
*/

-- RH: listar todas las vacantes (con paginación segura)
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
  v_offset INTEGER := (p_page - 1) * p_page_size;
  v_total  INTEGER;
  v_items  JSON;
BEGIN
  -- Permisos
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  -- Total
  SELECT COUNT(*)
  INTO v_total
  FROM vacancies v
  JOIN staff_users s ON v.manager_id = s.id
  WHERE (p_type IS NULL OR v.type = p_type)
    AND (p_is_active IS NULL OR v.is_active = p_is_active);

  -- Items: ordenar y paginar en subconsulta; luego agregamos
  WITH filtered AS (
    SELECT
      v.id,
      v.type,
      v.position,
      v.objetivos,
      v.funciones,
      v.escolaridad,
      v.experiencia_minima,
      v.conocimientos_tecnicos,
      v.habilidades,
      v.manager_id,
      s.full_name AS manager_name,
      v.is_active,
      v.created_by,
      v.created_at
    FROM vacancies v
    JOIN staff_users s ON v.manager_id = s.id
    WHERE (p_type IS NULL OR v.type = p_type)
      AND (p_is_active IS NULL OR v.is_active = p_is_active)
    ORDER BY v.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  )
  SELECT COALESCE(
           JSON_AGG(JSON_BUILD_OBJECT(
             'id', id,
             'type', type,
             'position', position,
             'objetivos', objetivos,
             'funciones', funciones,
             'escolaridad', escolaridad,
             'experiencia_minima', experiencia_minima,
             'conocimientos_tecnicos', conocimientos_tecnicos,
             'habilidades', habilidades,
             'manager_id', manager_id,
             'manager_name', manager_name,
             'is_active', is_active,
             'created_by', created_by,
             'created_at', created_at
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

-- MANAGER: listar mis vacantes (con paginación segura)
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
  v_offset  INTEGER := (p_page - 1) * p_page_size;
  v_total   INTEGER;
  v_items   JSON;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM staff_users 
    WHERE id = v_user_id AND role = 'MANAGER' AND active = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Active Manager role required.';
  END IF;

  -- Total
  SELECT COUNT(*)
  INTO v_total
  FROM vacancies v
  JOIN staff_users s ON v.manager_id = s.id
  WHERE v.manager_id = v_user_id
    AND (p_type IS NULL OR v.type = p_type)
    AND (p_is_active IS NULL OR v.is_active = p_is_active);

  -- Items: ordenar y paginar en subconsulta; luego agregamos
  WITH filtered AS (
    SELECT
      v.id,
      v.type,
      v.position,
      v.objetivos,
      v.funciones,
      v.escolaridad,
      v.experiencia_minima,
      v.conocimientos_tecnicos,
      v.habilidades,
      v.manager_id,
      s.full_name AS manager_name,
      v.is_active,
      v.created_by,
      v.created_at
    FROM vacancies v
    JOIN staff_users s ON v.manager_id = s.id
    WHERE v.manager_id = v_user_id
      AND (p_type IS NULL OR v.type = p_type)
      AND (p_is_active IS NULL OR v.is_active = p_is_active)
    ORDER BY v.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  )
  SELECT COALESCE(
           JSON_AGG(JSON_BUILD_OBJECT(
             'id', id,
             'type', type,
             'position', position,
             'objetivos', objetivos,
             'funciones', funciones,
             'escolaridad', escolaridad,
             'experiencia_minima', experiencia_minima,
             'conocimientos_tecnicos', conocimientos_tecnicos,
             'habilidades', habilidades,
             'manager_id', manager_id,
             'manager_name', manager_name,
             'is_active', is_active,
             'created_by', created_by,
             'created_at', created_at
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