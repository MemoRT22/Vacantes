/*
  # Manager Interview System

  1. New Tables
    - `interview_manager` - Stores manager interview results (score, notes)
  
  2. Functions
    - `get_manager_interview_context` - Get application context for manager
    - `set_manager_schedule` - Set/update manager interview schedule
    - `save_manager_result` - Save manager interview score and notes
    - `list_manager_applications` - List applications for manager's vacancies
  
  3. Security
    - RLS policies for manager access to their assigned applications
    - Audit logging for manager actions
*/

-- Create interview_manager table if not exists
CREATE TABLE IF NOT EXISTS interview_manager (
  application_id uuid PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE interview_manager ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interview_manager
CREATE POLICY "Managers can manage interviews for their vacancies"
  ON interview_manager
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN vacancies v ON a.vacancy_id = v.id
      WHERE a.id = interview_manager.application_id
      AND v.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN vacancies v ON a.vacancy_id = v.id
      WHERE a.id = interview_manager.application_id
      AND v.manager_id = auth.uid()
    )
  );

CREATE POLICY "RH can view all manager interviews"
  ON interview_manager
  FOR SELECT
  TO authenticated
  USING (is_rh_user());

-- Function to get manager interview context
CREATE OR REPLACE FUNCTION get_manager_interview_context(p_application_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_manager_id uuid;
  v_current_user_id uuid := auth.uid();
BEGIN
  -- Get current user ID
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is the assigned manager
  SELECT v.manager_id INTO v_manager_id
  FROM applications a
  JOIN vacancies v ON a.vacancy_id = v.id
  WHERE a.id = p_application_id;

  IF v_manager_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Check if current user is RH or the assigned manager
  IF NOT (is_rh_user() OR v_current_user_id = v_manager_id) THEN
    RAISE EXCEPTION 'Access denied: not assigned manager';
  END IF;

  -- Build the response
  SELECT json_build_object(
    'application', json_build_object(
      'id', a.id,
      'folio', a.folio,
      'status', a.status,
      'candidate', json_build_object(
        'full_name', c.full_name,
        'email', c.email,
        'phone', c.phone
      ),
      'vacancy', json_build_object(
        'id', v.id,
        'position', v.position,
        'type', v.type
      ),
      'schedules', json_build_object(
        'rh', CASE 
          WHEN a.scheduled_rh_at IS NOT NULL THEN
            json_build_object(
              'at', a.scheduled_rh_at,
              'location', a.scheduled_rh_location
            )
          ELSE NULL
        END,
        'manager', CASE 
          WHEN a.scheduled_manager_at IS NOT NULL THEN
            json_build_object(
              'at', a.scheduled_manager_at,
              'location', a.scheduled_manager_location
            )
          ELSE NULL
        END
      )
    ),
    'interview_rh', CASE 
      WHEN ir.application_id IS NOT NULL THEN
        json_build_object(
          'bank_version_id', ir.bank_version_id,
          'started_at', ir.started_at,
          'finished_at', ir.finished_at,
          'questions', (
            SELECT json_agg(
              json_build_object(
                'id', q.id,
                'ord', q.ord,
                'text', q.text,
                'is_required', q.is_required
              ) ORDER BY q.ord
            )
            FROM questions q
            WHERE q.bank_version_id = ir.bank_version_id
          ),
          'answers', ir.answers,
          'extra_questions', ir.extra_questions
        )
      ELSE NULL
    END,
    'interview_manager', CASE 
      WHEN im.application_id IS NOT NULL THEN
        json_build_object(
          'score', im.score,
          'notes', im.notes,
          'created_at', im.created_at,
          'exists', true
        )
      ELSE
        json_build_object('exists', false)
    END
  ) INTO v_result
  FROM applications a
  JOIN candidates c ON a.candidate_id = c.id
  JOIN vacancies v ON a.vacancy_id = v.id
  LEFT JOIN interview_rh ir ON a.id = ir.application_id
  LEFT JOIN interview_manager im ON a.id = im.application_id
  WHERE a.id = p_application_id;

  RETURN v_result;
END;
$$;

-- Function to set manager schedule
CREATE OR REPLACE FUNCTION set_manager_schedule(
  p_application_id uuid,
  p_at timestamptz,
  p_location text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_manager_id uuid;
  v_current_user_id uuid := auth.uid();
  v_current_status application_status;
  v_rh_finished_at timestamptz;
  v_status_changed boolean := false;
  v_was_scheduled boolean := false;
  v_action text;
BEGIN
  -- Get current user ID
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate inputs
  IF p_at IS NULL OR p_location IS NULL OR trim(p_location) = '' THEN
    RAISE EXCEPTION 'Date/time and location are required';
  END IF;

  -- Check if user is the assigned manager
  SELECT v.manager_id, a.status, a.scheduled_manager_at IS NOT NULL
  INTO v_manager_id, v_current_status, v_was_scheduled
  FROM applications a
  JOIN vacancies v ON a.vacancy_id = v.id
  WHERE a.id = p_application_id;

  IF v_manager_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF NOT (is_rh_user() OR v_current_user_id = v_manager_id) THEN
    RAISE EXCEPTION 'Access denied: not assigned manager';
  END IF;

  -- Check if RH interview is finished
  SELECT finished_at INTO v_rh_finished_at
  FROM interview_rh
  WHERE application_id = p_application_id;

  -- Update the schedule
  UPDATE applications
  SET 
    scheduled_manager_at = p_at,
    scheduled_manager_location = p_location,
    status = CASE 
      WHEN v_rh_finished_at IS NOT NULL 
           AND status = 'EntrevistaConRH' THEN 'EntrevistaConManager'::application_status
      ELSE status
    END
  WHERE id = p_application_id;

  -- Check if status changed
  SELECT status INTO v_current_status
  FROM applications
  WHERE id = p_application_id;

  v_status_changed := (v_rh_finished_at IS NOT NULL AND v_current_status = 'EntrevistaConManager');

  -- Determine action for audit
  v_action := CASE 
    WHEN v_was_scheduled THEN 'MANAGER_SCHEDULE_UPDATE'
    ELSE 'MANAGER_SCHEDULE_SET'
  END;

  -- Audit log
  INSERT INTO audit_log (
    actor_staff_id,
    application_id,
    action,
    to_status,
    note,
    created_at
  ) VALUES (
    v_current_user_id,
    p_application_id,
    v_action,
    CASE WHEN v_status_changed THEN v_current_status ELSE NULL END,
    json_build_object(
      'scheduled_at', p_at,
      'location', p_location,
      'status_changed', v_status_changed
    )::text,
    now()
  );

  RETURN json_build_object(
    'ok', true,
    'status_may_change_to', CASE 
      WHEN v_status_changed THEN 'EntrevistaConManager'
      ELSE NULL
    END
  );
END;
$$;

-- Function to save manager result
CREATE OR REPLACE FUNCTION save_manager_result(
  p_application_id uuid,
  p_score integer,
  p_notes text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_manager_id uuid;
  v_current_user_id uuid := auth.uid();
BEGIN
  -- Get current user ID
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate inputs
  IF p_score IS NULL OR p_score < 0 OR p_score > 100 THEN
    RAISE EXCEPTION 'Score must be between 0 and 100';
  END IF;

  -- Check if user is the assigned manager
  SELECT v.manager_id INTO v_manager_id
  FROM applications a
  JOIN vacancies v ON a.vacancy_id = v.id
  WHERE a.id = p_application_id;

  IF v_manager_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF NOT (is_rh_user() OR v_current_user_id = v_manager_id) THEN
    RAISE EXCEPTION 'Access denied: not assigned manager';
  END IF;

  -- Insert or update manager interview
  INSERT INTO interview_manager (application_id, score, notes, created_at)
  VALUES (p_application_id, p_score, COALESCE(p_notes, ''), now())
  ON CONFLICT (application_id)
  DO UPDATE SET
    score = EXCLUDED.score,
    notes = EXCLUDED.notes,
    created_at = now();

  -- Audit log
  INSERT INTO audit_log (
    actor_staff_id,
    application_id,
    action,
    note,
    created_at
  ) VALUES (
    v_current_user_id,
    p_application_id,
    'MANAGER_SCORE_SAVE',
    json_build_object(
      'score', p_score,
      'notes_length', length(COALESCE(p_notes, ''))
    )::text,
    now()
  );

  RETURN json_build_object('ok', true);
END;
$$;

-- Function to list applications for manager
CREATE OR REPLACE FUNCTION list_manager_applications(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20,
  p_status text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id uuid := auth.uid();
  v_offset integer;
  v_total integer;
  v_items json;
BEGIN
  -- Get current user ID
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is a manager
  IF NOT EXISTS (
    SELECT 1 FROM staff_users 
    WHERE id = v_current_user_id 
    AND role = 'MANAGER' 
    AND active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: not a manager';
  END IF;

  -- Calculate offset
  v_offset := (p_page - 1) * p_page_size;

  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM applications a
  JOIN vacancies v ON a.vacancy_id = v.id
  WHERE v.manager_id = v_current_user_id
  AND (p_status IS NULL OR a.status::text = p_status);

  -- Get items
  SELECT json_agg(
    json_build_object(
      'id', a.id,
      'folio', a.folio,
      'status', a.status,
      'candidate', json_build_object(
        'full_name', c.full_name,
        'email', c.email,
        'phone', c.phone
      ),
      'vacancy', json_build_object(
        'id', v.id,
        'position', v.position,
        'type', v.type
      ),
      'scheduled_rh_at', a.scheduled_rh_at,
      'scheduled_rh_location', a.scheduled_rh_location,
      'scheduled_manager_at', a.scheduled_manager_at,
      'scheduled_manager_location', a.scheduled_manager_location,
      'created_at', a.created_at,
      'has_rh_interview', ir.application_id IS NOT NULL,
      'rh_interview_finished', ir.finished_at IS NOT NULL,
      'has_manager_interview', im.application_id IS NOT NULL
    )
  ) INTO v_items
  FROM (
    SELECT a.*
    FROM applications a
    JOIN vacancies v ON a.vacancy_id = v.id
    WHERE v.manager_id = v_current_user_id
    AND (p_status IS NULL OR a.status::text = p_status)
    ORDER BY a.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) a
  JOIN candidates c ON a.candidate_id = c.id
  JOIN vacancies v ON a.vacancy_id = v.id
  LEFT JOIN interview_rh ir ON a.id = ir.application_id
  LEFT JOIN interview_manager im ON a.id = im.application_id;

  RETURN json_build_object(
    'items', COALESCE(v_items, '[]'::json),
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(v_total::float / p_page_size)
  );
END;
$$;

-- Update RLS policies for applications to allow managers to update schedules
CREATE POLICY "Managers can update schedules for their vacancies" ON applications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vacancies v
      WHERE v.id = applications.vacancy_id
      AND v.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vacancies v
      WHERE v.id = applications.vacancy_id
      AND v.manager_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_manager_application_id ON interview_manager(application_id);
CREATE INDEX IF NOT EXISTS idx_applications_manager_status ON applications(vacancy_id, status) WHERE scheduled_manager_at IS NOT NULL;