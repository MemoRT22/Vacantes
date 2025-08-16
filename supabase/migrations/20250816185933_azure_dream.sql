/*
  # RH Interview System - Fixed

  1. Question Banks and Versions
    - question_banks: Master catalog of question types
    - question_bank_versions: Versioned sets of questions
    - questions: Individual questions with order and requirements

  2. Interview Management
    - interview_rh: RH interview records with answers
    - Functions for workflow management
    - Automatic bank selection by vacancy type

  3. Security
    - RLS policies for RH-only access
    - Audit logging for all interview actions

  4. Functions
    - resolve_question_bank_kind: Auto-select bank by vacancy
    - import_question_bank_csv: Import from CSV files
    - Interview workflow functions (start, save, finalize)
*/

-- Create question banks table
CREATE TABLE IF NOT EXISTS question_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind question_bank_kind NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create question bank versions table
CREATE TABLE IF NOT EXISTS question_bank_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id uuid NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
  version integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bank_id, version)
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_version_id uuid NOT NULL REFERENCES question_bank_versions(id) ON DELETE CASCADE,
  ord integer NOT NULL,
  text text NOT NULL,
  is_required boolean DEFAULT true,
  UNIQUE(bank_version_id, ord)
);

-- Create interview_rh table
CREATE TABLE IF NOT EXISTS interview_rh (
  application_id uuid PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  bank_version_id uuid NOT NULL REFERENCES question_bank_versions(id),
  started_at timestamptz,
  finished_at timestamptz,
  answers jsonb DEFAULT '[]'::jsonb,
  extra_questions jsonb DEFAULT '[]'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interviewrh_answers_gin ON interview_rh USING gin (answers jsonb_path_ops);

-- Enable RLS
ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_rh ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question_banks (RH only)
CREATE POLICY "RH can manage question banks"
  ON question_banks FOR ALL
  TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

-- RLS Policies for question_bank_versions (RH only)
CREATE POLICY "RH can manage question bank versions"
  ON question_bank_versions FOR ALL
  TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

-- RLS Policies for questions (RH only)
CREATE POLICY "RH can manage questions"
  ON questions FOR ALL
  TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

-- RLS Policies for interview_rh (RH only)
CREATE POLICY "RH can manage RH interviews"
  ON interview_rh FOR ALL
  TO authenticated
  USING (is_rh_user())
  WITH CHECK (is_rh_user());

-- Function to resolve question bank kind by vacancy
CREATE OR REPLACE FUNCTION resolve_question_bank_kind(p_vacancy_id uuid)
RETURNS question_bank_kind
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_position text;
  v_type vacancy_type;
  result_kind question_bank_kind;
BEGIN
  -- Get vacancy details
  SELECT position, type INTO v_position, v_type
  FROM vacancies 
  WHERE id = p_vacancy_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vacancy not found';
  END IF;
  
  -- Map by specific position keywords (case insensitive)
  v_position := LOWER(v_position);
  
  IF v_position LIKE '%operador%unidad%' OR v_position LIKE '%chofer%' OR v_position LIKE '%conductor%' THEN
    result_kind := 'OPERADOR_UNIDADES';
  ELSIF v_position LIKE '%guardia%' OR v_position LIKE '%seguridad%' THEN
    result_kind := 'GUARDIA_SEGURIDAD';
  ELSIF v_position LIKE '%limpieza%' AND v_position LIKE '%unidad%' THEN
    result_kind := 'AUX_LIMPIEZA_UNIDADES';
  ELSIF v_position LIKE '%jefe%patio%' THEN
    result_kind := 'JEFE_PATIO';
  ELSIF v_position LIKE '%auxiliar%patio%' OR v_position LIKE '%aux%patio%' THEN
    result_kind := 'AUXILIAR_PATIO';
  ELSIF v_position LIKE '%mecanic%' OR v_position LIKE '%hojalat%' OR 
        v_position LIKE '%pintur%' OR v_position LIKE '%electric%' OR
        v_position LIKE '%tecnic%' THEN
    result_kind := 'TECNICOS';
  ELSE
    -- Fallback to vacancy type
    IF v_type = 'ADMINISTRATIVO' THEN
      result_kind := 'ADMINISTRATIVO';
    ELSE
      result_kind := 'OPERATIVO';
    END IF;
  END IF;
  
  RETURN result_kind;
END;
$$;

-- Function to import question bank from CSV data
CREATE OR REPLACE FUNCTION import_question_bank_csv(
  p_kind question_bank_kind,
  p_csv_data jsonb,
  p_version integer DEFAULT NULL,
  p_activate boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bank_id uuid;
  v_bank_version_id uuid;
  v_version integer;
  v_question jsonb;
  v_questions_imported integer := 0;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Only RH users can import question banks';
  END IF;
  
  -- Get or create question bank
  SELECT id INTO v_bank_id
  FROM question_banks
  WHERE kind = p_kind;
  
  IF NOT FOUND THEN
    INSERT INTO question_banks (kind, name)
    VALUES (p_kind, p_kind::text)
    RETURNING id INTO v_bank_id;
  END IF;
  
  -- Determine version number
  IF p_version IS NULL THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
    FROM question_bank_versions
    WHERE bank_id = v_bank_id;
  ELSE
    v_version := p_version;
  END IF;
  
  -- Create new version
  INSERT INTO question_bank_versions (bank_id, version, is_active)
  VALUES (v_bank_id, v_version, p_activate)
  RETURNING id INTO v_bank_version_id;
  
  -- Deactivate other versions if activating this one
  IF p_activate THEN
    UPDATE question_bank_versions 
    SET is_active = false 
    WHERE bank_id = v_bank_id AND id != v_bank_version_id;
  END IF;
  
  -- Insert questions
  FOR v_question IN SELECT * FROM jsonb_array_elements(p_csv_data)
  LOOP
    INSERT INTO questions (bank_version_id, ord, text, is_required)
    VALUES (
      v_bank_version_id,
      (v_question->>'ord')::integer,
      v_question->>'text',
      (v_question->>'is_required')::boolean
    );
    
    v_questions_imported := v_questions_imported + 1;
  END LOOP;
  
  -- Log the import
  INSERT INTO audit_log (actor_staff_id, action, note)
  VALUES (
    auth.uid(),
    'QUESTION_BANK_IMPORT',
    format('Imported %s questions for %s v%s', v_questions_imported, p_kind, v_version)
  );
  
  RETURN jsonb_build_object(
    'bank_id', v_bank_id,
    'bank_version_id', v_bank_version_id,
    'version', v_version,
    'questions_imported', v_questions_imported,
    'activated', p_activate
  );
END;
$$;

-- Function to schedule RH interview
CREATE OR REPLACE FUNCTION schedule_rh_interview(
  p_application_id uuid,
  p_at timestamptz,
  p_location text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status application_status;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Only RH users can schedule interviews';
  END IF;
  
  -- Get current status
  SELECT status INTO v_current_status
  FROM applications
  WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  -- Validate status
  IF v_current_status NOT IN ('RevisionDeDocumentos', 'EntrevistaConRH') THEN
    RAISE EXCEPTION 'Cannot schedule RH interview for status: %', v_current_status;
  END IF;
  
  -- Update application
  UPDATE applications
  SET 
    status = 'EntrevistaConRH',
    scheduled_rh_at = p_at,
    scheduled_rh_location = p_location
  WHERE id = p_application_id;
  
  -- Log the action
  INSERT INTO audit_log (actor_staff_id, application_id, action, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'INTERVIEW_RH_SCHEDULED',
    format('Scheduled for %s at %s', p_at, p_location)
  );
  
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Function to start RH interview
CREATE OR REPLACE FUNCTION start_rh_interview(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vacancy_id uuid;
  v_status application_status;
  v_bank_kind question_bank_kind;
  v_bank_version_id uuid;
  v_questions jsonb;
  v_existing_interview record;
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Only RH users can start interviews';
  END IF;
  
  -- Get application details
  SELECT vacancy_id, status INTO v_vacancy_id, v_status
  FROM applications
  WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  -- Validate status
  IF v_status != 'EntrevistaConRH' THEN
    RAISE EXCEPTION 'Application must be in EntrevistaConRH status to start interview';
  END IF;
  
  -- Check if interview already exists
  SELECT * INTO v_existing_interview
  FROM interview_rh
  WHERE application_id = p_application_id;
  
  IF FOUND THEN
    -- Return existing interview data
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'ord', q.ord,
        'text', q.text,
        'is_required', q.is_required
      ) ORDER BY q.ord
    ) INTO v_questions
    FROM questions q
    WHERE q.bank_version_id = v_existing_interview.bank_version_id;
    
    RETURN jsonb_build_object(
      'bank_version_id', v_existing_interview.bank_version_id,
      'questions', v_questions,
      'started_at', v_existing_interview.started_at,
      'existing', true
    );
  END IF;
  
  -- Resolve question bank kind
  v_bank_kind := resolve_question_bank_kind(v_vacancy_id);
  
  -- Get active bank version
  SELECT qbv.id INTO v_bank_version_id
  FROM question_bank_versions qbv
  JOIN question_banks qb ON qb.id = qbv.bank_id
  WHERE qb.kind = v_bank_kind AND qbv.is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active question bank found for kind: %', v_bank_kind;
  END IF;
  
  -- Create interview record
  INSERT INTO interview_rh (application_id, bank_version_id, started_at)
  VALUES (p_application_id, v_bank_version_id, now());
  
  -- Get questions
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'ord', q.ord,
      'text', q.text,
      'is_required', q.is_required
    ) ORDER BY q.ord
  ) INTO v_questions
  FROM questions q
  WHERE q.bank_version_id = v_bank_version_id;
  
  -- Log the action
  INSERT INTO audit_log (actor_staff_id, application_id, action, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'INTERVIEW_RH_START',
    format('Started with bank kind: %s', v_bank_kind)
  );
  
  RETURN jsonb_build_object(
    'bank_version_id', v_bank_version_id,
    'questions', v_questions,
    'started_at', now(),
    'existing', false
  );
