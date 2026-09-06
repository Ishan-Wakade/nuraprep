CREATE TABLE "account_deletion_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_version" varchar(80) DEFAULT 'account-erasure-v1' NOT NULL,
	"deleted_record_counts" jsonb NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION reject_audit_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('nuraprep.account_erasure', true) = 'on'
     AND TG_TABLE_NAME IN (
       'account_audit_events',
       'attempts',
       'improvement_proposal_evidence',
       'learner_question_report_events',
       'learner_question_reports',
       'practice_item_review_events',
       'practice_session_items',
       'score_estimates',
       'tutor_interactions'
     ) THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION '% records are immutable; create a new record instead', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_auth_role_grant_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('nuraprep.account_erasure', true) = 'on' THEN
    RETURN OLD;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'auth role grant history is append-only'
      USING ERRCODE = '55000';
  END IF;

  IF OLD.user_id IS DISTINCT FROM NEW.user_id
     OR OLD.role IS DISTINCT FROM NEW.role
     OR OLD.granted_by IS DISTINCT FROM NEW.granted_by
     OR OLD.reason IS DISTINCT FROM NEW.reason
     OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'auth role grant identity and evidence are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF OLD.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'revoked auth role grants are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.revoked_at IS NULL
     OR NEW.revoked_by IS NULL
     OR NEW.revocation_reason IS NULL THEN
    RAISE EXCEPTION 'auth role grants may only transition once to revoked'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION erase_nuraprep_account(p_user_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id uuid;
  v_email text;
  v_receipt_id uuid;
  v_improvement_evidence integer := 0;
  v_report_events integer := 0;
  v_reports integer := 0;
  v_review_events integer := 0;
  v_tutor_interactions integer := 0;
  v_attempts integer := 0;
  v_session_items integer := 0;
  v_practice_sessions integer := 0;
  v_study_plan_items integer := 0;
  v_study_plans integer := 0;
  v_score_estimates integer := 0;
  v_profile integer := 0;
  v_role_grants integer := 0;
  v_audit_events integer := 0;
  v_accounts integer := 0;
  v_sessions integer := 0;
  v_verifications integer := 0;
  v_user integer := 0;
BEGIN
  SELECT email INTO v_email
  FROM auth_users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACCOUNT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM auth_role_grants
    WHERE user_id = p_user_id
      AND role IN ('REVIEWER', 'ADMIN')
  ) THEN
    RAISE EXCEPTION 'PRIVILEGED_ACCOUNT_REQUIRES_ADMIN_ERASURE'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_profile_id
  FROM learner_profiles
  WHERE auth_user_id = p_user_id
  FOR UPDATE;

  PERFORM set_config('nuraprep.account_erasure', 'on', true);

  IF v_profile_id IS NOT NULL THEN
    DELETE FROM improvement_proposal_evidence
    WHERE learner_report_id IN (
      SELECT id FROM learner_question_reports WHERE learner_id = v_profile_id
    );
    GET DIAGNOSTICS v_improvement_evidence = ROW_COUNT;

    DELETE FROM learner_question_report_events
    WHERE report_id IN (
      SELECT id FROM learner_question_reports WHERE learner_id = v_profile_id
    );
    GET DIAGNOSTICS v_report_events = ROW_COUNT;

    DELETE FROM learner_question_reports WHERE learner_id = v_profile_id;
    GET DIAGNOSTICS v_reports = ROW_COUNT;

    DELETE FROM practice_item_review_events
    WHERE session_item_id IN (
      SELECT psi.id
      FROM practice_session_items psi
      JOIN practice_sessions ps ON ps.id = psi.session_id
      WHERE ps.learner_id = v_profile_id
    );
    GET DIAGNOSTICS v_review_events = ROW_COUNT;

    DELETE FROM tutor_interactions
    WHERE session_item_id IN (
      SELECT psi.id
      FROM practice_session_items psi
      JOIN practice_sessions ps ON ps.id = psi.session_id
      WHERE ps.learner_id = v_profile_id
    );
    GET DIAGNOSTICS v_tutor_interactions = ROW_COUNT;

    DELETE FROM attempts
    WHERE session_item_id IN (
      SELECT psi.id
      FROM practice_session_items psi
      JOIN practice_sessions ps ON ps.id = psi.session_id
      WHERE ps.learner_id = v_profile_id
    );
    GET DIAGNOSTICS v_attempts = ROW_COUNT;

    DELETE FROM practice_session_items
    WHERE session_id IN (
      SELECT id FROM practice_sessions WHERE learner_id = v_profile_id
    );
    GET DIAGNOSTICS v_session_items = ROW_COUNT;

    DELETE FROM practice_sessions WHERE learner_id = v_profile_id;
    GET DIAGNOSTICS v_practice_sessions = ROW_COUNT;

    DELETE FROM study_plan_items
    WHERE study_plan_id IN (
      SELECT id FROM study_plans WHERE learner_id = v_profile_id
    );
    GET DIAGNOSTICS v_study_plan_items = ROW_COUNT;

    DELETE FROM study_plans WHERE learner_id = v_profile_id;
    GET DIAGNOSTICS v_study_plans = ROW_COUNT;

    DELETE FROM score_estimates WHERE learner_id = v_profile_id;
    GET DIAGNOSTICS v_score_estimates = ROW_COUNT;

    DELETE FROM learner_profiles WHERE id = v_profile_id;
    GET DIAGNOSTICS v_profile = ROW_COUNT;
  END IF;

  DELETE FROM account_audit_events WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_audit_events = ROW_COUNT;

  DELETE FROM auth_role_grants WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_role_grants = ROW_COUNT;

  DELETE FROM auth_accounts WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_accounts = ROW_COUNT;

  DELETE FROM auth_sessions WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_sessions = ROW_COUNT;

  DELETE FROM auth_verifications WHERE identifier = v_email;
  GET DIAGNOSTICS v_verifications = ROW_COUNT;

  DELETE FROM auth_users WHERE id = p_user_id;
  GET DIAGNOSTICS v_user = ROW_COUNT;

  INSERT INTO account_deletion_receipts (deleted_record_counts)
  VALUES (
    jsonb_build_object(
      'accountAuditEvents', v_audit_events,
      'attempts', v_attempts,
      'authAccounts', v_accounts,
      'authRoleGrants', v_role_grants,
      'authSessions', v_sessions,
      'authUsers', v_user,
      'authVerifications', v_verifications,
      'improvementProposalEvidence', v_improvement_evidence,
      'learnerProfiles', v_profile,
      'learnerQuestionReportEvents', v_report_events,
      'learnerQuestionReports', v_reports,
      'practiceItemReviewEvents', v_review_events,
      'practiceSessionItems', v_session_items,
      'practiceSessions', v_practice_sessions,
      'scoreEstimates', v_score_estimates,
      'studyPlanItems', v_study_plan_items,
      'studyPlans', v_study_plans,
      'tutorInteractions', v_tutor_interactions
    )
  )
  RETURNING id INTO v_receipt_id;

  RETURN v_receipt_id;
END;
$$;
