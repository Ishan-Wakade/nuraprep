import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type {
  AnswerSpec,
  DistractorRationales,
  LearnerAnswer,
  MathVerificationSpec,
  QuestionChoice,
  QuestionStimulus,
} from "@/lib/questions/contracts";
import type { PracticeSessionFilters } from "@/lib/practice/contracts";

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const examSectionEnum = pgEnum("exam_section", [
  "MATH",
  "READING",
  "SCIENCE",
  "ENGLISH_LANGUAGE_USAGE",
]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "UNVERIFIED",
  "VERIFIED",
  "STALE",
]);
export const sourceAccessEnum = pgEnum("source_access", [
  "PUBLIC",
  "OPEN_LICENSED",
  "ACCOUNT_GATED",
  "PAID",
  "USER_SUBMITTED",
]);
export const sourceDecisionEnum = pgEnum("source_decision", [
  "METADATA_ONLY",
  "COVERAGE_ANALYSIS",
  "LICENSED_STORAGE",
  "EXCLUDED",
  "QUARANTINED",
]);
export const templateStatusEnum = pgEnum("template_status", [
  "DRAFT",
  "APPROVED",
  "RETIRED",
]);
export const generationStatusEnum = pgEnum("generation_status", [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);
export const questionTypeEnum = pgEnum("question_type", [
  "SINGLE_CHOICE",
  "MULTIPLE_SELECT",
  "NUMERIC",
  "ORDERED_RESPONSE",
]);
export const difficultyEnum = pgEnum("difficulty", [
  "FOUNDATIONAL",
  "DEVELOPING",
  "PROFICIENT",
  "ADVANCED",
]);
export const calculatorPolicyEnum = pgEnum("calculator_policy", [
  "ALLOWED",
  "NOT_ALLOWED",
  "NOT_NEEDED",
]);
export const questionLifecycleEnum = pgEnum("question_lifecycle", [
  "DRAFT",
  "ACTIVE",
  "RETRACTED",
  "ARCHIVED",
]);
export const authoringModeEnum = pgEnum("authoring_mode", [
  "HUMAN",
  "MODEL_ASSISTED",
  "GENERATED",
]);
export const validationOutcomeEnum = pgEnum("validation_outcome", [
  "PASS",
  "FAIL",
  "WARNING",
  "ERROR",
]);
export const reviewDecisionEnum = pgEnum("review_decision", [
  "APPROVED",
  "NEEDS_REVISION",
  "REJECTED",
]);
export const feedbackCategoryEnum = pgEnum("feedback_category", [
  "MATHEMATICAL_ERROR",
  "AMBIGUITY",
  "ALIGNMENT",
  "DISTRACTOR_QUALITY",
  "EXPLANATION_QUALITY",
  "ACCESSIBILITY",
  "ORIGINALITY",
  "DIFFICULTY",
  "FORMATTING",
  "OTHER",
]);
export const feedbackStatusEnum = pgEnum("feedback_status", [
  "OPEN",
  "RESOLVED",
  "WONT_FIX",
]);
export const practiceModeEnum = pgEnum("practice_mode", [
  "TOPIC_PRACTICE",
  "DIAGNOSTIC",
  "ADAPTIVE",
  "PRACTICE_TEST",
]);
export const practiceSessionStatusEnum = pgEnum("practice_session_status", [
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
]);
export const timingModeEnum = pgEnum("timing_mode", ["UNTIMED", "TIMED"]);

export const examSpecifications = pgTable(
  "exam_specifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    owner: varchar("owner", { length: 160 }).notNull(),
    examName: varchar("exam_name", { length: 160 }).notNull(),
    examVersion: varchar("exam_version", { length: 80 }).notNull(),
    section: examSectionEnum("section").notNull(),
    sourceUrl: text("source_url").notNull(),
    effectiveDate: timestamp("effective_date", { withTimezone: true }),
    lastVerifiedAt: timestamp("last_verified_at", {
      withTimezone: true,
    }).notNull(),
    verifiedBy: varchar("verified_by", { length: 160 }).notNull(),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("UNVERIFIED"),
    totalQuestions: integer("total_questions").notNull(),
    scoredQuestions: integer("scored_questions").notNull(),
    unscoredQuestions: integer("unscored_questions").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    domainDistribution: jsonb("domain_distribution")
      .$type<Record<string, number>>()
      .notNull(),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("exam_spec_identity_idx").on(
      table.examName,
      table.examVersion,
      table.section,
    ),
    check("exam_spec_question_count_check", sql`${table.totalQuestions} > 0`),
    check(
      "exam_spec_scored_count_check",
      sql`${table.scoredQuestions} >= 0 AND ${table.unscoredQuestions} >= 0 AND ${table.scoredQuestions} + ${table.unscoredQuestions} = ${table.totalQuestions}`,
    ),
    check("exam_spec_duration_check", sql`${table.durationMinutes} > 0`),
  ],
);

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 120 }).notNull(),
    section: examSectionEnum("section").notNull(),
    parentSkillId: uuid("parent_skill_id").references(
      (): AnyPgColumn => skills.id,
      { onDelete: "restrict" },
    ),
    title: varchar("title", { length: 240 }).notNull(),
    learningObjective: text("learning_objective").notNull(),
    alignmentNotes: text("alignment_notes"),
    active: boolean("active").notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("skill_code_idx").on(table.code),
    index("skill_section_parent_idx").on(table.section, table.parentSkillId),
  ],
);

