CREATE TYPE "public"."generation_request_kind" AS ENUM('NEW_QUESTION', 'FULL_REVISION', 'EXPLANATION_ONLY', 'DISTRACTORS_ONLY');--> statement-breakpoint
ALTER TABLE "generation_runs" ADD COLUMN "idempotency_key" varchar(128);--> statement-breakpoint
ALTER TABLE "generation_runs" ADD COLUMN "source_question_version_id" uuid;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD COLUMN "request_kind" "generation_request_kind" DEFAULT 'NEW_QUESTION' NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD COLUMN "requested_by" varchar(160);--> statement-breakpoint
ALTER TABLE "generation_runs" ADD COLUMN "request_payload" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD COLUMN "max_cost_micros" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_templates" ADD COLUMN "approval_notes" text;--> statement-breakpoint
UPDATE "generation_runs"
SET "idempotency_key" = 'legacy:' || "id"::text,
    "requested_by" = 'legacy-import'
WHERE "idempotency_key" IS NULL OR "requested_by" IS NULL;--> statement-breakpoint
ALTER TABLE "generation_runs" ALTER COLUMN "idempotency_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_runs" ALTER COLUMN "requested_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_source_question_version_id_question_versions_id_fk" FOREIGN KEY ("source_question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "generation_run_idempotency_idx" ON "generation_runs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "generation_run_source_version_idx" ON "generation_runs" USING btree ("source_question_version_id","started_at");--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_run_cost_limit_check" CHECK ("generation_runs"."max_cost_micros" >= 0 AND ("generation_runs"."estimated_cost_micros" IS NULL OR ("generation_runs"."estimated_cost_micros" >= 0 AND "generation_runs"."estimated_cost_micros" <= "generation_runs"."max_cost_micros")));--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_run_completion_check" CHECK (("generation_runs"."status" = 'PENDING' AND "generation_runs"."completed_at" IS NULL) OR ("generation_runs"."status" <> 'PENDING' AND "generation_runs"."completed_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "source_artifacts" ADD CONSTRAINT "source_coverage_permission_check" CHECK (NOT "source_artifacts"."allow_coverage_analysis" OR "source_artifacts"."decision" IN ('COVERAGE_ANALYSIS', 'LICENSED_STORAGE'));--> statement-breakpoint
ALTER TABLE "source_artifacts" ADD CONSTRAINT "source_quotation_permission_check" CHECK (NOT "source_artifacts"."allow_quotation" OR "source_artifacts"."decision" = 'LICENSED_STORAGE');--> statement-breakpoint
ALTER TABLE "source_artifacts" ADD CONSTRAINT "source_licensed_evidence_check" CHECK ("source_artifacts"."decision" <> 'LICENSED_STORAGE' OR ("source_artifacts"."allow_storage" AND "source_artifacts"."stated_license" IS NOT NULL AND "source_artifacts"."terms_url" IS NOT NULL));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_generation_run_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'generation run history is append-only'
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status <> 'PENDING' THEN
    RAISE EXCEPTION 'completed generation runs are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.template_id IS DISTINCT FROM OLD.template_id
    OR NEW.parent_run_id IS DISTINCT FROM OLD.parent_run_id
    OR NEW.source_question_version_id IS DISTINCT FROM OLD.source_question_version_id
    OR NEW.request_kind IS DISTINCT FROM OLD.request_kind
    OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
    OR NEW.prompt_hash IS DISTINCT FROM OLD.prompt_hash
    OR NEW.parameters IS DISTINCT FROM OLD.parameters
    OR NEW.request_payload IS DISTINCT FROM OLD.request_payload
    OR NEW.random_seed IS DISTINCT FROM OLD.random_seed
    OR NEW.max_cost_micros IS DISTINCT FROM OLD.max_cost_micros
    OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'generation request identity is immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status NOT IN ('SUCCEEDED', 'FAILED', 'CANCELLED')
    OR NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'generation runs require one terminal transition'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status = 'SUCCEEDED' AND NOT EXISTS (
    SELECT 1 FROM question_versions WHERE generation_run_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'a successful generation run requires a linked candidate version'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER generation_runs_history_guard
BEFORE UPDATE OR DELETE ON generation_runs
FOR EACH ROW EXECUTE FUNCTION guard_generation_run_history();