END;
$$;

-- Function to save RH interview draft
CREATE OR REPLACE FUNCTION save_rh_interview_draft(
  p_application_id uuid,
  p_answers jsonb,
  p_extra_questions jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Only RH users can save interview drafts';
  END IF;
  
  -- Update interview
  UPDATE interview_rh
  SET 
    answers = p_answers,
    extra_questions = p_extra_questions
  WHERE application_id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Interview not found or not started';
  END IF;
  
  -- Log the action
  INSERT INTO audit_log (actor_staff_id, application_id, action, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'INTERVIEW_RH_SAVE_DRAFT',
    'Draft saved'
  );
  
  RETURN jsonb_build_object('ok', true, 'saved_at', now());
END;
$$;

-- Function to finalize RH interview
CREATE OR REPLACE FUNCTION finalize_rh_interview(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_interview record;
  v_required_questions uuid[];
  v_answered_questions uuid[];
  v_missing_questions uuid[];
BEGIN
  -- Check if user is RH
  IF NOT is_rh_user() THEN
    RAISE EXCEPTION 'Only RH users can finalize interviews';
  END IF;
  
  -- Get interview
  SELECT * INTO v_interview
  FROM interview_rh
  WHERE application_id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Interview not found';
  END IF;
  
  -- Check if already finalized
  IF v_interview.finished_at IS NOT NULL THEN
    RAISE EXCEPTION 'Interview already finalized';
  END IF;
  
  -- Get required questions
  SELECT array_agg(id) INTO v_required_questions
  FROM questions
  WHERE bank_version_id = v_interview.bank_version_id
    AND is_required = true;
  
  -- Get answered questions
  SELECT array_agg((answer->>'question_id')::uuid) INTO v_answered_questions
  FROM jsonb_array_elements(v_interview.answers) AS answer
  WHERE answer->>'answer_text' IS NOT NULL 
    AND trim(answer->>'answer_text') != '';
  
  -- Find missing required answers
  SELECT array_agg(q) INTO v_missing_questions
  FROM unnest(v_required_questions) AS q
  WHERE q != ALL(COALESCE(v_answered_questions, ARRAY[]::uuid[]));
  
  -- Validate all required questions are answered
  IF array_length(v_missing_questions, 1) > 0 THEN
    RAISE EXCEPTION 'Missing answers for required questions: %', v_missing_questions;
  END IF;
  
  -- Finalize interview
  UPDATE interview_rh
  SET finished_at = now()
  WHERE application_id = p_application_id;
  
  -- Log the action
  INSERT INTO audit_log (actor_staff_id, application_id, action, note)
  VALUES (
    auth.uid(),
    p_application_id,
    'INTERVIEW_RH_FINALIZE',
    'Interview finalized'
  );
  
  RETURN jsonb_build_object('ok', true, 'finished_at', now());
END;
$$;

-- Insert default question banks
INSERT INTO question_banks (kind, name) VALUES
  ('ADMINISTRATIVO', 'Preguntas Administrativas'),
  ('OPERATIVO', 'Preguntas Operativas'),
  ('OPERADOR_UNIDADES', 'Preguntas para Operador de Unidades'),
  ('GUARDIA_SEGURIDAD', 'Preguntas para Guardia de Seguridad'),
  ('AUX_LIMPIEZA_UNIDADES', 'Preguntas para Auxiliar de Limpieza'),
  ('JEFE_PATIO', 'Preguntas para Jefe de Patio'),
  ('AUXILIAR_PATIO', 'Preguntas para Auxiliar de Patio'),
  ('TECNICOS', 'Preguntas para Técnicos')
ON CONFLICT (kind) DO NOTHING;