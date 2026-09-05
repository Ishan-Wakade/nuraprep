CREATE TABLE "learner_question_report_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"status" "feedback_status" NOT NULL,
	"reviewer_id" varchar(160) NOT NULL,
	"notes" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_report_event_notes_check" CHECK (length("learner_question_report_events"."notes") >= 5)
);
--> statement-breakpoint
CREATE TABLE "learner_question_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_version_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"category" "feedback_category" NOT NULL,
	"details" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_report_details_check" CHECK (length("learner_question_reports"."details") >= 10)
);
--> statement-breakpoint
ALTER TABLE "learner_question_report_events" ADD CONSTRAINT "learner_question_report_events_report_id_learner_question_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."learner_question_reports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_question_reports" ADD CONSTRAINT "learner_question_reports_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_question_reports" ADD CONSTRAINT "learner_question_reports_learner_id_learner_profiles_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learner_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_question_reports" ADD CONSTRAINT "learner_question_reports_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learner_report_event_history_idx" ON "learner_question_report_events" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "learner_report_attempt_category_idx" ON "learner_question_reports" USING btree ("attempt_id","category");--> statement-breakpoint
CREATE INDEX "learner_report_question_created_idx" ON "learner_question_reports" USING btree ("question_version_id","created_at");--> statement-breakpoint
CREATE INDEX "learner_report_learner_created_idx" ON "learner_question_reports" USING btree ("learner_id","created_at");
--> statement-breakpoint
CREATE TRIGGER learner_question_reports_are_append_only
BEFORE UPDATE OR DELETE ON learner_question_reports
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
--> statement-breakpoint
CREATE TRIGGER learner_question_report_events_are_append_only
BEFORE UPDATE OR DELETE ON learner_question_report_events
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
