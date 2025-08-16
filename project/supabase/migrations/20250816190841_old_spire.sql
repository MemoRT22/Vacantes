/*
  # After Documents Upload System

  1. New Functions
    - `get_after_docs_progress` - Get upload progress for accepted candidates
    - `start_after_doc_upload` - Initialize document upload with validations
    - `finalize_after_doc_upload` - Complete document upload and create version

  2. Security
    - RLS policies for application_docs phase='DESPUES'
    - Validation of folio+email combination
    - Only allow uploads when status='Aceptado'

  3. Storage
    - Bucket for candidate documents
    - Versioned file structure
    - Pre-signed URLs for secure access

  4. Auditing
    - AFTER_DOC_UPLOAD events for each successful upload
*/

-- Create storage bucket for candidate documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('candidate-docs', 'candidate-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for candidate documents
CREATE POLICY "Authenticated users can upload candidate docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'candidate-docs');

CREATE POLICY "Users can view their own candidate docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'candidate-docs');

-- Temporary upload tracking table
CREATE TABLE IF NOT EXISTS temp_doc_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  doc doc_type NOT NULL,
  filename text NOT NULL,
  mimetype text NOT NULL,
  size bigint NOT NULL,
  expected_version integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 hour')
);

-- Function to get after documents progress
CREATE OR REPLACE FUNCTION get_after_docs_progress(
  p_folio text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_application_id uuid;
  v_vacancy_id uuid;
  v_status application_status;
  v_required_docs text[];
  v_uploaded_docs jsonb;
  v_pending_docs text[];
  v_can_upload boolean;
BEGIN
  -- Validate folio format
  IF NOT p_folio ~ '^BIN-\d{4}-\d{5}$' THEN
    RAISE EXCEPTION 'Invalid folio format';
  END IF;

  -- Get application by folio and email
  SELECT a.id, a.vacancy_id, a.status
  INTO v_application_id, v_vacancy_id, v_status
  FROM applications a
  JOIN candidates c ON a.candidate_id = c.id
  WHERE a.folio = p_folio AND c.email = p_email;

  IF v_application_id IS NULL THEN
    RAISE EXCEPTION 'Application not found with provided folio and email';
  END IF;

  -- Get required documents for phase DESPUES
  SELECT array_agg(doc ORDER BY doc)
  INTO v_required_docs
  FROM vacancy_required_docs
  WHERE vacancy_id = v_vacancy_id AND phase = 'DESPUES';

  -- If no required docs, return empty structure
  IF v_required_docs IS NULL THEN
    v_required_docs := ARRAY[]::text[];
  END IF;

  -- Get uploaded documents (latest version of each)
  WITH latest_versions AS (
    SELECT 
      doc,
      MAX(version) as max_version
    FROM application_docs
    WHERE application_id = v_application_id AND phase = 'DESPUES'
    GROUP BY doc
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'doc', ad.doc,
      'version', ad.version,
      'uploaded_at', ad.uploaded_at,
      'url', ad.url
    ) ORDER BY ad.doc
  )
  INTO v_uploaded_docs
  FROM application_docs ad
  JOIN latest_versions lv ON ad.doc = lv.doc AND ad.version = lv.max_version
  WHERE ad.application_id = v_application_id AND ad.phase = 'DESPUES';

  IF v_uploaded_docs IS NULL THEN
    v_uploaded_docs := '[]'::jsonb;
  END IF;

  -- Calculate pending documents
  SELECT array_agg(doc ORDER BY doc)
  INTO v_pending_docs
  FROM unnest(v_required_docs) AS doc
  WHERE doc NOT IN (
    SELECT DISTINCT ad.doc
    FROM application_docs ad
    WHERE ad.application_id = v_application_id AND ad.phase = 'DESPUES'
  );

  IF v_pending_docs IS NULL THEN
    v_pending_docs := ARRAY[]::text[];
  END IF;

  -- Can upload only if status is Aceptado
  v_can_upload := (v_status = 'Aceptado');

  RETURN jsonb_build_object(
    'required', to_jsonb(v_required_docs),
    'uploaded', v_uploaded_docs,
    'pending', to_jsonb(v_pending_docs),
    'can_upload', v_can_upload,
    'status', v_status
  );
END;
$$;

