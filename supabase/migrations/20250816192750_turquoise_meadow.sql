/*
  # Comprehensive RLS Security System - Fixed Version

  1. Helper Functions
    - is_rh_user() - Check if user has RH role
    - is_manager_user() - Check if user has MANAGER role
    - is_manager_of_vacancy() - Check if user is manager of specific vacancy
    - is_rh_or_manager_of_application() - Check access to application

  2. RLS Policies by Table
    - staff_users: RH full access, Manager own profile only
    - vacancies: Public active only, Manager assigned, RH full
    - vacancy_required_docs: Public active docs, Manager own, RH full
    - candidates: RH full, Manager via applications only
    - applications: RH full, Manager own vacancies only
    - application_docs: RH full, Manager own applications
    - question_banks/versions/questions: RH only
    - interview_rh: RH manage, Manager read own
    - interview_manager: Manager own, RH read
    - evaluation_scores/summary: RH during evaluation only
    - audit_log: RH read only

  3. State Transition Machine
    - RevisionDeDocumentos → EntrevistaConRH (RH)
    - EntrevistaConRH → EntrevistaConManager (Manager/RH)
    - EntrevistaConManager → Evaluando (RH)
    - Evaluando → Aceptado/Rechazado (RH)
    - Any state → Rechazado (RH)

  4. Audit System
    - All sensitive actions logged
    - STATUS_CHANGE with from/to states
    - Actor and context tracking
*/

-- Drop existing functions that might have different return types
DROP FUNCTION IF EXISTS finalize_accept(uuid);
DROP FUNCTION IF EXISTS finalize_reject(uuid);
DROP FUNCTION IF EXISTS transition_to_rh_interview(uuid, timestamptz, text);
DROP FUNCTION IF EXISTS transition_to_manager_interview(uuid, timestamptz, text);
DROP FUNCTION IF EXISTS transition_to_evaluating(uuid);

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION is_rh_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_users 
    WHERE id = auth.uid() 
    AND role = 'RH' 
    AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_manager_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_users 
    WHERE id = auth.uid() 
    AND role = 'MANAGER' 
    AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_manager_of_vacancy(vacancy_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vacancies v
    JOIN staff_users s ON v.manager_id = s.id
    WHERE v.id = vacancy_id 
    AND s.id = auth.uid() 
    AND s.role = 'MANAGER' 
    AND s.active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_rh_or_manager_of_application(application_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM applications a
    JOIN vacancies v ON a.vacancy_id = v.id
    JOIN staff_users s ON (v.manager_id = s.id OR s.role = 'RH')
    WHERE a.id = application_id 
    AND s.id = auth.uid() 
    AND s.active = true
  );
$$;

-- Enable RLS on all tables
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacancy_required_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_rh ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_manager ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Manager can view own profile" ON staff_users;
DROP POLICY IF EXISTS "RH can manage all staff users" ON staff_users;
DROP POLICY IF EXISTS "Public can view active vacancies" ON vacancies;
DROP POLICY IF EXISTS "Managers can view assigned vacancies" ON vacancies;
DROP POLICY IF EXISTS "RH can manage all vacancies" ON vacancies;
DROP POLICY IF EXISTS "anon_read_active_vacancies" ON vacancies;
DROP POLICY IF EXISTS "manager_read_assigned" ON vacancies;
DROP POLICY IF EXISTS "rh_read_all" ON vacancies;

-- RLS Policies for staff_users
CREATE POLICY "rh_full_access_staff" ON staff_users
  FOR ALL TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

CREATE POLICY "manager_own_profile" ON staff_users
  FOR SELECT TO authenticated
  USING (id = auth.uid() AND active = true);

-- RLS Policies for vacancies
CREATE POLICY "public_active_vacancies" ON vacancies
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "manager_assigned_vacancies" ON vacancies
  FOR SELECT TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "rh_full_access_vacancies" ON vacancies
  FOR ALL TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

-- RLS Policies for vacancy_required_docs
CREATE POLICY "public_active_vacancy_docs" ON vacancy_required_docs
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM vacancies v 
    WHERE v.id = vacancy_required_docs.vacancy_id 
    AND v.is_active = true
  ));

CREATE POLICY "manager_own_vacancy_docs" ON vacancy_required_docs
  FOR SELECT TO authenticated
  USING (is_manager_of_vacancy(vacancy_id));

