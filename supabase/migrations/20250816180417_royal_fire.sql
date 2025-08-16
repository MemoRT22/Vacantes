/*
  # Fix GROUP BY error in vacancy listing functions

  1. Updates
    - Fix `list_vacancies_admin` function to remove unnecessary JOIN in COUNT query
    - Fix `list_my_vacancies` function to remove unnecessary JOIN in COUNT query
  
  2. Changes
    - Remove JOIN with staff_users in COUNT queries to avoid GROUP BY issues
    - Keep JOIN only in data selection queries where manager_name is needed
*/

-- Function: List all vacancies (RH only) - FIXED
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

  -- Get total count (NO JOIN to avoid GROUP BY issues)
  SELECT COUNT(*)
  INTO v_total
  FROM vacancies v
  WHERE (p_type IS NULL OR v.type = p_type)
    AND (p_is_active IS NULL OR v.is_active = p_is_active);

  -- Get items (WITH JOIN to get manager_name)
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

-- Function: List my vacancies (Manager only) - FIXED
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

  -- Get total count (NO JOIN to avoid GROUP BY issues)
  SELECT COUNT(*)
  INTO v_total
  FROM vacancies v
  WHERE v.manager_id = v_user_id
    AND (p_type IS NULL OR v.type = p_type)
    AND (p_is_active IS NULL OR v.is_active = p_is_active);

  -- Get items (WITH JOIN to get manager_name)
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