CREATE OR REPLACE FUNCTION reject_audit_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% records are immutable; create a new record instead', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER question_versions_are_append_only
BEFORE UPDATE OR DELETE ON question_versions
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
--> statement-breakpoint
CREATE TRIGGER validation_runs_are_append_only
BEFORE UPDATE OR DELETE ON validation_runs
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
--> statement-breakpoint
CREATE TRIGGER review_decisions_are_append_only
BEFORE UPDATE OR DELETE ON review_decisions
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