CREATE POLICY "rh_full_access_vacancy_docs" ON vacancy_required_docs
  FOR ALL TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

-- RLS Policies for candidates
CREATE POLICY "rh_read_candidates" ON candidates
  FOR SELECT TO authenticated
  USING (is_rh_user());

CREATE POLICY "manager_read_candidates_via_applications" ON candidates
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM applications a
    JOIN vacancies v ON a.vacancy_id = v.id
    WHERE a.candidate_id = candidates.id
    AND v.manager_id = auth.uid()
  ));

-- RLS Policies for applications
CREATE POLICY "rh_full_access_applications" ON applications
  FOR ALL TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

CREATE POLICY "manager_own_vacancy_applications" ON applications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vacancies v
    WHERE v.id = applications.vacancy_id
    AND v.manager_id = auth.uid()
  ));

CREATE POLICY "manager_update_schedules" ON applications
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vacancies v
    WHERE v.id = applications.vacancy_id
    AND v.manager_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM vacancies v
    WHERE v.id = applications.vacancy_id
    AND v.manager_id = auth.uid()
  ));

-- RLS Policies for application_docs
CREATE POLICY "rh_read_application_docs" ON application_docs
  FOR SELECT TO authenticated
  USING (is_rh_user());

CREATE POLICY "manager_read_own_application_docs" ON application_docs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM applications a
    JOIN vacancies v ON a.vacancy_id = v.id
    WHERE a.id = application_docs.application_id
    AND v.manager_id = auth.uid()
  ));

CREATE POLICY "candidates_read_after_docs" ON application_docs
  FOR SELECT TO anon
  USING (
    phase = 'DESPUES' AND
    application_id IN (
      SELECT a.id FROM applications a
      JOIN candidates c ON a.candidate_id = c.id
      WHERE a.folio = current_setting('app.current_folio', true)
      AND c.email = current_setting('app.current_email', true)
    )
  );

-- RLS Policies for question_banks, versions, questions
CREATE POLICY "rh_manage_question_banks" ON question_banks
  FOR ALL TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

CREATE POLICY "rh_manage_question_bank_versions" ON question_bank_versions
  FOR ALL TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

CREATE POLICY "rh_manage_questions" ON questions
  FOR ALL TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

-- RLS Policies for interview_rh
CREATE POLICY "rh_manage_rh_interviews" ON interview_rh
  FOR ALL TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

CREATE POLICY "manager_read_rh_interviews" ON interview_rh
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM applications a
    JOIN vacancies v ON a.vacancy_id = v.id
    WHERE a.id = interview_rh.application_id
    AND v.manager_id = auth.uid()
  ));

-- RLS Policies for interview_manager
CREATE POLICY "manager_own_interviews" ON interview_manager
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM applications a
    JOIN vacancies v ON a.vacancy_id = v.id
    WHERE a.id = interview_manager.application_id
    AND v.manager_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM applications a
    JOIN vacancies v ON a.vacancy_id = v.id
    WHERE a.id = interview_manager.application_id
    AND v.manager_id = auth.uid()
  ));

CREATE POLICY "rh_read_manager_interviews" ON interview_manager
  FOR SELECT TO authenticated
  USING (is_rh_user());

-- RLS Policies for evaluation_scores
CREATE POLICY "rh_manage_evaluation_scores_during_evaluation" ON evaluation_scores
  FOR ALL TO authenticated
  USING (
    is_rh_user() AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = evaluation_scores.application_id
      AND applications.status = 'Evaluando'
    )
  )
  WITH CHECK (
    is_rh_user() AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = evaluation_scores.application_id
      AND applications.status = 'Evaluando'
    )
  );

CREATE POLICY "rh_read_evaluation_scores_after_finalization" ON evaluation_scores
  FOR SELECT TO authenticated
  USING (
    is_rh_user() AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = evaluation_scores.application_id
      AND applications.status IN ('Aceptado', 'Rechazado')
    )
  );

-- RLS Policies for evaluation_summary
CREATE POLICY "rh_manage_evaluation_summary_during_evaluation" ON evaluation_summary
  FOR ALL TO authenticated
  USING (
    is_rh_user() AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = evaluation_summary.application_id
      AND applications.status = 'Evaluando'
    )
  )
  WITH CHECK (
    is_rh_user() AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = evaluation_summary.application_id
      AND applications.status = 'Evaluando'
    )
  );