export const skillPrerequisites = pgTable(
  "skill_prerequisites",
  {
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    prerequisiteSkillId: uuid("prerequisite_skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "restrict" }),
    strength: integer("strength").notNull().default(1),
    rationale: text("rationale").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.skillId, table.prerequisiteSkillId] }),
    check(
      "skill_prerequisite_not_self_check",
      sql`${table.skillId} <> ${table.prerequisiteSkillId}`,
    ),
    check(
      "skill_prerequisite_strength_check",
      sql`${table.strength} BETWEEN 1 AND 3`,
    ),
  ],
);

export const sourceArtifacts = pgTable(
  "source_artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalUrl: text("canonical_url").notNull(),
    publisher: varchar("publisher", { length: 240 }).notNull(),
    title: text("title").notNull(),
    artifactType: varchar("artifact_type", { length: 80 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    accessedAt: timestamp("accessed_at", { withTimezone: true }).notNull(),
    contentHash: varchar("content_hash", { length: 128 }),
    statedLicense: text("stated_license"),
    termsUrl: text("terms_url"),
    robotsSummary: text("robots_summary"),
    accessClass: sourceAccessEnum("access_class").notNull(),
    decision: sourceDecisionEnum("decision").notNull(),
    allowMetadata: boolean("allow_metadata").notNull().default(true),
    allowCoverageAnalysis: boolean("allow_coverage_analysis")
      .notNull()
      .default(false),
    allowQuotation: boolean("allow_quotation").notNull().default(false),
    allowStorage: boolean("allow_storage").notNull().default(false),
    allowModelInput: boolean("allow_model_input").notNull().default(false),
    decisionRationale: text("decision_rationale").notNull(),
    reviewedBy: varchar("reviewed_by", { length: 160 }).notNull(),
    recheckAt: timestamp("recheck_at", { withTimezone: true }),
    objectStorageKey: text("object_storage_key"),
    takedownStatus: varchar("takedown_status", { length: 80 })
      .notNull()
      .default("NONE"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("source_canonical_url_idx").on(table.canonicalUrl),
    index("source_decision_idx").on(table.decision, table.recheckAt),
    check(
      "source_storage_permission_check",
      sql`NOT ${table.allowStorage} OR ${table.decision} = 'LICENSED_STORAGE'`,
    ),
    check(
      "source_model_input_permission_check",
      sql`NOT ${table.allowModelInput} OR ${table.decision} = 'LICENSED_STORAGE'`,
    ),
  ],
);

export const coverageObservations = pgTable(
  "coverage_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceArtifactId: uuid("source_artifact_id")
      .notNull()
      .references(() => sourceArtifacts.id, { onDelete: "restrict" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "restrict" }),
    observation: text("observation").notNull(),
    abstractionMethod: text("abstraction_method").notNull(),
    recordedBy: varchar("recorded_by", { length: 160 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("coverage_source_skill_idx").on(
      table.sourceArtifactId,
      table.skillId,
    ),
  ],
);

export const generationTemplates = pgTable(
  "generation_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateKey: varchar("template_key", { length: 160 }).notNull(),
    version: integer("version").notNull(),
    status: templateStatusEnum("status").notNull().default("DRAFT"),
    targetSkillId: uuid("target_skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "restrict" }),
    questionType: questionTypeEnum("question_type").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    instructions: text("instructions").notNull(),
    parameterConstraints: jsonb("parameter_constraints")
      .$type<Record<string, unknown>>()
      .notNull(),
    prohibitedPatterns: jsonb("prohibited_patterns")
      .$type<string[]>()
      .notNull(),
    validatorContract: jsonb("validator_contract")
      .$type<Record<string, unknown>>()
      .notNull(),
    authoredBy: varchar("authored_by", { length: 160 }).notNull(),
    approvedBy: varchar("approved_by", { length: 160 }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("generation_template_version_idx").on(
      table.templateKey,
      table.version,
    ),
    check("generation_template_version_check", sql`${table.version} > 0`),
  ],
);

export const generationRuns = pgTable(
  "generation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => generationTemplates.id, { onDelete: "restrict" }),
    parentRunId: uuid("parent_run_id").references(
      (): AnyPgColumn => generationRuns.id,
      { onDelete: "set null" },
    ),
    provider: varchar("provider", { length: 80 }).notNull(),
    model: varchar("model", { length: 160 }).notNull(),
    promptHash: varchar("prompt_hash", { length: 128 }).notNull(),
    parameters: jsonb("parameters").$type<Record<string, unknown>>().notNull(),
    randomSeed: varchar("random_seed", { length: 160 }),
    status: generationStatusEnum("status").notNull().default("PENDING"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    estimatedCostMicros: integer("estimated_cost_micros"),
    failureCode: varchar("failure_code", { length: 120 }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("generation_run_template_status_idx").on(
      table.templateId,
      table.status,
    ),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    internalSlug: varchar("internal_slug", { length: 160 }).notNull(),
    section: examSectionEnum("section").notNull().default("MATH"),
    lifecycle: questionLifecycleEnum("lifecycle").notNull().default("DRAFT"),
    retractionReason: text("retraction_reason"),
    ...auditColumns,
  },
  (table) => [uniqueIndex("question_internal_slug_idx").on(table.internalSlug)],
);

export const questionVersions = pgTable(
  "question_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    questionType: questionTypeEnum("question_type").notNull(),
    prompt: text("prompt").notNull(),
    stimulus: jsonb("stimulus").$type<QuestionStimulus>(),
    choices: jsonb("choices").$type<QuestionChoice[]>(),
    answerSpec: jsonb("answer_spec").$type<AnswerSpec>().notNull(),
    explanation: text("explanation").notNull(),
    distractorRationales: jsonb("distractor_rationales")
      .$type<DistractorRationales>()
      .notNull(),
    verificationSpec: jsonb("verification_spec").$type<MathVerificationSpec>(),
    primarySkillId: uuid("primary_skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "restrict" }),
    learningObjective: text("learning_objective").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    difficultyRationale: text("difficulty_rationale").notNull(),
    estimatedSeconds: integer("estimated_seconds").notNull(),
    calculatorPolicy: calculatorPolicyEnum("calculator_policy").notNull(),
    commonMisconceptions: jsonb("common_misconceptions")
      .$type<string[]>()
      .notNull(),
    authoringMode: authoringModeEnum("authoring_mode").notNull(),
    generationRunId: uuid("generation_run_id").references(
      () => generationRuns.id,
      {
        onDelete: "restrict",
      },
    ),
    authorId: varchar("author_id", { length: 160 }),
    provenanceSummary: text("provenance_summary").notNull(),
    supersededReason: text("superseded_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("question_version_number_idx").on(
      table.questionId,
      table.version,
    ),
    index("question_version_filter_idx").on(
      table.primarySkillId,
      table.difficulty,
      table.questionType,
    ),
    check("question_version_positive_check", sql`${table.version} > 0`),
    check("question_version_time_check", sql`${table.estimatedSeconds} > 0`),
    check(
      "question_version_authorship_check",
      sql`${table.generationRunId} IS NOT NULL OR ${table.authorId} IS NOT NULL`,
    ),
  ],
);

export const questionVersionSkills = pgTable(
  "question_version_skills",
  {
    questionVersionId: uuid("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "restrict" }),
    relationship: varchar("relationship", { length: 40 }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.questionVersionId, table.skillId, table.relationship],
    }),
    check(
      "question_version_skill_relationship_check",
      sql`${table.relationship} IN ('SECONDARY', 'PREREQUISITE')`,
    ),
  ],
);

export const questionVersionSources = pgTable(
  "question_version_sources",
  {
    questionVersionId: uuid("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "cascade" }),
    sourceArtifactId: uuid("source_artifact_id")
      .notNull()
      .references(() => sourceArtifacts.id, { onDelete: "restrict" }),
    relationship: varchar("relationship", { length: 40 }).notNull(),
    transformationNotes: text("transformation_notes").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.questionVersionId, table.sourceArtifactId] }),
    check(
      "question_version_source_relationship_check",
      sql`${table.relationship} IN ('SPECIFICATION', 'COVERAGE_OBSERVATION', 'IN_HOUSE')`,
    ),
  ],
);

export const validatorRules = pgTable(
  "validator_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 160 }).notNull(),
    version: integer("version").notNull(),
    description: text("description").notNull(),
    blocksPublication: boolean("blocks_publication").notNull().default(true),
    active: boolean("active").notNull().default(true),
    implementationHash: varchar("implementation_hash", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("validator_rule_version_idx").on(table.key, table.version),
    check("validator_rule_version_check", sql`${table.version} > 0`),
  ],
);

export const validationRuns = pgTable(
  "validation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionVersionId: uuid("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "restrict" }),
    validatorRuleId: uuid("validator_rule_id")
      .notNull()
      .references(() => validatorRules.id, { onDelete: "restrict" }),
    outcome: validationOutcomeEnum("outcome").notNull(),
    failureCode: varchar("failure_code", { length: 120 }),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("validation_question_rule_idx").on(
      table.questionVersionId,
      table.validatorRuleId,
      table.executedAt,
    ),
  ],
);

