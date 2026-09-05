CREATE TYPE "public"."practice_mode" AS ENUM('TOPIC_PRACTICE', 'DIAGNOSTIC', 'ADAPTIVE', 'PRACTICE_TEST');--> statement-breakpoint
CREATE TYPE "public"."practice_session_status" AS ENUM('IN_PROGRESS', 'COMPLETED', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "public"."timing_mode" AS ENUM('UNTIMED', 'TIMED');--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_item_id" uuid NOT NULL,
	"answer_payload" jsonb NOT NULL,
	"correct" boolean NOT NULL,
	"evaluation_reason" varchar(80),
	"evaluator_version" varchar(80) DEFAULT 'answer-evaluator-v1' NOT NULL,
	"elapsed_milliseconds" integer NOT NULL,
	"confidence" integer,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_elapsed_check" CHECK ("attempts"."elapsed_milliseconds" BETWEEN 0 AND 86400000),
	CONSTRAINT "attempt_confidence_check" CHECK ("attempts"."confidence" IS NULL OR "attempts"."confidence" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "learner_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_subject" varchar(240) NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"email" varchar(320),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_session_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"selection_reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_item_position_check" CHECK ("practice_session_items"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"mode" "practice_mode" DEFAULT 'TOPIC_PRACTICE' NOT NULL,
	"status" "practice_session_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"timing_mode" "timing_mode" DEFAULT 'UNTIMED' NOT NULL,
	"requested_question_count" integer NOT NULL,
	"filters" jsonb NOT NULL,
	"time_limit_seconds" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_session_question_count_check" CHECK ("practice_sessions"."requested_question_count" BETWEEN 1 AND 20),
	CONSTRAINT "practice_session_timing_check" CHECK (("practice_sessions"."timing_mode" = 'UNTIMED' AND "practice_sessions"."time_limit_seconds" IS NULL) OR ("practice_sessions"."timing_mode" = 'TIMED' AND "practice_sessions"."time_limit_seconds" > 0)),
	CONSTRAINT "practice_session_end_check" CHECK (("practice_sessions"."status" = 'IN_PROGRESS' AND "practice_sessions"."ended_at" IS NULL) OR ("practice_sessions"."status" <> 'IN_PROGRESS' AND "practice_sessions"."ended_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_session_item_id_practice_session_items_id_fk" FOREIGN KEY ("session_item_id") REFERENCES "public"."practice_session_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_learner_id_learner_profiles_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learner_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_session_item_idx" ON "attempts" USING btree ("session_item_id");--> statement-breakpoint
CREATE INDEX "attempt_submitted_at_idx" ON "attempts" USING btree ("submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "learner_auth_subject_idx" ON "learner_profiles" USING btree ("auth_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_item_position_idx" ON "practice_session_items" USING btree ("session_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_item_question_idx" ON "practice_session_items" USING btree ("session_id","question_version_id");--> statement-breakpoint
CREATE INDEX "practice_session_learner_status_idx" ON "practice_sessions" USING btree ("learner_id","status","started_at");
--> statement-breakpoint
CREATE TRIGGER practice_session_items_are_append_only
BEFORE UPDATE OR DELETE ON practice_session_items
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
--> statement-breakpoint
CREATE TRIGGER attempts_are_append_only
BEFORE UPDATE OR DELETE ON attempts
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