CREATE POLICY "rh_read_evaluation_summary_after_finalization" ON evaluation_summary
  FOR SELECT TO authenticated
  USING (
    is_rh_user() AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = evaluation_summary.application_id
      AND applications.status IN ('Aceptado', 'Rechazado')
    )
  );

-- RLS Policies for audit_log
CREATE POLICY "rh_read_audit_log" ON audit_log
  FOR SELECT TO authenticated
  USING (is_rh_user());

CREATE POLICY "staff_read_own_actions" ON audit_log
  FOR SELECT TO authenticated
  USING (
    actor_staff_id = auth.uid() OR
    application_id IN (
      SELECT a.id FROM applications a
      JOIN vacancies v ON a.vacancy_id = v.id
      WHERE v.manager_id = auth.uid()
    )
  );

-- Add transition control flag to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS in_transition boolean DEFAULT false;

-- Create trigger to prevent direct status changes
CREATE OR REPLACE FUNCTION prevent_direct_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow if in_transition flag is set (controlled transition)
  IF NEW.in_transition = true THEN
    NEW.in_transition = false; -- Reset flag
    RETURN NEW;
  END IF;
  
  -- Allow if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Prevent direct status changes
  RAISE EXCEPTION 'Direct status changes not allowed. Use transition functions.';
END;
$$;

DROP TRIGGER IF EXISTS prevent_direct_status_change_trigger ON applications;
CREATE TRIGGER prevent_direct_status_change_trigger
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION prevent_direct_status_change();