export const reviewDecisions = pgTable(
  "review_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionVersionId: uuid("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "restrict" }),
    reviewerId: varchar("reviewer_id", { length: 160 }).notNull(),
    decision: reviewDecisionEnum("decision").notNull(),
    rubricScores: jsonb("rubric_scores")
      .$type<Record<string, number>>()
      .notNull(),
    notes: text("notes").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("review_question_decided_idx").on(
      table.questionVersionId,
      table.decidedAt,
    ),
  ],
);

export const reviewerFeedback = pgTable(
  "reviewer_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionVersionId: uuid("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "restrict" }),
    reviewerId: varchar("reviewer_id", { length: 160 }).notNull(),
    category: feedbackCategoryEnum("category").notNull(),
    feedback: text("feedback").notNull(),
    recurringIssueCode: varchar("recurring_issue_code", { length: 120 }),
    status: feedbackStatusEnum("status").notNull().default("OPEN"),
    resolutionNotes: text("resolution_notes"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    index("feedback_search_idx").on(
      table.category,
      table.status,
      table.recurringIssueCode,
    ),
    index("feedback_question_idx").on(table.questionVersionId),
  ],
);

export const questionPublications = pgTable(
  "question_publications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    questionVersionId: uuid("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "restrict" }),
    publishedBy: varchar("published_by", { length: 160 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    retiredBy: varchar("retired_by", { length: 160 }),
    retirementReason: text("retirement_reason"),
  },
  (table) => [
    uniqueIndex("question_publication_version_idx").on(table.questionVersionId),
    uniqueIndex("question_publication_current_idx")
      .on(table.questionId)
      .where(sql`${table.retiredAt} IS NULL`),
    check(
      "question_publication_retirement_check",
      sql`(${table.retiredAt} IS NULL AND ${table.retiredBy} IS NULL AND ${table.retirementReason} IS NULL) OR (${table.retiredAt} IS NOT NULL AND ${table.retiredBy} IS NOT NULL AND ${table.retirementReason} IS NOT NULL)`,
    ),
    check(
      "question_publication_time_check",
      sql`${table.retiredAt} IS NULL OR ${table.retiredAt} >= ${table.publishedAt}`,
    ),
  ],
);