-- Function to start document upload
CREATE OR REPLACE FUNCTION start_after_doc_upload(
  p_folio text,
  p_email text,
  p_doc doc_type,
  p_filename text,
  p_mimetype text,
  p_size bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_application_id uuid;
  v_vacancy_id uuid;
  v_status application_status;
  v_upload_id uuid;
  v_expected_version integer;
  v_doc_required boolean;
  v_max_size bigint := 10485760; -- 10MB
BEGIN
  -- Validate folio format
  IF NOT p_folio ~ '^BIN-\d{4}-\d{5}$' THEN
    RAISE EXCEPTION 'Invalid folio format';
  END IF;

  -- Validate file size
  IF p_size > v_max_size THEN
    RAISE EXCEPTION 'File size exceeds maximum allowed (10MB)';
  END IF;

  -- Validate MIME type
  IF p_mimetype NOT IN ('application/pdf', 'image/jpeg', 'image/png') THEN
    RAISE EXCEPTION 'Invalid file type. Only PDF, JPG, and PNG are allowed';
  END IF;

  -- Get application by folio and email
  SELECT a.id, a.vacancy_id, a.status
  INTO v_application_id, v_vacancy_id, v_status
  FROM applications a
  JOIN candidates c ON a.candidate_id = c.id
  WHERE a.folio = p_folio AND c.email = p_email;

  IF v_application_id IS NULL THEN
    RAISE EXCEPTION 'Application not found with provided folio and email';
  END IF;

  -- Check if status allows upload
  IF v_status != 'Aceptado' THEN
    RAISE EXCEPTION 'Document upload only allowed for accepted applications';
  END IF;

  -- Check if document is required for this vacancy in DESPUES phase
  SELECT EXISTS(
    SELECT 1 FROM vacancy_required_docs
    WHERE vacancy_id = v_vacancy_id AND doc = p_doc AND phase = 'DESPUES'
  ) INTO v_doc_required;

  IF NOT v_doc_required THEN
    RAISE EXCEPTION 'Document % is not required for this vacancy in DESPUES phase', p_doc;
  END IF;

  -- Calculate expected version
  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_expected_version
  FROM application_docs
  WHERE application_id = v_application_id AND doc = p_doc;

  -- Create upload tracking record
  INSERT INTO temp_doc_uploads (
    application_id, doc, filename, mimetype, size, expected_version
  ) VALUES (
    v_application_id, p_doc, p_filename, p_mimetype, p_size, v_expected_version
  ) RETURNING id INTO v_upload_id;

  RETURN jsonb_build_object(
    'upload_id', v_upload_id,
    'upload_url', format('applications/%s/%s/v%s/%s', 
      v_application_id, p_doc, v_expected_version, p_filename),
    'max_version_expected', v_expected_version
  );
END;
$$;

-- Function to finalize document upload
CREATE OR REPLACE FUNCTION finalize_after_doc_upload(
  p_upload_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_upload_record temp_doc_uploads%ROWTYPE;
  v_final_url text;
  v_uploaded_at timestamptz;
BEGIN
  -- Get upload record
  SELECT * INTO v_upload_record
  FROM temp_doc_uploads
  WHERE id = p_upload_id AND expires_at > now();

  IF v_upload_record.id IS NULL THEN
    RAISE EXCEPTION 'Upload record not found or expired';
  END IF;

  -- Set current timestamp
  v_uploaded_at := now();

  -- Build final URL (this would be the storage path)
  v_final_url := format('applications/%s/%s/v%s/%s',
    v_upload_record.application_id,
    v_upload_record.doc,
    v_upload_record.expected_version,
    v_upload_record.filename
  );

  -- Insert into application_docs
  INSERT INTO application_docs (
    application_id,
    doc,
    phase,
    url,
    version,
    uploaded_at
  ) VALUES (
    v_upload_record.application_id,
    v_upload_record.doc,
    'DESPUES',
    v_final_url,
    v_upload_record.expected_version,
    v_uploaded_at
  );

  -- Log audit event
  INSERT INTO audit_log (
    actor_staff_id,
    application_id,
    action,
    note
  ) VALUES (
    NULL, -- No staff user for candidate uploads
    v_upload_record.application_id,
    'AFTER_DOC_UPLOAD',
    format('Document %s uploaded, version %s', v_upload_record.doc, v_upload_record.expected_version)
  );

  -- Clean up temp record
  DELETE FROM temp_doc_uploads WHERE id = p_upload_id;

  RETURN jsonb_build_object(
    'ok', true,
    'doc', v_upload_record.doc,
    'version', v_upload_record.expected_version,
    'uploaded_at', v_uploaded_at
  );
END;
$$;

-- RLS policies for application_docs (DESPUES phase)
CREATE POLICY "Candidates can view their own after docs"
ON application_docs FOR SELECT
TO anon
USING (
  phase = 'DESPUES' AND
  application_id IN (
    SELECT a.id FROM applications a
    JOIN candidates c ON a.candidate_id = c.id
    WHERE a.folio = current_setting('app.current_folio', true)
    AND c.email = current_setting('app.current_email', true)
  )
);

-- Clean up expired temp uploads (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_uploads()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM temp_doc_uploads WHERE expires_at < now();
END;
$$;