-- State transition functions
CREATE OR REPLACE FUNCTION transition_to_rh_interview(
  p_application_id uuid,
  p_scheduled_at timestamptz,
  p_location text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record applications%ROWTYPE;
  result jsonb;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  -- Get application
  SELECT * INTO app_record FROM applications WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Validate current status
  IF app_record.status != 'RevisionDeDocumentos' THEN
    RAISE EXCEPTION 'Invalid transition. Current status: %', app_record.status;
  END IF;

  -- TODO: Validate required documents are complete
  -- This would check that all NECESARIO docs for the vacancy are uploaded

  -- Perform transition
  UPDATE applications 
  SET 
    status = 'EntrevistaConRH',
    scheduled_rh_at = p_scheduled_at,
    scheduled_rh_location = p_location,
    in_transition = true
  WHERE id = p_application_id;

  -- Log audit
  INSERT INTO audit_log (actor_staff_id, application_id, action, from_status, to_status, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'STATUS_CHANGE',
    'RevisionDeDocumentos',
    'EntrevistaConRH',
    'RH interview scheduled for ' || p_scheduled_at || ' at ' || p_location
  );

  INSERT INTO audit_log (actor_staff_id, application_id, action, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'INTERVIEW_RH_SCHEDULE',
    'Scheduled at ' || p_location || ' for ' || p_scheduled_at
  );

  result := jsonb_build_object(
    'ok', true,
    'status', 'EntrevistaConRH',
    'scheduled_at', p_scheduled_at,
    'location', p_location
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION transition_to_manager_interview(
  p_application_id uuid,
  p_scheduled_at timestamptz,
  p_location text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record applications%ROWTYPE;
  result jsonb;
BEGIN
  -- Check if user has access (RH or Manager of the vacancy)
  IF NOT (is_rh_user() OR is_rh_or_manager_of_application(p_application_id)) THEN
    RAISE EXCEPTION 'Access denied. RH or assigned Manager role required.';
  END IF;

  -- Get application
  SELECT * INTO app_record FROM applications WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Validate current status
  IF app_record.status != 'EntrevistaConRH' THEN
    RAISE EXCEPTION 'Invalid transition. Current status: %', app_record.status;
  END IF;

  -- Validate RH interview is finished
  IF NOT EXISTS (
    SELECT 1 FROM interview_rh 
    WHERE application_id = p_application_id 
    AND finished_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'RH interview must be completed first';
  END IF;

  -- Perform transition
  UPDATE applications 
  SET 
    status = 'EntrevistaConManager',
    scheduled_manager_at = p_scheduled_at,
    scheduled_manager_location = p_location,
    in_transition = true
  WHERE id = p_application_id;

  -- Log audit
  INSERT INTO audit_log (actor_staff_id, application_id, action, from_status, to_status, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'STATUS_CHANGE',
    'EntrevistaConRH',
    'EntrevistaConManager',
    'Manager interview scheduled for ' || p_scheduled_at || ' at ' || p_location
  );

  INSERT INTO audit_log (actor_staff_id, application_id, action, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'MANAGER_SCHEDULE_SET',
    'Scheduled at ' || p_location || ' for ' || p_scheduled_at
  );

  result := jsonb_build_object(
    'ok', true,
    'status', 'EntrevistaConManager',
    'scheduled_at', p_scheduled_at,
    'location', p_location
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION transition_to_evaluating(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record applications%ROWTYPE;
  result jsonb;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  -- Get application
  SELECT * INTO app_record FROM applications WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Validate current status
  IF app_record.status != 'EntrevistaConManager' THEN
    RAISE EXCEPTION 'Invalid transition. Current status: %', app_record.status;
  END IF;

  -- Validate manager interview exists
  IF NOT EXISTS (
    SELECT 1 FROM interview_manager 
    WHERE application_id = p_application_id 
    AND score IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Manager interview must be completed first';
  END IF;

  -- Perform transition
  UPDATE applications 
  SET 
    status = 'Evaluando',
    in_transition = true
  WHERE id = p_application_id;

  -- Log audit
  INSERT INTO audit_log (actor_staff_id, application_id, action, from_status, to_status, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'STATUS_CHANGE',
    'EntrevistaConManager',
    'Evaluando',
    'Moved to evaluation phase'
  );

  INSERT INTO audit_log (actor_staff_id, application_id, action, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'EVALUATION_START',
    'Evaluation phase started'
  );

  result := jsonb_build_object(
    'ok', true,
    'status', 'Evaluando'
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION finalize_accept(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record applications%ROWTYPE;
  result jsonb;
  criteria_count int;
  scores_count int;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  -- Get application
  SELECT * INTO app_record FROM applications WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Validate current status
  IF app_record.status != 'Evaluando' THEN
    RAISE EXCEPTION 'Invalid transition. Current status: %', app_record.status;
  END IF;

  -- Validate all 16 criteria are scored
  SELECT COUNT(*) INTO criteria_count FROM evaluation_criteria;
  SELECT COUNT(*) INTO scores_count 
  FROM evaluation_scores 
  WHERE application_id = p_application_id;

  IF scores_count != criteria_count THEN
    RAISE EXCEPTION 'All evaluation criteria must be scored. Expected: %, Found: %', criteria_count, scores_count;
  END IF;

  -- Validate evaluation summary exists
  IF NOT EXISTS (
    SELECT 1 FROM evaluation_summary 
    WHERE application_id = p_application_id 
    AND factors_for IS NOT NULL 
    AND factors_against IS NOT NULL 
    AND conclusion IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Complete evaluation summary required';
  END IF;

  -- Perform transition
  UPDATE applications 
  SET 
    status = 'Aceptado',
    in_transition = true
  WHERE id = p_application_id;

  -- Log audit
  INSERT INTO audit_log (actor_staff_id, application_id, action, from_status, to_status, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'STATUS_CHANGE',
    'Evaluando',
    'Aceptado',
    'Candidate accepted after evaluation'
  );

  INSERT INTO audit_log (actor_staff_id, application_id, action, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'EVALUATION_FINALIZE_ACCEPT',
    'Candidate accepted'
  );

  result := jsonb_build_object(
    'ok', true,
    'status', 'Aceptado'
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION finalize_reject(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record applications%ROWTYPE;
  result jsonb;
  old_status text;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Access denied. RH role required.';
  END IF;

  -- Get application
  SELECT * INTO app_record FROM applications WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Store old status for audit
  old_status := app_record.status;

  -- Validate not already finalized
  IF app_record.status IN ('Aceptado', 'Rechazado') THEN
    RAISE EXCEPTION 'Application already finalized with status: %', app_record.status;
  END IF;

  -- Perform transition (allowed from any non-final state)
  UPDATE applications 
  SET 
    status = 'Rechazado',
    in_transition = true
  WHERE id = p_application_id;

  -- Log audit
  INSERT INTO audit_log (actor_staff_id, application_id, action, from_status, to_status, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'STATUS_CHANGE',
    old_status,
    'Rechazado',
    'Candidate rejected'
  );

  INSERT INTO audit_log (actor_staff_id, application_id, action, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'EVALUATION_FINALIZE_REJECT',
    'Candidate rejected from status: ' || old_status
  );

  result := jsonb_build_object(
    'ok', true,
    'status', 'Rechazado'
  );

  RETURN result;
END;
$$;