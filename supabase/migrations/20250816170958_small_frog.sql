/*
  # Sistema de Autenticación y Gestión de Usuarios Internos

  1. Configuración RLS
    - Políticas para staff_users basadas en rol
    - Políticas para audit_log (solo lectura para RH)

  2. Funciones auxiliares
    - Obtener rol del usuario autenticado
    - Validar permisos de RH

  3. Edge Functions preparadas
    - Estructura para operaciones CRUD atómicas
    - Integración con auth.users y staff_users
*/

-- Habilitar RLS en tablas principales
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS role_type
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role role_type;
BEGIN
  SELECT role INTO user_role
  FROM staff_users
  WHERE id = auth.uid() AND active = true;
  
  RETURN user_role;
END;
$$;

-- Función auxiliar para validar si el usuario es RH activo
CREATE OR REPLACE FUNCTION is_rh_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_users
    WHERE id = auth.uid() 
    AND role = 'RH' 
    AND active = true
  );
END;
$$;

-- Políticas RLS para staff_users
CREATE POLICY "RH can manage all staff users"
  ON staff_users
  FOR ALL
  TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

CREATE POLICY "Manager can view own profile"
  ON staff_users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    AND active = true
  );

-- Políticas RLS para audit_log
CREATE POLICY "RH can view all audit logs"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (is_rh_user());

CREATE POLICY "Staff can view logs related to their actions"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    actor_staff_id = auth.uid()
    OR (
      application_id IN (
        SELECT a.id FROM applications a
        JOIN vacancies v ON a.vacancy_id = v.id
        WHERE v.manager_id = auth.uid()
      )
    )
  );

