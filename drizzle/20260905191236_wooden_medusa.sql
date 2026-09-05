CREATE TYPE "public"."authoring_mode" AS ENUM('HUMAN', 'MODEL_ASSISTED', 'GENERATED');--> statement-breakpoint
CREATE TYPE "public"."calculator_policy" AS ENUM('ALLOWED', 'NOT_ALLOWED', 'NOT_NEEDED');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('FOUNDATIONAL', 'DEVELOPING', 'PROFICIENT', 'ADVANCED');--> statement-breakpoint
CREATE TYPE "public"."exam_section" AS ENUM('MATH', 'READING', 'SCIENCE', 'ENGLISH_LANGUAGE_USAGE');--> statement-breakpoint
CREATE TYPE "public"."feedback_category" AS ENUM('MATHEMATICAL_ERROR', 'AMBIGUITY', 'ALIGNMENT', 'DISTRACTOR_QUALITY', 'EXPLANATION_QUALITY', 'ACCESSIBILITY', 'ORIGINALITY', 'DIFFICULTY', 'FORMATTING', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('OPEN', 'RESOLVED', 'WONT_FIX');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."question_lifecycle" AS ENUM('DRAFT', 'ACTIVE', 'RETRACTED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('SINGLE_CHOICE', 'MULTIPLE_SELECT', 'NUMERIC', 'ORDERED_RESPONSE');--> statement-breakpoint
CREATE TYPE "public"."review_decision" AS ENUM('APPROVED', 'NEEDS_REVISION', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."source_access" AS ENUM('PUBLIC', 'OPEN_LICENSED', 'ACCOUNT_GATED', 'PAID', 'USER_SUBMITTED');--> statement-breakpoint
CREATE TYPE "public"."source_decision" AS ENUM('METADATA_ONLY', 'COVERAGE_ANALYSIS', 'LICENSED_STORAGE', 'EXCLUDED', 'QUARANTINED');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('DRAFT', 'APPROVED', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."validation_outcome" AS ENUM('PASS', 'FAIL', 'WARNING', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('UNVERIFIED', 'VERIFIED', 'STALE');--> statement-breakpoint
CREATE TABLE "coverage_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_artifact_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"observation" text NOT NULL,
	"abstraction_method" text NOT NULL,
	"recorded_by" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_specifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" varchar(160) NOT NULL,
	"exam_name" varchar(160) NOT NULL,
	"exam_version" varchar(80) NOT NULL,
	"section" "exam_section" NOT NULL,
	"source_url" text NOT NULL,
	"effective_date" timestamp with time zone,
	"last_verified_at" timestamp with time zone NOT NULL,
	"verified_by" varchar(160) NOT NULL,
	"verification_status" "verification_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"total_questions" integer NOT NULL,
	"scored_questions" integer NOT NULL,
	"unscored_questions" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"domain_distribution" jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_spec_question_count_check" CHECK ("exam_specifications"."total_questions" > 0),
	CONSTRAINT "exam_spec_scored_count_check" CHECK ("exam_specifications"."scored_questions" >= 0 AND "exam_specifications"."unscored_questions" >= 0 AND "exam_specifications"."scored_questions" + "exam_specifications"."unscored_questions" = "exam_specifications"."total_questions"),
	CONSTRAINT "exam_spec_duration_check" CHECK ("exam_specifications"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"parent_run_id" uuid,
	"provider" varchar(80) NOT NULL,
	"model" varchar(160) NOT NULL,
	"prompt_hash" varchar(128) NOT NULL,
	"parameters" jsonb NOT NULL,
	"random_seed" varchar(160),
	"status" "generation_status" DEFAULT 'PENDING' NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"estimated_cost_micros" integer,
	"failure_code" varchar(120),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "generation_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_key" varchar(160) NOT NULL,
	"version" integer NOT NULL,
	"status" "template_status" DEFAULT 'DRAFT' NOT NULL,
	"target_skill_id" uuid NOT NULL,
	"question_type" "question_type" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"instructions" text NOT NULL,
	"parameter_constraints" jsonb NOT NULL,
	"prohibited_patterns" jsonb NOT NULL,
	"validator_contract" jsonb NOT NULL,
	"authored_by" varchar(160) NOT NULL,
	"approved_by" varchar(160),
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_template_version_check" CHECK ("generation_templates"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "question_version_skills" (
	"question_version_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"relationship" varchar(40) NOT NULL,
	CONSTRAINT "question_version_skills_question_version_id_skill_id_relationship_pk" PRIMARY KEY("question_version_id","skill_id","relationship"),
	CONSTRAINT "question_version_skill_relationship_check" CHECK ("question_version_skills"."relationship" IN ('SECONDARY', 'PREREQUISITE'))
);
--> statement-breakpoint
CREATE TABLE "question_version_sources" (
	"question_version_id" uuid NOT NULL,
	"source_artifact_id" uuid NOT NULL,
	"relationship" varchar(40) NOT NULL,
	"transformation_notes" text NOT NULL,
	CONSTRAINT "question_version_sources_question_version_id_source_artifact_id_pk" PRIMARY KEY("question_version_id","source_artifact_id"),
	CONSTRAINT "question_version_source_relationship_check" CHECK ("question_version_sources"."relationship" IN ('SPECIFICATION', 'COVERAGE_OBSERVATION', 'IN_HOUSE'))
);
--> statement-breakpoint
CREATE TABLE "question_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"question_type" "question_type" NOT NULL,
	"prompt" text NOT NULL,
	"stimulus" jsonb,
	"choices" jsonb,
	"answer_spec" jsonb NOT NULL,
	"explanation" text NOT NULL,
	"distractor_rationales" jsonb NOT NULL,
	"primary_skill_id" uuid NOT NULL,
	"learning_objective" text NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"difficulty_rationale" text NOT NULL,
	"estimated_seconds" integer NOT NULL,
	"calculator_policy" "calculator_policy" NOT NULL,
	"common_misconceptions" jsonb NOT NULL,
	"authoring_mode" "authoring_mode" NOT NULL,
	"generation_run_id" uuid,
	"author_id" varchar(160),
	"provenance_summary" text NOT NULL,
	"superseded_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_version_positive_check" CHECK ("question_versions"."version" > 0),
	CONSTRAINT "question_version_time_check" CHECK ("question_versions"."estimated_seconds" > 0),
	CONSTRAINT "question_version_authorship_check" CHECK ("question_versions"."generation_run_id" IS NOT NULL OR "question_versions"."author_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_slug" varchar(160) NOT NULL,
	"section" "exam_section" DEFAULT 'MATH' NOT NULL,
	"lifecycle" "question_lifecycle" DEFAULT 'DRAFT' NOT NULL,
	"retraction_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_version_id" uuid NOT NULL,
	"reviewer_id" varchar(160) NOT NULL,
	"decision" "review_decision" NOT NULL,
	"rubric_scores" jsonb NOT NULL,
	"notes" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviewer_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_version_id" uuid NOT NULL,
	"reviewer_id" varchar(160) NOT NULL,
	"category" "feedback_category" NOT NULL,
	"feedback" text NOT NULL,
	"recurring_issue_code" varchar(120),
	"status" "feedback_status" DEFAULT 'OPEN' NOT NULL,
	"resolution_notes" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_prerequisites" (
	"skill_id" uuid NOT NULL,
	"prerequisite_skill_id" uuid NOT NULL,
	"strength" integer DEFAULT 1 NOT NULL,
	"rationale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_prerequisites_skill_id_prerequisite_skill_id_pk" PRIMARY KEY("skill_id","prerequisite_skill_id"),
	CONSTRAINT "skill_prerequisite_not_self_check" CHECK ("skill_prerequisites"."skill_id" <> "skill_prerequisites"."prerequisite_skill_id"),
	CONSTRAINT "skill_prerequisite_strength_check" CHECK ("skill_prerequisites"."strength" BETWEEN 1 AND 3)
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(120) NOT NULL,
	"section" "exam_section" NOT NULL,
	"parent_skill_id" uuid,
	"title" varchar(240) NOT NULL,
	"learning_objective" text NOT NULL,
	"alignment_notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_url" text NOT NULL,
	"publisher" varchar(240) NOT NULL,
	"title" text NOT NULL,
	"artifact_type" varchar(80) NOT NULL,
	"published_at" timestamp with time zone,
	"accessed_at" timestamp with time zone NOT NULL,
	"content_hash" varchar(128),
	"stated_license" text,
	"terms_url" text,
	"robots_summary" text,
	"access_class" "source_access" NOT NULL,
	"decision" "source_decision" NOT NULL,
	"allow_metadata" boolean DEFAULT true NOT NULL,
	"allow_coverage_analysis" boolean DEFAULT false NOT NULL,
	"allow_quotation" boolean DEFAULT false NOT NULL,
	"allow_storage" boolean DEFAULT false NOT NULL,
	"allow_model_input" boolean DEFAULT false NOT NULL,
	"decision_rationale" text NOT NULL,
	"reviewed_by" varchar(160) NOT NULL,
	"recheck_at" timestamp with time zone,
	"object_storage_key" text,
	"takedown_status" varchar(80) DEFAULT 'NONE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_storage_permission_check" CHECK (NOT "source_artifacts"."allow_storage" OR "source_artifacts"."decision" = 'LICENSED_STORAGE'),
	CONSTRAINT "source_model_input_permission_check" CHECK (NOT "source_artifacts"."allow_model_input" OR "source_artifacts"."decision" = 'LICENSED_STORAGE')
);
--> statement-breakpoint
CREATE TABLE "validation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_version_id" uuid NOT NULL,
	"validator_rule_id" uuid NOT NULL,
	"outcome" "validation_outcome" NOT NULL,
	"failure_code" varchar(120),
	"evidence" jsonb NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "validator_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(160) NOT NULL,
	"version" integer NOT NULL,
	"description" text NOT NULL,
	"blocks_publication" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"implementation_hash" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "validator_rule_version_check" CHECK ("validator_rules"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "coverage_observations" ADD CONSTRAINT "coverage_observations_source_artifact_id_source_artifacts_id_fk" FOREIGN KEY ("source_artifact_id") REFERENCES "public"."source_artifacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coverage_observations" ADD CONSTRAINT "coverage_observations_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_template_id_generation_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."generation_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_parent_run_id_generation_runs_id_fk" FOREIGN KEY ("parent_run_id") REFERENCES "public"."generation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_templates" ADD CONSTRAINT "generation_templates_target_skill_id_skills_id_fk" FOREIGN KEY ("target_skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_version_skills" ADD CONSTRAINT "question_version_skills_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_version_skills" ADD CONSTRAINT "question_version_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_version_sources" ADD CONSTRAINT "question_version_sources_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_version_sources" ADD CONSTRAINT "question_version_sources_source_artifact_id_source_artifacts_id_fk" FOREIGN KEY ("source_artifact_id") REFERENCES "public"."source_artifacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_primary_skill_id_skills_id_fk" FOREIGN KEY ("primary_skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_generation_run_id_generation_runs_id_fk" FOREIGN KEY ("generation_run_id") REFERENCES "public"."generation_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_feedback" ADD CONSTRAINT "reviewer_feedback_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_prerequisites" ADD CONSTRAINT "skill_prerequisites_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_prerequisites" ADD CONSTRAINT "skill_prerequisites_prerequisite_skill_id_skills_id_fk" FOREIGN KEY ("prerequisite_skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_parent_skill_id_skills_id_fk" FOREIGN KEY ("parent_skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_runs" ADD CONSTRAINT "validation_runs_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_runs" ADD CONSTRAINT "validation_runs_validator_rule_id_validator_rules_id_fk" FOREIGN KEY ("validator_rule_id") REFERENCES "public"."validator_rules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coverage_source_skill_idx" ON "coverage_observations" USING btree ("source_artifact_id","skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_spec_identity_idx" ON "exam_specifications" USING btree ("exam_name","exam_version","section");--> statement-breakpoint
CREATE INDEX "generation_run_template_status_idx" ON "generation_runs" USING btree ("template_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_template_version_idx" ON "generation_templates" USING btree ("template_key","version");--> statement-breakpoint
CREATE UNIQUE INDEX "question_version_number_idx" ON "question_versions" USING btree ("question_id","version");--> statement-breakpoint
CREATE INDEX "question_version_filter_idx" ON "question_versions" USING btree ("primary_skill_id","difficulty","question_type");--> statement-breakpoint
CREATE UNIQUE INDEX "question_internal_slug_idx" ON "questions" USING btree ("internal_slug");--> statement-breakpoint
CREATE INDEX "review_question_decided_idx" ON "review_decisions" USING btree ("question_version_id","decided_at");--> statement-breakpoint
CREATE INDEX "feedback_search_idx" ON "reviewer_feedback" USING btree ("category","status","recurring_issue_code");--> statement-breakpoint
CREATE INDEX "feedback_question_idx" ON "reviewer_feedback" USING btree ("question_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_code_idx" ON "skills" USING btree ("code");--> statement-breakpoint
CREATE INDEX "skill_section_parent_idx" ON "skills" USING btree ("section","parent_skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_canonical_url_idx" ON "source_artifacts" USING btree ("canonical_url");--> statement-breakpoint
CREATE INDEX "source_decision_idx" ON "source_artifacts" USING btree ("decision","recheck_at");--> statement-breakpoint
CREATE INDEX "validation_question_rule_idx" ON "validation_runs" USING btree ("question_version_id","validator_rule_id","executed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "validator_rule_version_idx" ON "validator_rules" USING btree ("key","version");