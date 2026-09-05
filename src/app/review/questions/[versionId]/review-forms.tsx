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

import {
  createQuestionRevision,
  publishQuestionVersion,
  runDeterministicValidation,
  submitReviewDecision,
  submitReviewerFeedback,
  submitReviewerValidation,
  triageLearnerQuestionReport,
} from "../../actions";

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
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-[#52676a]">
          Decision
          <select
            name="decision"
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
            defaultValue="NEEDS_REVISION"
          >
            <option value="APPROVED">Approved</option>
            <option value="NEEDS_REVISION">Needs revision</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <div className="grid grid-cols-5 gap-2">
          {[
            ["mathematicalCorrectness", "Math"],
            ["clarity", "Clarity"],
            ["alignment", "Align"],
            ["accessibility", "A11y"],
            ["originality", "Original"],
          ].map(([name, label]) => (
            <label
              key={name}
              className="text-center text-[10px] font-bold text-[#52676a]"
            >
              {label}
              <select
                name={name}
                defaultValue="3"
                className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-1 py-2.5 text-center text-sm"
              >
                {[1, 2, 3, 4].map((score) => (
                  <option key={score}>{score}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
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

export function ReviewerValidationForm({ versionId }: { versionId: string }) {
  const [state, action, pending] = useActionState(
    submitReviewerValidation,
    initialReviewerActionState,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="versionId" value={versionId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-[#52676a]">
          Review check
          <select
            name="validatorKey"
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          >
            <option value="explanation-consistency">
              Explanation consistency
            </option>
            <option value="accessibility">Accessibility</option>
            <option value="topic-alignment">Topic alignment</option>
            <option value="originality">Originality</option>
          </select>
        </label>
        <label className="text-xs font-bold text-[#52676a]">
          Outcome
          <select
            name="outcome"
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          >
            <option value="PASS">Pass</option>
            <option value="FAIL">Fail</option>
          </select>
        </label>
      </div>
      <label className="block text-xs font-bold text-[#52676a]">
        Evidence
        <textarea
          name="evidence"
          required
          minLength={10}
          rows={4}
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          placeholder="Describe exactly what you inspected and why this check passes or fails."
        />
      </label>
      <label className="block text-xs font-bold text-[#52676a]">
        Failure code <span className="font-normal">(required on failure)</span>
        <input
          name="failureCode"
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm uppercase"
          placeholder="E.G. EXPLANATION_SKIPS_STEP"
        />
      </label>
      <ActionFooter
        state={state}
        pending={pending}
        label="Append review evidence"
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

function ActionFooter({
  state,
  pending,
  label,
}: {
  state: { status: string; message: string };
  pending: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        disabled={pending}
        type="submit"
        className="rounded-lg bg-[#116b65] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
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
