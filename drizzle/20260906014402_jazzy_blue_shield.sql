ALTER TABLE "validator_rules" ADD COLUMN "change_notes" text DEFAULT 'Initial validator rule imported before lifecycle auditing.' NOT NULL;--> statement-breakpoint
ALTER TABLE "validator_rules" ADD COLUMN "created_by" varchar(160) DEFAULT 'legacy-import' NOT NULL;--> statement-breakpoint
ALTER TABLE "validator_rules" ADD COLUMN "activated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "validator_rules" ADD COLUMN "retired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "validator_rules" ADD COLUMN "retired_by" varchar(160);--> statement-breakpoint
CREATE UNIQUE INDEX "validator_rule_active_key_idx" ON "validator_rules" USING btree ("key") WHERE "validator_rules"."active" = true;--> statement-breakpoint
ALTER TABLE "validator_rules" ADD CONSTRAINT "validator_rule_content_check" CHECK (length(trim("validator_rules"."description")) >= 20 AND length(trim("validator_rules"."change_notes")) >= 20);--> statement-breakpoint
ALTER TABLE "validator_rules" ADD CONSTRAINT "validator_rule_retirement_check" CHECK (("validator_rules"."active" AND "validator_rules"."retired_at" IS NULL AND "validator_rules"."retired_by" IS NULL) OR (NOT "validator_rules"."active" AND "validator_rules"."retired_at" IS NOT NULL AND "validator_rules"."retired_by" IS NOT NULL));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_validator_rule_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'validator rule history is append-only'
      USING ERRCODE = '55000';
  END IF;

  IF NOT OLD.active THEN
    RAISE EXCEPTION 'retired validator rules are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.active OR
     (NEW.id, NEW.key, NEW.version, NEW.description,
      NEW.blocks_publication, NEW.implementation_hash, NEW.change_notes,
      NEW.created_by, NEW.activated_at, NEW.created_at)
     IS DISTINCT FROM
     (OLD.id, OLD.key, OLD.version, OLD.description,
      OLD.blocks_publication, OLD.implementation_hash, OLD.change_notes,
      OLD.created_by, OLD.activated_at, OLD.created_at) THEN
    RAISE EXCEPTION 'validator rules may only transition from active to retired'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER validator_rules_history_guard
BEFORE UPDATE OR DELETE ON validator_rules
FOR EACH ROW EXECUTE FUNCTION guard_validator_rule_history();