export const learnerProfiles = pgTable(
  "learner_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authSubject: varchar("auth_subject", { length: 240 }).notNull(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    email: varchar("email", { length: 320 }),
    ...auditColumns,
  },
  (table) => [uniqueIndex("learner_auth_subject_idx").on(table.authSubject)],
);

export const practiceSessions = pgTable(
  "practice_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learnerProfiles.id, { onDelete: "restrict" }),
    mode: practiceModeEnum("mode").notNull().default("TOPIC_PRACTICE"),
    status: practiceSessionStatusEnum("status")
      .notNull()
      .default("IN_PROGRESS"),
    timingMode: timingModeEnum("timing_mode").notNull().default("UNTIMED"),
    requestedQuestionCount: integer("requested_question_count").notNull(),
    filters: jsonb("filters").$type<PracticeSessionFilters>().notNull(),
    timeLimitSeconds: integer("time_limit_seconds"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    index("practice_session_learner_status_idx").on(
      table.learnerId,
      table.status,
      table.startedAt,
    ),
    check(
      "practice_session_question_count_check",
      sql`${table.requestedQuestionCount} BETWEEN 1 AND 20`,
    ),
    check(
      "practice_session_timing_check",
      sql`(${table.timingMode} = 'UNTIMED' AND ${table.timeLimitSeconds} IS NULL) OR (${table.timingMode} = 'TIMED' AND ${table.timeLimitSeconds} > 0)`,
    ),
    check(
      "practice_session_end_check",
      sql`(${table.status} = 'IN_PROGRESS' AND ${table.endedAt} IS NULL) OR (${table.status} <> 'IN_PROGRESS' AND ${table.endedAt} IS NOT NULL)`,
    ),
  ],
);

