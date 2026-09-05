CREATE TABLE "tutor_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_item_id" uuid NOT NULL,
	"step_index" integer NOT NULL,
	"step_id" varchar(80) NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_interaction_step_check" CHECK ("tutor_interactions"."step_index" > 0)
);
--> statement-breakpoint
ALTER TABLE "question_versions" ADD COLUMN "tutor_guidance" jsonb;--> statement-breakpoint
ALTER TABLE "tutor_interactions" ADD CONSTRAINT "tutor_interactions_session_item_id_practice_session_items_id_fk" FOREIGN KEY ("session_item_id") REFERENCES "public"."practice_session_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tutor_interaction_step_idx" ON "tutor_interactions" USING btree ("session_item_id","step_index");--> statement-breakpoint
CREATE UNIQUE INDEX "tutor_interaction_step_id_idx" ON "tutor_interactions" USING btree ("session_item_id","step_id");
--> statement-breakpoint
CREATE TRIGGER tutor_interactions_are_append_only
BEFORE UPDATE OR DELETE ON tutor_interactions
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
