CREATE OR REPLACE FUNCTION guard_generation_template_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'generation template history is append-only'
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'approved or retired generation templates are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.template_key IS DISTINCT FROM OLD.template_key
    OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.target_skill_id IS DISTINCT FROM OLD.target_skill_id
    OR NEW.question_type IS DISTINCT FROM OLD.question_type
    OR NEW.difficulty IS DISTINCT FROM OLD.difficulty
    OR NEW.instructions IS DISTINCT FROM OLD.instructions
    OR NEW.parameter_constraints IS DISTINCT FROM OLD.parameter_constraints
    OR NEW.prohibited_patterns IS DISTINCT FROM OLD.prohibited_patterns
    OR NEW.validator_contract IS DISTINCT FROM OLD.validator_contract
    OR NEW.authored_by IS DISTINCT FROM OLD.authored_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'template content is immutable; create a new version'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status NOT IN ('APPROVED', 'RETIRED') THEN
    RAISE EXCEPTION 'draft templates may only be approved or retired'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER generation_templates_history_guard
BEFORE UPDATE OR DELETE ON generation_templates
FOR EACH ROW EXECUTE FUNCTION guard_generation_template_history();