export const practiceSessionItems = pgTable(
  "practice_session_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => practiceSessions.id, { onDelete: "restrict" }),
    questionVersionId: uuid("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    selectionReason: text("selection_reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("practice_item_position_idx").on(
      table.sessionId,
      table.position,
    ),
    uniqueIndex("practice_item_question_idx").on(
      table.sessionId,
      table.questionVersionId,
    ),
    check("practice_item_position_check", sql`${table.position} > 0`),
  ],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionItemId: uuid("session_item_id")
      .notNull()
      .references(() => practiceSessionItems.id, { onDelete: "restrict" }),
    answerPayload: jsonb("answer_payload").$type<LearnerAnswer>().notNull(),
    correct: boolean("correct").notNull(),
    evaluationReason: varchar("evaluation_reason", { length: 80 }),
    evaluatorVersion: varchar("evaluator_version", { length: 80 })
      .notNull()
      .default("answer-evaluator-v1"),
    elapsedMilliseconds: integer("elapsed_milliseconds").notNull(),
    confidence: integer("confidence"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("attempt_session_item_idx").on(table.sessionItemId),
    index("attempt_submitted_at_idx").on(table.submittedAt),
    check(
      "attempt_elapsed_check",
      sql`${table.elapsedMilliseconds} BETWEEN 0 AND 86400000`,
    ),
    check(
      "attempt_confidence_check",
      sql`${table.confidence} IS NULL OR ${table.confidence} BETWEEN 1 AND 5`,
    ),
  ],
);
