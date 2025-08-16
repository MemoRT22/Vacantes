/*
  # RH Dashboard System - Corrected Version

  1. New Tables
    - Creates CSV exports bucket for temporary files
    
  2. Materialized Views (without RLS)
    - `mv_applications_by_status` - Application counts by status
    - `mv_avg_time_by_stage` - Average transition times between stages
    - `mv_accept_reject_by_vacancy` - Accept/reject rates per vacancy
    
  3. Functions
    - `get_rh_dashboard_summary` - Dashboard metrics summary
    - `list_applications_admin` - Paginated application listing with filters
    - `export_applications_by_vacancy_csv` - CSV export generation
    - `refresh_dashboard_views` - Refresh materialized views
    
  4. Security
    - RLS policies for function access (RH only)
    - No RLS on materialized views (not supported)
    
  5. Indexes
    - Optimized indexes for dashboard queries
*/

-- Create storage bucket for CSV exports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('csv-exports', 'csv-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Create materialized views for dashboard metrics (NO RLS - not supported)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_applications_by_status AS
SELECT 
  status,
  COUNT(*) as count
FROM applications
GROUP BY status;

-- Fixed: Use CTE to calculate time differences first, then aggregate
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_avg_time_by_stage AS
WITH stage_transitions AS (
  SELECT 
    application_id,
    from_status,
    to_status,
    created_at,
    LAG(created_at) OVER (PARTITION BY application_id ORDER BY created_at) as prev_created_at
  FROM audit_log 
  WHERE from_status IS NOT NULL AND to_status IS NOT NULL
),
time_diffs AS (
  SELECT 
    CONCAT(from_status, '→', to_status) as transition,
    EXTRACT(EPOCH FROM (created_at - prev_created_at)) / 3600 as hours_diff
  FROM stage_transitions
  WHERE prev_created_at IS NOT NULL
)
SELECT 
  transition,
  AVG(hours_diff) as avg_hours
FROM time_diffs
GROUP BY transition
HAVING COUNT(*) >= 3; -- Only show transitions with enough data

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_accept_reject_by_vacancy AS
SELECT 
  v.id as vacancy_id,
  v.position,
  COUNT(CASE WHEN a.status = 'Aceptado' THEN 1 END) as accepted,
  COUNT(CASE WHEN a.status = 'Rechazado' THEN 1 END) as rejected,
  COUNT(*) as total
FROM vacancies v
LEFT JOIN applications a ON v.id = a.vacancy_id
WHERE v.is_active = true
GROUP BY v.id, v.position
HAVING COUNT(*) > 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_status_created ON applications(status, created_at);
CREATE INDEX IF NOT EXISTS idx_applications_vacancy_status ON applications(vacancy_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_log_transitions ON audit_log(application_id, from_status, to_status, created_at);
CREATE INDEX IF NOT EXISTS idx_candidates_search ON candidates USING gin(full_name gin_trgm_ops);

-- Function to get dashboard summary
CREATE OR REPLACE FUNCTION get_rh_dashboard_summary(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  active_vacancies_count int;
  applications_total_count int;
  applications_by_status_data jsonb;
  avg_time_data jsonb;
  accept_reject_data jsonb;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  -- Get active vacancies count
  SELECT COUNT(*) INTO active_vacancies_count
  FROM vacancies 
  WHERE is_active = true;

  -- Get applications total (with date filter if provided)
  SELECT COUNT(*) INTO applications_total_count
  FROM applications a
  WHERE (p_from IS NULL OR a.created_at >= p_from)
    AND (p_to IS NULL OR a.created_at <= p_to);

  -- Get applications by status (with date filter if provided)
  SELECT jsonb_object_agg(status, count) INTO applications_by_status_data
  FROM (
    SELECT 
      a.status,
      COUNT(*) as count
    FROM applications a
    WHERE (p_from IS NULL OR a.created_at >= p_from)
      AND (p_to IS NULL OR a.created_at <= p_to)
    GROUP BY a.status
  ) t;

  -- Get average time by stage from materialized view
  SELECT jsonb_object_agg(transition, ROUND(avg_hours::numeric, 1)) INTO avg_time_data
  FROM mv_avg_time_by_stage
  WHERE avg_hours IS NOT NULL;

  -- Get accept/reject rates by vacancy
  SELECT jsonb_agg(
    jsonb_build_object(
      'vacancy_id', vacancy_id,
      'position', position,
      'accepted', accepted,
      'rejected', rejected,
      'total', total
    )
  ) INTO accept_reject_data
  FROM mv_accept_reject_by_vacancy
  WHERE total > 0;

  -- Build result
  result := jsonb_build_object(
    'active_vacancies', active_vacancies_count,
    'applications_total', applications_total_count,
    'applications_by_status', COALESCE(applications_by_status_data, '{}'::jsonb),
    'avg_time_by_stage_hours', COALESCE(avg_time_data, '{}'::jsonb),
    'accept_reject_rate_by_vacancy', COALESCE(accept_reject_data, '[]'::jsonb)
  );

  -- Log dashboard view
  INSERT INTO audit_log (actor_staff_id, action, note)
  VALUES (auth.uid(), 'RH_DASHBOARD_VIEW', 'Dashboard summary accessed');

  RETURN result;
END;
$$;

-- Function to list applications for admin
CREATE OR REPLACE FUNCTION list_applications_admin(
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 20,
  p_vacancy_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_q text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  total_count int;
  offset_val int;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  -- Calculate offset
  offset_val := (p_page - 1) * p_page_size;

  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM applications a
  JOIN candidates c ON a.candidate_id = c.id
  JOIN vacancies v ON a.vacancy_id = v.id
  JOIN staff_users s ON v.manager_id = s.id
  WHERE (p_vacancy_id IS NULL OR a.vacancy_id = p_vacancy_id)
    AND (p_status IS NULL OR a.status = p_status)
    AND (p_q IS NULL OR c.full_name ILIKE '%' || p_q || '%' OR a.folio ILIKE '%' || p_q || '%')
    AND (p_from IS NULL OR a.created_at >= p_from)
    AND (p_to IS NULL OR a.created_at <= p_to);

  -- Get paginated results
  SELECT jsonb_build_object(
    'items', jsonb_agg(
      jsonb_build_object(
        'application_id', a.id,
        'folio', a.folio,
        'status', a.status,
        'candidate_full_name', c.full_name,
        'candidate_email', c.email,
        'candidate_phone', c.phone,
        'vacancy_id', v.id,
        'vacancy_position', v.position,
        'vacancy_type', v.type,
        'manager_full_name', s.full_name,
        'applied_at', a.created_at
      )
    ),
    'total', total_count,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(total_count::float / p_page_size)
  ) INTO result
  FROM applications a
  JOIN candidates c ON a.candidate_id = c.id
  JOIN vacancies v ON a.vacancy_id = v.id
  JOIN staff_users s ON v.manager_id = s.id
  WHERE (p_vacancy_id IS NULL OR a.vacancy_id = p_vacancy_id)
    AND (p_status IS NULL OR a.status = p_status)
    AND (p_q IS NULL OR c.full_name ILIKE '%' || p_q || '%' OR a.folio ILIKE '%' || p_q || '%')
    AND (p_from IS NULL OR a.created_at >= p_from)
    AND (p_to IS NULL OR a.created_at <= p_to)
  ORDER BY a.created_at DESC
  LIMIT p_page_size OFFSET offset_val;

  RETURN result;
END;
$$;

-- Function to export applications CSV by vacancy
CREATE OR REPLACE FUNCTION export_applications_by_vacancy_csv(
  p_vacancy_id uuid,
  p_status text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  export_id uuid;
  csv_content text;
  filename text;
  vacancy_position text;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  -- Generate export ID
  export_id := gen_random_uuid();

  -- Get vacancy position for filename
  SELECT position INTO vacancy_position
  FROM vacancies 
  WHERE id = p_vacancy_id;

  IF vacancy_position IS NULL THEN
    RAISE EXCEPTION 'Vacancy not found';
  END IF;

  -- Generate filename
  filename := 'vacancy_' || REPLACE(vacancy_position, ' ', '_') || '_' || TO_CHAR(NOW(), 'YYYYMMDD') || '.csv';

  -- Build CSV content
  csv_content := 'Folio,Nombre Completo,Email,Teléfono,Estado,Puesto,Tipo,Manager,Fecha Aplicación' || E'\n';

  -- Add data rows
  SELECT csv_content || STRING_AGG(
    a.folio || ',' ||
    '"' || c.full_name || '",' ||
    c.email || ',' ||
    c.phone || ',' ||
    a.status || ',' ||
    '"' || v.position || '",' ||
    v.type || ',' ||
    '"' || s.full_name || '",' ||
    TO_CHAR(a.created_at, 'YYYY-MM-DD HH24:MI:SS'),
    E'\n'
  ) INTO csv_content
  FROM applications a
  JOIN candidates c ON a.candidate_id = c.id
  JOIN vacancies v ON a.vacancy_id = v.id
  JOIN staff_users s ON v.manager_id = s.id
  WHERE a.vacancy_id = p_vacancy_id
    AND (p_status IS NULL OR a.status = p_status)
    AND (p_from IS NULL OR a.created_at >= p_from)
    AND (p_to IS NULL OR a.created_at <= p_to)
  ORDER BY a.created_at DESC;

  -- Log export action
  INSERT INTO audit_log (actor_staff_id, action, note)
  VALUES (
    auth.uid(), 
    'RH_EXPORT_CSV', 
    'CSV export for vacancy: ' || vacancy_position || ' (ID: ' || p_vacancy_id || ')'
  );

  -- Return result
  result := jsonb_build_object(
    'export_id', export_id,
    'filename', filename,
    'csv_content', csv_content
  );

  RETURN result;
END;
$$;

-- Function to refresh dashboard materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  -- Refresh all materialized views
  REFRESH MATERIALIZED VIEW mv_applications_by_status;
  REFRESH MATERIALIZED VIEW mv_avg_time_by_stage;
  REFRESH MATERIALIZED VIEW mv_accept_reject_by_vacancy;

  -- Log refresh action
  INSERT INTO audit_log (actor_staff_id, action, note)
  VALUES (auth.uid(), 'RH_DASHBOARD_REFRESH', 'Dashboard views refreshed');
END;
$$;