CREATE TABLE "source_policy_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_artifact_id" uuid NOT NULL,
	"review_kind" varchar(20) NOT NULL,
	"previous_policy" jsonb,
	"resulting_policy" jsonb NOT NULL,
	"reviewed_by" varchar(160) NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_policy_review_kind_check" CHECK ("source_policy_reviews"."review_kind" IN ('INITIAL', 'RECHECK')),
	CONSTRAINT "source_policy_review_previous_check" CHECK (("source_policy_reviews"."review_kind" = 'INITIAL' AND "source_policy_reviews"."previous_policy" IS NULL) OR ("source_policy_reviews"."review_kind" = 'RECHECK' AND "source_policy_reviews"."previous_policy" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "source_policy_reviews" ADD CONSTRAINT "source_policy_reviews_source_artifact_id_source_artifacts_id_fk" FOREIGN KEY ("source_artifact_id") REFERENCES "public"."source_artifacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_policy_review_history_idx" ON "source_policy_reviews" USING btree ("source_artifact_id","reviewed_at");--> statement-breakpoint
CREATE TRIGGER source_policy_reviews_are_append_only
BEFORE UPDATE OR DELETE ON source_policy_reviews
FOR EACH ROW EXECUTE FUNCTION reject_audit_record_mutation();