-- Función para registrar en audit_log
CREATE OR REPLACE FUNCTION log_staff_action(
  p_action text,
  p_note text DEFAULT NULL,
  p_application_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_log (
    actor_staff_id,
    application_id,
    action,
    note,
    created_at
  ) VALUES (
    auth.uid(),
    p_application_id,
    p_action,
    p_note,
    now()
  );
END;
$$;

-- Función RPC para obtener el perfil del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile json;
BEGIN
  -- Registrar login
  PERFORM log_staff_action('LOGIN', 'User logged in');
  
  SELECT json_build_object(
    'id', id,
    'full_name', full_name,
    'email', email,
    'role', role,
    'active', active
  ) INTO user_profile
  FROM staff_users
  WHERE id = auth.uid() AND active = true;
  
  IF user_profile IS NULL THEN
    RAISE EXCEPTION 'Access denied: User not found or inactive';
  END IF;
  
  RETURN user_profile;
END;
$$;

-- Función RPC para listar usuarios (solo RH)
CREATE OR REPLACE FUNCTION list_staff_users(
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 20,
  p_role role_type DEFAULT NULL,
  p_active boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  total_count int;
  offset_val int;
BEGIN
  -- Validar permisos
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied: RH role required';
  END IF;
  
  -- Calcular offset
  offset_val := (p_page - 1) * p_page_size;
  
  -- Contar total
  SELECT COUNT(*) INTO total_count
  FROM staff_users
  WHERE (p_role IS NULL OR role = p_role)
    AND (p_active IS NULL OR active = p_active);
  
  -- Obtener datos paginados
  SELECT json_build_object(
    'items', json_agg(
      json_build_object(
        'id', id,
        'full_name', full_name,
        'email', email,
        'role', role,
        'active', active,
        'created_at', created_at,
        'created_by', created_by
      ) ORDER BY created_at DESC
    ),
    'total', total_count,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(total_count::float / p_page_size)
  ) INTO result
  FROM (
    SELECT *
    FROM staff_users
    WHERE (p_role IS NULL OR role = p_role)
      AND (p_active IS NULL OR active = p_active)
    ORDER BY created_at DESC
    LIMIT p_page_size
    OFFSET offset_val
  ) s;
  
  RETURN result;
END;
$$;

-- Función RPC para crear usuario (solo RH)
CREATE OR REPLACE FUNCTION create_staff_user(
  p_full_name text,
  p_email text,
  p_role role_type,
  p_active boolean DEFAULT true,
  p_password text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  result json;
BEGIN
  -- Validar permisos
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied: RH role required';
  END IF;
  
  -- Validar email único
  IF EXISTS (SELECT 1 FROM staff_users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email already exists: %', p_email;
  END IF;
  
  -- Generar ID para el nuevo usuario
  new_user_id := gen_random_uuid();
  
  -- Crear entrada en staff_users
  INSERT INTO staff_users (
    id,
    role,
    full_name,
    email,
    active,
    created_by
  ) VALUES (
    new_user_id,
    p_role,
    p_full_name,
    p_email,
    p_active,
    auth.uid()
  );
  
  -- Registrar acción
  PERFORM log_staff_action(
    'USER_CREATE',
    format('Created user: %s (%s) with role %s', p_full_name, p_email, p_role)
  );
  
  SELECT json_build_object(
    'id', new_user_id,
    'message', 'User created successfully. Auth user must be created separately.'
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Función RPC para actualizar usuario (solo RH)
CREATE OR REPLACE FUNCTION update_staff_user(
  p_id uuid,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_role role_type DEFAULT NULL,
  p_active boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_record staff_users%ROWTYPE;
  changes text[] := '{}';
BEGIN
  -- Validar permisos
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied: RH role required';
  END IF;
  
  -- Obtener registro actual
  SELECT * INTO old_record FROM staff_users WHERE id = p_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_id;
  END IF;
  
  -- Validar email único si se está cambiando
  IF p_email IS NOT NULL AND p_email != old_record.email THEN
    IF EXISTS (SELECT 1 FROM staff_users WHERE email = p_email AND id != p_id) THEN
      RAISE EXCEPTION 'Email already exists: %', p_email;
    END IF;
  END IF;
  
  -- Actualizar campos
  UPDATE staff_users SET
    full_name = COALESCE(p_full_name, full_name),
    email = COALESCE(p_email, email),
    role = COALESCE(p_role, role),
    active = COALESCE(p_active, active)
  WHERE id = p_id;
  
  -- Construir log de cambios
  IF p_full_name IS NOT NULL AND p_full_name != old_record.full_name THEN
    changes := changes || format('full_name: %s → %s', old_record.full_name, p_full_name);
  END IF;
  
  IF p_email IS NOT NULL AND p_email != old_record.email THEN
    changes := changes || format('email: %s → %s', old_record.email, p_email);
  END IF;
  
  IF p_role IS NOT NULL AND p_role != old_record.role THEN
    changes := changes || format('role: %s → %s', old_record.role, p_role);
  END IF;
  
  IF p_active IS NOT NULL AND p_active != old_record.active THEN
    changes := changes || format('active: %s → %s', old_record.active, p_active);
  END IF;
  
  -- Registrar acción
  PERFORM log_staff_action(
    'USER_UPDATE',
    format('Updated user %s: %s', old_record.full_name, array_to_string(changes, ', '))
  );
  
  RETURN json_build_object('ok', true, 'message', 'User updated successfully');
END;
$$;

-- Función RPC para eliminar usuario (solo RH)
CREATE OR REPLACE FUNCTION delete_staff_user(p_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record staff_users%ROWTYPE;
  ref_count int;
BEGIN
  -- Validar permisos
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied: RH role required';
  END IF;
  
  -- Obtener registro
  SELECT * INTO user_record FROM staff_users WHERE id = p_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_id;
  END IF;
  
  -- Verificar referencias
  SELECT COUNT(*) INTO ref_count FROM (
    SELECT 1 FROM vacancies WHERE manager_id = p_id OR created_by = p_id
    UNION ALL
    SELECT 1 FROM staff_users WHERE created_by = p_id
    UNION ALL
    SELECT 1 FROM audit_log WHERE actor_staff_id = p_id
  ) refs;
  
  IF ref_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete user: % references exist. Please reassign or deactivate instead.', ref_count;
  END IF;
  
  -- Eliminar usuario
  DELETE FROM staff_users WHERE id = p_id;
  
  -- Registrar acción
  PERFORM log_staff_action(
    'USER_DELETE',
    format('Deleted user: %s (%s)', user_record.full_name, user_record.email)
  );
  
  RETURN json_build_object('ok', true, 'message', 'User deleted successfully');
END;
$$;