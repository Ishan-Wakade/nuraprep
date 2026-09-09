"use client";

import { useActionState } from "react";

import type {
  QuestionChoice,
  AnswerSpec,
  DistractorRationales,
  MathVerificationSpec,
  MisconceptionRule,
  TutorGuidance,
} from "@/lib/questions/contracts";
import { REVIEW_SCORE_RUBRIC } from "@/lib/questions/review-rubrics";

import {
  createQuestionRevision,
  publishQuestionVersion,
  runDeterministicValidation,
  submitReviewDecision,
  submitReviewerFeedback,
  submitReviewerValidationBatch,
  triageLearnerQuestionReport,
} from "../../actions";
import { requestQuestionRegeneration } from "../../generation/actions";

const initialReviewerActionState = {
  status: "idle" as const,
  message: "",
};

export function DecisionForm({ versionId }: { versionId: string }) {
  const [state, action, pending] = useActionState(
    submitReviewDecision,
    initialReviewerActionState,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="versionId" value={versionId} />
      <div className="space-y-3">
        <label className="block max-w-sm text-xs font-bold text-[#52676a]">
          Decision
          <select
            name="decision"
            required
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select a decision
            </option>
            <option value="APPROVED">Approved</option>
            <option value="NEEDS_REVISION">Needs revision</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["mathematicalCorrectness", "Mathematical correctness"],
            ["clarity", "Clarity"],
            ["alignment", "Topic alignment"],
            ["accessibility", "Accessibility"],
            ["originality", "Originality"],
          ].map(([name, label]) => (
            <label key={name} className="text-xs font-bold text-[#52676a]">
              {label}
              <select
                name={name}
                defaultValue=""
                required
                aria-label={`${label} score`}
                className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-2 py-2.5 text-sm"
              >
                <option value="" disabled>
                  Score
                </option>
                {[1, 2, 3, 4].map((score) => (
                  <option key={score} value={score}>
                    {score}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-[#d8ded9] bg-[#faf9f4] p-3 text-xs leading-5 text-[#52676a]">
        <strong className="text-[#123136]">Score guide:</strong>{" "}
        {Object.entries(REVIEW_SCORE_RUBRIC)
          .map(([score, meaning]) => `${score} = ${meaning}`)
          .join(" · ")}
      </div>
      <label className="block text-xs font-bold text-[#52676a]">
        Review notes
        <textarea
          name="notes"
          required
          minLength={5}
          rows={4}
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          placeholder="Record the evidence behind this decision."
        />
      </label>
      <ActionFooter state={state} pending={pending} label="Record decision" />
    </form>
  );
}

export function FeedbackForm({ versionId }: { versionId: string }) {
  const [state, action, pending] = useActionState(
    submitReviewerFeedback,
    initialReviewerActionState,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="versionId" value={versionId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-[#52676a]">
          Category
          <select
            name="category"
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          >
            {[
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
            ].map((category) => (
              <option key={category} value={category}>
                {category.toLowerCase().replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[#52676a]">
          Recurring issue code <span className="font-normal">(optional)</span>
          <input
            name="recurringIssueCode"
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm uppercase"
            placeholder="E.G. AMBIGUOUS_UNIT"
          />
        </label>
      </div>
      <label className="block text-xs font-bold text-[#52676a]">
        Feedback
        <textarea
          name="feedback"
          required
          minLength={5}
          rows={4}
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          placeholder="Describe the issue and the evidence a revision should address."
        />
      </label>
      <ActionFooter state={state} pending={pending} label="Save feedback" />
    </form>
  );
}

export function AutomatedValidationForm({ versionId }: { versionId: string }) {
  const [state, action, pending] = useActionState(
    runDeterministicValidation,
    initialReviewerActionState,
  );

  return (
    <form action={action}>
      <input type="hidden" name="versionId" value={versionId} />
      <p className="mb-4 text-sm leading-6 text-[#52676a]">
        Re-run the answer-contract and mathematical-correctness checks against
        this exact immutable version. Results are appended, never overwritten.
      </p>
      <ActionFooter
        state={state}
        pending={pending}
        label="Run deterministic checks"
      />
    </form>
  );
}

export function ReviewerValidationForm({
  versionId,
  validators,
}: {
  versionId: string;
  validators: { key: string; version: number; description: string }[];
}) {
  const [state, action, pending] = useActionState(
    submitReviewerValidationBatch,
    initialReviewerActionState,
  );
  const hasCompleteRubricSet = validators.length === 7;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="versionId" value={versionId} />
      <p className="text-sm leading-6 text-[#52676a]">
        Complete each rubric below, then submit once. NuraPrep will preserve one
        immutable validation record per check for this exact question version.
      </p>
      {!hasCompleteRubricSet ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-900"
        >
          The complete set of seven active reviewer rubrics is unavailable.
          Evidence submission is disabled until the rule configuration is
          restored.
        </p>
      ) : null}
      <div className="space-y-4">
        {validators.map((validator) => {
          const label = formatValidatorLabel(validator.key);
          return (
            <fieldset
              key={validator.key}
              className="space-y-3 rounded-xl border border-[#d8ded9] p-4"
            >
              <legend className="px-1 text-sm font-bold text-[#123136]">
                {label} v{validator.version}
              </legend>
              <p className="text-xs leading-5 text-[#52676a]">
                {validator.description}
              </p>
              <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
                <label className="text-xs font-bold text-[#52676a]">
                  Outcome for {label}
                  <select
                    name={`outcome-${validator.key}`}
                    required
                    defaultValue=""
                    className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="" disabled>
                      Select outcome
                    </option>
                    <option value="PASS">Pass</option>
                    <option value="FAIL">Fail</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-[#52676a]">
                  Evidence for {label}
                  <textarea
                    name={`evidence-${validator.key}`}
                    required
                    minLength={40}
                    rows={3}
                    className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm font-normal"
                    placeholder="Describe what you inspected and why this check passes or fails."
                  />
                </label>
              </div>
              <label className="block text-xs font-bold text-[#52676a] sm:max-w-md">
                Failure code for {label}{" "}
                <span className="font-normal">(required only on failure)</span>
                <input
                  name={`failureCode-${validator.key}`}
                  className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm uppercase"
                  placeholder="E.G. EXPLANATION_SKIPS_STEP"
                />
              </label>
            </fieldset>
          );
        })}
      </div>
      <fieldset className="space-y-2 rounded-xl border border-[#d8ded9] bg-[#faf9f4] p-3">
        <legend className="px-1 text-xs font-bold text-[#52676a]">
          Required attestations
        </legend>
        <Attestation
          name="inspectedExactVersion"
          label="I inspected the prompt, answer interaction, keyed answer, explanation, and relevant metadata for this exact version."
        />
        <Attestation
          name="appliedCurrentRubric"
          label="I applied each validator's displayed current rubric rather than inferring one result from another check."
        />
        <Attestation
          name="independentJudgment"
          label="This is my review judgment; automated signals or model output alone did not determine it."
        />
      </fieldset>
      <ActionFooter
        state={state}
        pending={pending}
        disabled={!hasCompleteRubricSet}
        label="Append all human-review evidence"
      />
    </form>
  );
}

export function PublishForm({
  versionId,
  disabled,
  alreadyPublished,
}: {
  versionId: string;
  disabled: boolean;
  alreadyPublished: boolean;
}) {
  const [state, action, pending] = useActionState(
    publishQuestionVersion,
    initialReviewerActionState,
  );

  return (
    <form action={action}>
      <input type="hidden" name="versionId" value={versionId} />
      <p className="mb-4 text-sm leading-6 text-[#52676a]">
        Publication is separate from approval. It activates this exact version
        for learner selection and retires any previously published version.
      </p>
      <button
        disabled={pending || disabled || alreadyPublished}
        type="submit"
        className="rounded-lg bg-[#15383a] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending
          ? "Publishing…"
          : alreadyPublished
            ? "Currently published"
            : "Publish approved version"}
      </button>
      <p aria-live="polite" className="mt-3 text-xs text-emerald-700">
        {state.message}
      </p>
    </form>
  );
}

export function LearnerReportTriageForm({
  reportId,
  questionVersionId,
  currentStatus,
}: {
  reportId: string;
  questionVersionId: string;
  currentStatus: "OPEN" | "RESOLVED" | "WONT_FIX";
}) {
  const [state, action, pending] = useActionState(
    triageLearnerQuestionReport,
    initialReviewerActionState,
  );

  return (
    <form
      action={action}
      className="mt-3 grid gap-3 border-t border-[#e2e6e2] pt-3"
    >
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="questionVersionId" value={questionVersionId} />
      <label className="text-xs font-bold text-[#52676a]">
        Triage status
        <select
          name="status"
          defaultValue={currentStatus}
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
        >
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="WONT_FIX">Won&apos;t fix</option>
        </select>
      </label>
      <label className="text-xs font-bold text-[#52676a]">
        Triage evidence
        <textarea
          name="notes"
          required
          minLength={5}
          maxLength={5_000}
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm leading-6"
          placeholder="Record what was checked and why this status is appropriate."
        />
      </label>
      <ActionFooter
        state={state}
        pending={pending}
        label="Append triage event"
      />
    </form>
  );
}

export function RevisionForm({
  versionId,
  prompt,
  choices,
  answerSpec,
  verificationSpec,
  commonMisconceptions,
  misconceptionRules,
  tutorGuidance,
  explanation,
  distractorRationales,
  difficulty,
  difficultyRationale,
  estimatedSeconds,
}: {
  versionId: string;
  prompt: string;
  choices: QuestionChoice[] | null;
  answerSpec: AnswerSpec;
  verificationSpec: MathVerificationSpec | null;
  commonMisconceptions: string[];
  misconceptionRules: MisconceptionRule[];
  tutorGuidance: TutorGuidance | null;
  explanation: string;
  distractorRationales: DistractorRationales;
  difficulty: string;
  difficultyRationale: string;
  estimatedSeconds: number;
}) {
  const [state, action, pending] = useActionState(
    createQuestionRevision,
    initialReviewerActionState,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="versionId" value={versionId} />
      <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
        Saving creates a new version. This record remains unchanged, and the new
        version starts without review decisions or validator evidence.
      </p>
      <label className="block text-xs font-bold text-[#52676a]">
        Prompt
        <textarea
          name="prompt"
          required
          rows={4}
          defaultValue={prompt}
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
        />
      </label>
      <div className="grid gap-4 lg:grid-cols-2">
        <JsonField
          name="choicesJson"
          label="Choices JSON"
          value={choices ?? undefined}
          required={Boolean(choices)}
        />
        <JsonField
          name="answerSpecJson"
          label="Answer specification JSON"
          value={answerSpec}
        />
        <JsonField
          name="verificationSpecJson"
          label="Math verification specification JSON"
          value={verificationSpec}
        />
        <JsonField
          name="misconceptionRulesJson"
          label="Misconception attribution rules JSON"
          value={misconceptionRules}
        />
        <JsonField
          name="commonMisconceptionsJson"
          label="Declared misconception codes JSON"
          value={commonMisconceptions}
        />
        <JsonField
          name="tutorGuidanceJson"
          label="Tutor guidance JSON"
          value={tutorGuidance}
        />
      </div>
      <label className="block text-xs font-bold text-[#52676a]">
        Explanation
        <textarea
          name="explanation"
          required
          rows={5}
          defaultValue={explanation}
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
        />
      </label>
      <JsonField
        name="distractorRationalesJson"
        label="Distractor rationales JSON"
        value={distractorRationales}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold text-[#52676a]">
          Difficulty
          <select
            name="difficulty"
            defaultValue={difficulty}
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          >
            {["FOUNDATIONAL", "DEVELOPING", "PROFICIENT", "ADVANCED"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <label className="text-xs font-bold text-[#52676a] sm:col-span-2">
          Difficulty rationale
          <input
            name="difficultyRationale"
            required
            minLength={5}
            defaultValue={difficultyRationale}
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          />
        </label>
        <label className="text-xs font-bold text-[#52676a]">
          Estimated seconds
          <input
            name="estimatedSeconds"
            type="number"
            min="10"
            max="3600"
            required
            defaultValue={estimatedSeconds}
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          />
        </label>
      </div>
      <ActionFooter
        state={state}
        pending={pending}
        label="Create new version"
      />
    </form>
  );
}

export function RegenerationRequestForm({
  versionId,
  templates,
}: {
  versionId: string;
  templates: {
    id: string;
    templateKey: string;
    version: number;
    difficulty: string;
  }[];
}) {
  const [state, action, pending] = useActionState(
    requestQuestionRegeneration,
    initialReviewerActionState,
  );

  if (!templates.length) {
    return (
      <p className="text-sm leading-6 text-[#52676a]">
        No matching template is approved. Review and approve a versioned
        template in the generation console before requesting model-assisted
        work.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="sourceQuestionVersionId" value={versionId} />
      <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
        This queues an auditable request. Any future result must create a new
        complete DRAFT version and pass every validator and human review gate.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-[#52676a]">
          Approved template
          <select
            name="templateId"
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.templateKey} v{template.version} ·{" "}
                {template.difficulty}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[#52676a]">
          Regeneration scope
          <select
            name="requestKind"
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          >
            <option value="FULL_REVISION">Full question revision</option>
            <option value="EXPLANATION_ONLY">Explanation only</option>
            <option value="DISTRACTORS_ONLY">Distractors only</option>
          </select>
        </label>
      </div>
      <label className="block text-xs font-bold text-[#52676a]">
        Reviewer instruction
        <textarea
          name="reviewerInstruction"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm font-normal"
          placeholder="Describe the specific reviewed issue this candidate should address."
        />
      </label>
      <label className="block text-xs font-bold text-[#52676a] sm:max-w-xs">
        Maximum provider cost (micros of USD)
        <input
          name="maxCostMicros"
          type="number"
          min="0"
          max="5000000"
          defaultValue="50000"
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm font-normal"
        />
      </label>
      <label className="flex gap-2 text-xs leading-5 text-[#52676a]">
        <input
          required
          type="checkbox"
          name="noSourceTextAttestation"
          className="mt-1"
        />
        I confirm this instruction contains no third-party question wording,
        values, answer choices, or distinctive structure.
      </label>
      <ActionFooter
        state={state}
        pending={pending}
        label="Queue regeneration request"
      />
    </form>
  );
}

function JsonField({
  name,
  label,
  value,
  required = true,
}: {
  name: string;
  label: string;
  value: unknown;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-bold text-[#52676a]">
      {label}
      <textarea
        name={name}
        required={required}
        rows={8}
        defaultValue={value === undefined ? "" : JSON.stringify(value, null, 2)}
        spellCheck={false}
        className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-[#f8faf8] px-3 py-2.5 font-mono text-xs leading-5"
      />
    </label>
  );
}

function Attestation({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-start gap-2 text-xs leading-5 text-[#52676a]">
      <input
        type="checkbox"
        name={name}
        required
        className="mt-1 size-4 accent-[#116b65]"
      />
      <span>{label}</span>
    </label>
  );
}

function ActionFooter({
  state,
  pending,
  label,
  disabled = false,
}: {
  state: { status: string; message: string };
  pending: boolean;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        disabled={pending || disabled}
        type="submit"
        className="rounded-lg bg-[#116b65] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : label}
      </button>
      <p
        aria-live="polite"
        className={`text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}
      >
        {state.message}
      </p>
    </div>
  );
}

function formatValidatorLabel(key: string) {
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
