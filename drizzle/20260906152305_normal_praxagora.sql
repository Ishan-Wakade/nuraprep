CREATE TYPE "public"."auth_role" AS ENUM('LEARNER', 'REVIEWER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "account_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"event_type" varchar(80) NOT NULL,
	"actor_id" varchar(160) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_role_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"role" "auth_role" NOT NULL,
	"granted_by" varchar(160) NOT NULL,
	"reason" text NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" varchar(160),
	"revocation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_role_revocation_check" CHECK (("auth_role_grants"."revoked_at" IS NULL AND "auth_role_grants"."revoked_by" IS NULL AND "auth_role_grants"."revocation_reason" IS NULL) OR ("auth_role_grants"."revoked_at" IS NOT NULL AND "auth_role_grants"."revoked_by" IS NOT NULL AND "auth_role_grants"."revocation_reason" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "auth_user_id" text;--> statement-breakpoint
ALTER TABLE "account_audit_events" ADD CONSTRAINT "account_audit_events_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_role_grants" ADD CONSTRAINT "auth_role_grants_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_audit_user_created_idx" ON "account_audit_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_account_issuer_subject_idx" ON "auth_accounts" USING btree ("issuer","account_id");--> statement-breakpoint
CREATE INDEX "auth_account_user_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_role_active_idx" ON "auth_role_grants" USING btree ("user_id","role") WHERE "auth_role_grants"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "auth_session_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verifications" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_auth_user_id_auth_users_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "learner_auth_user_idx" ON "learner_profiles" USING btree ("auth_user_id");
--> statement-breakpoint
CREATE TRIGGER account_audit_events_are_append_only
BEFORE UPDATE OR DELETE ON account_audit_events
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION guard_auth_role_grant_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
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
CREATE TRIGGER guard_auth_role_grant_history
BEFORE UPDATE OR DELETE ON auth_role_grants
FOR EACH ROW EXECUTE FUNCTION guard_auth_role_grant_history();
