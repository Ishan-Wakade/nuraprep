ALTER TABLE "generation_runs" ADD COLUMN "cancelled_by" varchar(160);--> statement-breakpoint
ALTER TABLE "generation_runs" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_run_cancellation_check" CHECK (("generation_runs"."status" = 'CANCELLED' AND "generation_runs"."cancelled_by" IS NOT NULL AND length(trim("generation_runs"."cancellation_reason")) >= 20 AND "generation_runs"."failure_code" IS NULL) OR ("generation_runs"."status" <> 'CANCELLED' AND "generation_runs"."cancelled_by" IS NULL AND "generation_runs"."cancellation_reason" IS NULL));--> statement-breakpoint

CREATE OR REPLACE FUNCTION guard_generation_run_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'generation run history is append-only'
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status NOT IN ('PENDING', 'RUNNING') THEN
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

  IF OLD.status = 'PENDING' THEN
    IF NEW.status = 'RUNNING' THEN
      IF NEW.attempt_count <> 1
        OR NEW.provider IS DISTINCT FROM OLD.provider
        OR NEW.model IS DISTINCT FROM OLD.model
        OR NEW.input_tokens IS DISTINCT FROM OLD.input_tokens
        OR NEW.output_tokens IS DISTINCT FROM OLD.output_tokens
        OR NEW.estimated_cost_micros IS DISTINCT FROM OLD.estimated_cost_micros
        OR NEW.provider_request_id IS DISTINCT FROM OLD.provider_request_id
        OR NEW.failure_code IS DISTINCT FROM OLD.failure_code THEN
        RAISE EXCEPTION 'initial claims may change only lease state'
          USING ERRCODE = '55000';
      END IF;
      RETURN NEW;
    END IF;
    IF NEW.status = 'CANCELLED' THEN
      IF NEW.provider IS DISTINCT FROM OLD.provider
        OR NEW.model IS DISTINCT FROM OLD.model
        OR NEW.input_tokens IS DISTINCT FROM OLD.input_tokens
        OR NEW.output_tokens IS DISTINCT FROM OLD.output_tokens
        OR NEW.estimated_cost_micros IS DISTINCT FROM OLD.estimated_cost_micros
        OR NEW.provider_request_id IS DISTINCT FROM OLD.provider_request_id
        OR NEW.failure_code IS DISTINCT FROM OLD.failure_code
        OR NEW.claim_token IS DISTINCT FROM OLD.claim_token
        OR NEW.claimed_by IS DISTINCT FROM OLD.claimed_by
        OR NEW.lease_expires_at IS DISTINCT FROM OLD.lease_expires_at
        OR NEW.last_heartbeat_at IS DISTINCT FROM OLD.last_heartbeat_at
        OR NEW.attempt_count <> 0 THEN
        RAISE EXCEPTION 'pending cancellation may add only cancellation evidence'
          USING ERRCODE = '55000';
      END IF;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'pending generation runs must be claimed before execution'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status = 'RUNNING' THEN
    IF NEW.provider IS DISTINCT FROM OLD.provider
      OR NEW.model IS DISTINCT FROM OLD.model
      OR NEW.input_tokens IS DISTINCT FROM OLD.input_tokens
      OR NEW.output_tokens IS DISTINCT FROM OLD.output_tokens
      OR NEW.estimated_cost_micros IS DISTINCT FROM OLD.estimated_cost_micros
      OR NEW.provider_request_id IS DISTINCT FROM OLD.provider_request_id
      OR NEW.failure_code IS DISTINCT FROM OLD.failure_code THEN
      RAISE EXCEPTION 'lease updates may not change generation results'
        USING ERRCODE = '55000';
    END IF;

    IF NEW.claim_token = OLD.claim_token THEN
      IF NEW.claimed_by IS DISTINCT FROM OLD.claimed_by
        OR NEW.attempt_count <> OLD.attempt_count
        OR NEW.last_heartbeat_at < OLD.last_heartbeat_at
        OR NEW.lease_expires_at <= NEW.last_heartbeat_at THEN
        RAISE EXCEPTION 'invalid generation lease heartbeat'
          USING ERRCODE = '55000';
      END IF;
      RETURN NEW;
    END IF;

    IF OLD.lease_expires_at > now()
      OR NEW.attempt_count <> OLD.attempt_count + 1 THEN
      RAISE EXCEPTION 'active generation leases may not be stolen'
        USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'running generation runs cannot be cancelled'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status NOT IN ('SUCCEEDED', 'FAILED')
    OR NEW.completed_at IS NULL
    OR NEW.claim_token IS DISTINCT FROM OLD.claim_token
    OR NEW.claimed_by IS DISTINCT FROM OLD.claimed_by
    OR NEW.lease_expires_at IS DISTINCT FROM OLD.lease_expires_at
    OR NEW.last_heartbeat_at IS DISTINCT FROM OLD.last_heartbeat_at
    OR NEW.attempt_count <> OLD.attempt_count THEN
    RAISE EXCEPTION 'running generation runs require one attributed terminal transition'
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
$$;
