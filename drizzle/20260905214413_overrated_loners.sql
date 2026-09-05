CREATE TABLE "practice_item_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_item_id" uuid NOT NULL,
	"flagged" boolean NOT NULL,
	"recorded_by" varchar(240) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_sessions" DROP CONSTRAINT "practice_session_question_count_check";--> statement-breakpoint
ALTER TABLE "practice_item_review_events" ADD CONSTRAINT "practice_item_review_events_session_item_id_practice_session_items_id_fk" FOREIGN KEY ("session_item_id") REFERENCES "public"."practice_session_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practice_item_review_event_idx" ON "practice_item_review_events" USING btree ("session_item_id","created_at");--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_session_question_count_check" CHECK ("practice_sessions"."requested_question_count" BETWEEN 1 AND 50);
--> statement-breakpoint
CREATE TRIGGER practice_item_review_events_are_append_only
BEFORE UPDATE OR DELETE ON practice_item_review_events
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
