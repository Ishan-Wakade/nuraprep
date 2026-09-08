DROP FUNCTION erase_nuraprep_account(text);
--> statement-breakpoint
CREATE FUNCTION erase_nuraprep_account(
  p_user_id text,
  p_admin_actor_id text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id uuid;
  v_email text;
  v_receipt_id uuid;
  v_is_privileged boolean := false;
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
  v_billing_customers integer := 0;
  v_user integer := 0;
BEGIN
  SELECT email INTO v_email
  FROM auth_users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACCOUNT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM auth_role_grants
    WHERE user_id = p_user_id
      AND role IN ('REVIEWER', 'ADMIN')
  ) INTO v_is_privileged;

  IF v_is_privileged THEN
    IF v_email LIKE 'erased-%@users.invalid' THEN
      RAISE EXCEPTION 'ACCOUNT_ALREADY_PSEUDONYMIZED'
        USING ERRCODE = 'P0001';
    END IF;

    IF p_admin_actor_id IS NULL
       OR p_admin_actor_id = p_user_id
       OR p_reason IS NULL
       OR length(trim(p_reason)) NOT BETWEEN 20 AND 500
       OR NOT EXISTS (
         SELECT 1
         FROM auth_role_grants
         WHERE user_id = p_admin_actor_id
           AND role = 'ADMIN'
           AND revoked_at IS NULL
       ) THEN
      RAISE EXCEPTION 'ACTIVE_ADMIN_REQUIRED_FOR_PRIVILEGED_ERASURE'
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF p_admin_actor_id IS NOT NULL THEN
    RAISE EXCEPTION 'NON_PRIVILEGED_ACCOUNT_USE_SELF_SERVICE_ERASURE'
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

  DELETE FROM auth_accounts WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_accounts = ROW_COUNT;

  DELETE FROM auth_sessions WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_sessions = ROW_COUNT;

  DELETE FROM auth_verifications WHERE identifier = v_email;
  GET DIAGNOSTICS v_verifications = ROW_COUNT;

  DELETE FROM billing_customers WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_billing_customers = ROW_COUNT;

  IF v_is_privileged THEN
    UPDATE auth_role_grants
    SET revoked_at = statement_timestamp(),
        revoked_by = p_admin_actor_id,
        revocation_reason = 'Administrator-assisted account pseudonymization: '
          || trim(p_reason)
    WHERE user_id = p_user_id
      AND revoked_at IS NULL;
    GET DIAGNOSTICS v_role_grants = ROW_COUNT;

    UPDATE auth_users
    SET name = 'Former reviewer',
        email = 'erased-' || gen_random_uuid()::text || '@users.invalid',
        email_verified = false,
        image = NULL,
        updated_at = statement_timestamp()
    WHERE id = p_user_id;
    GET DIAGNOSTICS v_user = ROW_COUNT;

    INSERT INTO account_audit_events (user_id, event_type, actor_id, metadata)
    VALUES (
      p_user_id,
      'PRIVILEGED_ACCOUNT_PSEUDONYMIZED',
      p_admin_actor_id,
      jsonb_build_object(
        'reason', trim(p_reason),
        'retainedAttribution', true,
        'tombstoneVersion', 'privileged-pseudonymization-v1'
      )
    );

    INSERT INTO account_deletion_receipts (receipt_version, deleted_record_counts)
    VALUES (
      'privileged-pseudonymization-v1',
      jsonb_build_object(
        'attempts', v_attempts,
        'authAccounts', v_accounts,
        'authRoleGrantsRevoked', v_role_grants,
        'authSessions', v_sessions,
        'authUsersPseudonymized', v_user,
        'authVerifications', v_verifications,
        'billingCustomers', v_billing_customers,
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
  END IF;

  DELETE FROM account_audit_events WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_audit_events = ROW_COUNT;

  DELETE FROM auth_role_grants WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_role_grants = ROW_COUNT;

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
      'billingCustomers', v_billing_customers,
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
