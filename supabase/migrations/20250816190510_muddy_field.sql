/*
  # Create Final Evaluation System

  1. New Functions
    - `start_evaluation`: Move application to Evaluando status
    - `save_evaluation_scores`: Save 16 criteria scores (1-5 scale)
    - `save_evaluation_summary`: Save conclusions and factors
    - `finalize_accept`: Accept candidate and change status
    - `finalize_reject`: Reject candidate and change status
    - `get_evaluation_context`: Get full evaluation context for RH

  2. Security
    - RLS policies for evaluation tables (RH only)
    - Validation functions for preconditions
    - Audit logging for all evaluation actions

  3. Validations
    - Interview RH must be finished
    - Manager interview must exist with score
    - All 16 criteria must be scored (1-5)
    - Summary fields required before finalizing
    - Read-only after finalization
*/

-- Function to check if application can start evaluation
CREATE OR REPLACE FUNCTION can_start_evaluation(p_application_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rh_finished boolean := false;
  v_manager_exists boolean := false;
BEGIN
  -- Check if RH interview is finished
  SELECT EXISTS(
    SELECT 1 FROM interview_rh 
    WHERE application_id = p_application_id 
    AND finished_at IS NOT NULL
  ) INTO v_rh_finished;
  
  -- Check if manager interview exists with score
  SELECT EXISTS(
    SELECT 1 FROM interview_manager 
    WHERE application_id = p_application_id 
    AND score IS NOT NULL
  ) INTO v_manager_exists;
  
  RETURN v_rh_finished AND v_manager_exists;
END;
$$;

-- Function to start evaluation
CREATE OR REPLACE FUNCTION start_evaluation(p_application_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_current_status application_status;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Only RH users can start evaluation';
  END IF;
  
  -- Check preconditions
  IF NOT can_start_evaluation(p_application_id) THEN
    RAISE EXCEPTION 'Cannot start evaluation: missing RH interview completion or manager score';
  END IF;
  
  -- Get current status
  SELECT status INTO v_current_status
  FROM applications 
  WHERE id = p_application_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  -- Update status to Evaluando if not already
  IF v_current_status != 'Evaluando' THEN
    UPDATE applications 
    SET status = 'Evaluando'
    WHERE id = p_application_id;
  END IF;
  
  -- Log audit event
  INSERT INTO audit_log (actor_staff_id, application_id, action, from_status, to_status, note)
  VALUES (
    uid(), 
    p_application_id, 
    'EVALUATION_START', 
    v_current_status, 
    'Evaluando',
    'Evaluation started by RH'
  );
  
  v_result := json_build_object(
    'ok', true,
    'status', 'Evaluando'
  );
  
  RETURN v_result;
END;
$$;

-- Function to save evaluation scores
CREATE OR REPLACE FUNCTION save_evaluation_scores(
  p_application_id uuid,
  p_scores json
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_total smallint := 0;
  v_score_item json;
  v_criterion_id integer;
  v_score smallint;
  v_status application_status;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Only RH users can save evaluation scores';
  END IF;
  
  -- Check if application is in Evaluando status
  SELECT status INTO v_status
  FROM applications 
  WHERE id = p_application_id;
  
  IF v_status != 'Evaluando' THEN
    RAISE EXCEPTION 'Application must be in Evaluando status to save scores';
  END IF;
  
  -- Validate we have exactly 16 scores
  IF json_array_length(p_scores) != 16 THEN
    RAISE EXCEPTION 'Must provide exactly 16 criterion scores';
  END IF;
  
  -- Clear existing scores
  DELETE FROM evaluation_scores WHERE application_id = p_application_id;
  
  -- Insert new scores
  FOR i IN 0..15 LOOP
    v_score_item := p_scores->i;
    v_criterion_id := (v_score_item->>'criterion_id')::integer;
    v_score := (v_score_item->>'score')::smallint;
    
    -- Validate score range
    IF v_score < 1 OR v_score > 5 THEN
      RAISE EXCEPTION 'Score must be between 1 and 5';
    END IF;
    
    -- Insert score
    INSERT INTO evaluation_scores (application_id, criterion_id, score)
    VALUES (p_application_id, v_criterion_id, v_score);
    
    v_total := v_total + v_score;
  END LOOP;
  
  -- Update or insert summary with total
  INSERT INTO evaluation_summary (application_id, total)
  VALUES (p_application_id, v_total)
  ON CONFLICT (application_id) 
  DO UPDATE SET total = v_total;
  
  -- Log audit event
  INSERT INTO audit_log (actor_staff_id, application_id, action, note)
  VALUES (
    uid(), 
    p_application_id, 
    'EVALUATION_SAVE', 
    'Evaluation scores saved, total: ' || v_total
  );
  
  v_result := json_build_object(
    'ok', true,
    'total', v_total
  );
  
  RETURN v_result;
END;
$$;

-- Function to save evaluation summary
CREATE OR REPLACE FUNCTION save_evaluation_summary(
  p_application_id uuid,
  p_factors_for text,
  p_factors_against text,
  p_conclusion text,
  p_references_laborales text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_status application_status;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Only RH users can save evaluation summary';
  END IF;
  
  -- Check if application is in Evaluando status
  SELECT status INTO v_status
  FROM applications 
  WHERE id = p_application_id;
  
  IF v_status != 'Evaluando' THEN
    RAISE EXCEPTION 'Application must be in Evaluando status to save summary';
  END IF;
  
  -- Validate required fields
  IF p_factors_for IS NULL OR trim(p_factors_for) = '' THEN
    RAISE EXCEPTION 'Factors for is required';
  END IF;
  
  IF p_factors_against IS NULL OR trim(p_factors_against) = '' THEN
    RAISE EXCEPTION 'Factors against is required';
  END IF;
  
  IF p_conclusion IS NULL OR trim(p_conclusion) = '' THEN
    RAISE EXCEPTION 'Conclusion is required';
  END IF;
  
  -- Update summary
  UPDATE evaluation_summary 
  SET 
    factors_for = p_factors_for,
    factors_against = p_factors_against,
    conclusion = p_conclusion,
    references_laborales = p_references_laborales
  WHERE application_id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evaluation summary not found. Save scores first.';
  END IF;
  
  v_result := json_build_object('ok', true);
  
  RETURN v_result;
END;
$$;

-- Function to finalize evaluation (accept)
CREATE OR REPLACE FUNCTION finalize_accept(p_application_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_status application_status;
  v_summary_complete boolean := false;
  v_scores_complete boolean := false;
  v_total smallint;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Only RH users can finalize evaluation';
  END IF;
  
  -- Check if application is in Evaluando status
  SELECT status INTO v_status
  FROM applications 
  WHERE id = p_application_id;
  
  IF v_status != 'Evaluando' THEN
    RAISE EXCEPTION 'Application must be in Evaluando status to finalize';
  END IF;
  
  -- Check if summary is complete
  SELECT 
    (factors_for IS NOT NULL AND trim(factors_for) != '' AND
     factors_against IS NOT NULL AND trim(factors_against) != '' AND
     conclusion IS NOT NULL AND trim(conclusion) != ''),
    total
  INTO v_summary_complete, v_total
  FROM evaluation_summary 
  WHERE application_id = p_application_id;
  
  IF NOT v_summary_complete THEN
    RAISE EXCEPTION 'Evaluation summary must be complete before finalizing';
  END IF;
  
  -- Check if all 16 scores exist
  SELECT COUNT(*) = 16 INTO v_scores_complete
  FROM evaluation_scores 
  WHERE application_id = p_application_id;
  
  IF NOT v_scores_complete THEN
    RAISE EXCEPTION 'All 16 evaluation scores must be completed before finalizing';
  END IF;
  
  -- Update application status to Aceptado
  UPDATE applications 
  SET status = 'Aceptado'
  WHERE id = p_application_id;
  
  -- Log audit event
  INSERT INTO audit_log (actor_staff_id, application_id, action, from_status, to_status, note)
  VALUES (
    uid(), 
    p_application_id, 
    'EVALUATION_FINALIZE_ACCEPT', 
    'Evaluando', 
    'Aceptado',
    'Evaluation finalized - ACCEPTED, total score: ' || v_total
  );
  
  v_result := json_build_object(
    'ok', true,
    'status', 'Aceptado'
  );
  
  RETURN v_result;
END;
$$;

-- Function to finalize evaluation (reject)
CREATE OR REPLACE FUNCTION finalize_reject(p_application_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_status application_status;
  v_summary_complete boolean := false;
  v_scores_complete boolean := false;
  v_total smallint;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Only RH users can finalize evaluation';
  END IF;
  
  -- Check if application is in Evaluando status
  SELECT status INTO v_status
  FROM applications 
  WHERE id = p_application_id;
  
  IF v_status != 'Evaluando' THEN
    RAISE EXCEPTION 'Application must be in Evaluando status to finalize';
  END IF;
  
  -- Check if summary is complete
  SELECT 
    (factors_for IS NOT NULL AND trim(factors_for) != '' AND
     factors_against IS NOT NULL AND trim(factors_against) != '' AND
     conclusion IS NOT NULL AND trim(conclusion) != ''),
    total
  INTO v_summary_complete, v_total
  FROM evaluation_summary 
  WHERE application_id = p_application_id;
  
  IF NOT v_summary_complete THEN
    RAISE EXCEPTION 'Evaluation summary must be complete before finalizing';
  END IF;
  
  -- Check if all 16 scores exist
  SELECT COUNT(*) = 16 INTO v_scores_complete
  FROM evaluation_scores 
  WHERE application_id = p_application_id;
  
  IF NOT v_scores_complete THEN
    RAISE EXCEPTION 'All 16 evaluation scores must be completed before finalizing';
  END IF;
  
  -- Update application status to Rechazado
  UPDATE applications 
  SET status = 'Rechazado'
  WHERE id = p_application_id;
  
  -- Log audit event
  INSERT INTO audit_log (actor_staff_id, application_id, action, from_status, to_status, note)
  VALUES (
    uid(), 
    p_application_id, 
    'EVALUATION_FINALIZE_REJECT', 
    'Evaluando', 
    'Rechazado',
    'Evaluation finalized - REJECTED, total score: ' || v_total
  );
  
  v_result := json_build_object(
    'ok', true,
    'status', 'Rechazado'
  );
  
  RETURN v_result;
END;
$$;

-- Function to get evaluation context
CREATE OR REPLACE FUNCTION get_evaluation_context(p_application_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_application json;
  v_interview_rh json;
  v_interview_manager json;
  v_evaluation json;
  v_criteria json;
  v_scores json;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Only RH users can view evaluation context';
  END IF;
  
  -- Get application data
  SELECT json_build_object(
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
    'created_at', a.created_at
  ) INTO v_application
  FROM applications a
  JOIN candidates c ON a.candidate_id = c.id
  JOIN vacancies v ON a.vacancy_id = v.id
  WHERE a.id = p_application_id;
  
  IF v_application IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  -- Get RH interview data
  SELECT json_build_object(
    'bank_version_id', ir.bank_version_id,
    'started_at', ir.started_at,
    'finished_at', ir.finished_at,
    'answers', ir.answers,
    'extra_questions', ir.extra_questions
  ) INTO v_interview_rh
  FROM interview_rh ir
  WHERE ir.application_id = p_application_id;
  
  -- Get manager interview data
  SELECT json_build_object(
    'score', im.score,
    'notes', im.notes,
    'created_at', im.created_at,
    'exists', true
  ) INTO v_interview_manager
  FROM interview_manager im
  WHERE im.application_id = p_application_id;
  
  IF v_interview_manager IS NULL THEN
    v_interview_manager := json_build_object('exists', false);
  END IF;
  
  -- Get evaluation criteria
  SELECT json_agg(
    json_build_object(
      'id', ec.id,
      'name', ec.name,
      'grp', ec.grp,
      'ord', ec.ord
    ) ORDER BY ec.grp, ec.ord
  ) INTO v_criteria
  FROM evaluation_criteria ec;
  
  -- Get current scores
  SELECT json_agg(
    json_build_object(
      'criterion_id', es.criterion_id,
      'score', es.score
    )
  ) INTO v_scores
  FROM evaluation_scores es
  WHERE es.application_id = p_application_id;
  
  -- Get evaluation summary
  SELECT json_build_object(
    'total', es.total,
    'factors_for', es.factors_for,
    'factors_against', es.factors_against,
    'conclusion', es.conclusion,
    'references_laborales', es.references_laborales,
    'created_at', es.created_at,
    'exists', true
  ) INTO v_evaluation
  FROM evaluation_summary es
  WHERE es.application_id = p_application_id;
  
  IF v_evaluation IS NULL THEN
    v_evaluation := json_build_object('exists', false);
  END IF;
  
  v_result := json_build_object(
    'application', v_application,
    'interview_rh', v_interview_rh,
    'interview_manager', v_interview_manager,
    'evaluation', v_evaluation,
    'criteria', v_criteria,
    'scores', COALESCE(v_scores, '[]'::json),
    'can_start', can_start_evaluation(p_application_id)
  );
  
  RETURN v_result;
END;
$$;

-- RLS Policies for evaluation tables

-- evaluation_scores policies
ALTER TABLE evaluation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH can manage evaluation scores during evaluation"
  ON evaluation_scores
  FOR ALL
  TO authenticated
  USING (
    is_rh_user() AND 
    EXISTS (
      SELECT 1 FROM applications 
      WHERE id = evaluation_scores.application_id 
      AND status = 'Evaluando'
    )
  )
  WITH CHECK (
    is_rh_user() AND 
    EXISTS (
      SELECT 1 FROM applications 
      WHERE id = evaluation_scores.application_id 
      AND status = 'Evaluando'
    )
  );

CREATE POLICY "RH can view evaluation scores after finalization"
  ON evaluation_scores
  FOR SELECT
  TO authenticated
  USING (
    is_rh_user() AND 
    EXISTS (
      SELECT 1 FROM applications 
      WHERE id = evaluation_scores.application_id 
      AND status IN ('Aceptado', 'Rechazado')
    )
  );

-- evaluation_summary policies
ALTER TABLE evaluation_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH can manage evaluation summary during evaluation"
  ON evaluation_summary
  FOR ALL
  TO authenticated
  USING (
    is_rh_user() AND 
    EXISTS (
      SELECT 1 FROM applications 
      WHERE id = evaluation_summary.application_id 
      AND status = 'Evaluando'
    )
  )
  WITH CHECK (
    is_rh_user() AND 
    EXISTS (
      SELECT 1 FROM applications 
      WHERE id = evaluation_summary.application_id 
      AND status = 'Evaluando'
    )
  );

CREATE POLICY "RH can view evaluation summary after finalization"
  ON evaluation_summary
  FOR SELECT
  TO authenticated
  USING (
    is_rh_user() AND 
    EXISTS (
      SELECT 1 FROM applications 
      WHERE id = evaluation_summary.application_id 
      AND status IN ('Aceptado', 'Rechazado')
    )
  );

-- evaluation_criteria policies (read-only for RH)
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH can view evaluation criteria"
  ON evaluation_criteria
  FOR SELECT
  TO authenticated
  USING (is_rh_user());