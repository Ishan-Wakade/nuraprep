CREATE TABLE "question_publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"question_version_id" uuid NOT NULL,
	"published_by" varchar(160) NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone,
	"retired_by" varchar(160),
	"retirement_reason" text,
	CONSTRAINT "question_publication_retirement_check" CHECK (("question_publications"."retired_at" IS NULL AND "question_publications"."retired_by" IS NULL AND "question_publications"."retirement_reason" IS NULL) OR ("question_publications"."retired_at" IS NOT NULL AND "question_publications"."retired_by" IS NOT NULL AND "question_publications"."retirement_reason" IS NOT NULL)),
	CONSTRAINT "question_publication_time_check" CHECK ("question_publications"."retired_at" IS NULL OR "question_publications"."retired_at" >= "question_publications"."published_at")
);
--> statement-breakpoint
ALTER TABLE "question_versions" ADD COLUMN "verification_spec" jsonb;--> statement-breakpoint
ALTER TABLE "question_publications" ADD CONSTRAINT "question_publications_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_publications" ADD CONSTRAINT "question_publications_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_publication_version_idx" ON "question_publications" USING btree ("question_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "question_publication_current_idx" ON "question_publications" USING btree ("question_id") WHERE "question_publications"."retired_at" IS NULL;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_question_publication_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  version_question_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'question publication history is append-only'
      USING ERRCODE = '55000';
  END IF;

  SELECT question_id INTO version_question_id
  FROM question_versions
  WHERE id = NEW.question_version_id;

  IF version_question_id IS NULL OR version_question_id <> NEW.question_id THEN
    RAISE EXCEPTION 'published version must belong to the publication question'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.question_id IS DISTINCT FROM NEW.question_id
      OR OLD.question_version_id IS DISTINCT FROM NEW.question_version_id
      OR OLD.published_by IS DISTINCT FROM NEW.published_by
      OR OLD.published_at IS DISTINCT FROM NEW.published_at THEN
      RAISE EXCEPTION 'published identity and attribution are immutable'
        USING ERRCODE = '55000';
    END IF;

    IF OLD.retired_at IS NOT NULL THEN
      RAISE EXCEPTION 'retired publication history is immutable'
        USING ERRCODE = '55000';
    END IF;

    IF NEW.retired_at IS NULL THEN
      RAISE EXCEPTION 'publication updates may only retire the current version'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER question_publications_history_guard
BEFORE INSERT OR UPDATE OR DELETE ON question_publications
FOR EACH ROW EXECUTE FUNCTION enforce_question_publication_history();
