CREATE TABLE "improvement_template_implementations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"base_template_id" uuid NOT NULL,
	"result_template_id" uuid NOT NULL,
	"implementation_summary" text NOT NULL,
	"regression_evidence" text NOT NULL,
	"implemented_by" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "improvement_template_implementation_content_check" CHECK (length("improvement_template_implementations"."implementation_summary") >= 20 AND length("improvement_template_implementations"."regression_evidence") >= 20),
	CONSTRAINT "improvement_template_implementation_distinct_check" CHECK ("improvement_template_implementations"."base_template_id" <> "improvement_template_implementations"."result_template_id")
);
--> statement-breakpoint
ALTER TABLE "improvement_template_implementations" ADD CONSTRAINT "improvement_template_implementations_proposal_id_improvement_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."improvement_proposals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "improvement_template_implementations" ADD CONSTRAINT "improvement_template_implementations_base_template_id_generation_templates_id_fk" FOREIGN KEY ("base_template_id") REFERENCES "public"."generation_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "improvement_template_implementations" ADD CONSTRAINT "improvement_template_implementations_result_template_id_generation_templates_id_fk" FOREIGN KEY ("result_template_id") REFERENCES "public"."generation_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "improvement_template_implementation_proposal_idx" ON "improvement_template_implementations" USING btree ("proposal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "improvement_template_implementation_result_idx" ON "improvement_template_implementations" USING btree ("result_template_id");--> statement-breakpoint
CREATE INDEX "improvement_template_implementation_base_idx" ON "improvement_template_implementations" USING btree ("base_template_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_improvement_template_implementation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  proposal_target improvement_target;
  proposal_decision improvement_decision;
  base_template generation_templates%ROWTYPE;
  result_template generation_templates%ROWTYPE;
BEGIN
  SELECT proposal.target, decision.decision
    INTO proposal_target, proposal_decision
    FROM improvement_proposals proposal
    LEFT JOIN improvement_proposal_decisions decision
      ON decision.proposal_id = proposal.id
   WHERE proposal.id = NEW.proposal_id;

  IF proposal_target IS NULL
     OR proposal_target <> 'GENERATION_TEMPLATE'
     OR proposal_decision IS DISTINCT FROM 'APPROVED' THEN
    RAISE EXCEPTION 'only approved generation-template proposals may be implemented'
      USING ERRCODE = '23514';
  END IF;

  SELECT * INTO STRICT base_template
    FROM generation_templates
   WHERE id = NEW.base_template_id;
  SELECT * INTO STRICT result_template
    FROM generation_templates
   WHERE id = NEW.result_template_id;

  IF base_template.status = 'RETIRED'
     OR result_template.status <> 'DRAFT'
     OR result_template.template_key <> base_template.template_key
     OR result_template.version <> base_template.version + 1
     OR result_template.target_skill_id <> base_template.target_skill_id
     OR result_template.question_type <> base_template.question_type
     OR result_template.difficulty <> base_template.difficulty
     OR result_template.authored_by <> NEW.implemented_by THEN
    RAISE EXCEPTION 'implemented template must be an attributed, scope-preserving next draft version'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM generation_templates candidate
     WHERE candidate.template_key = result_template.template_key
       AND candidate.version > result_template.version
  ) THEN
    RAISE EXCEPTION 'implemented template must be the latest template version'
      USING ERRCODE = '23514';
  END IF;

  IF result_template.instructions = base_template.instructions
     AND result_template.parameter_constraints = base_template.parameter_constraints
     AND result_template.prohibited_patterns = base_template.prohibited_patterns
     AND result_template.validator_contract = base_template.validator_contract THEN
    RAISE EXCEPTION 'implemented template must contain a reviewed content change'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER improvement_template_implementation_contract
BEFORE INSERT ON improvement_template_implementations
FOR EACH ROW EXECUTE FUNCTION validate_improvement_template_implementation();
--> statement-breakpoint
CREATE TRIGGER improvement_template_implementations_are_append_only
BEFORE UPDATE OR DELETE ON improvement_template_implementations
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
