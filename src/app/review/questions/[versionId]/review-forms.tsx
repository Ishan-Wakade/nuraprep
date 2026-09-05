"use client";

import { useActionState } from "react";

import type {
  QuestionChoice,
  AnswerSpec,
  DistractorRationales,
} from "@/lib/questions/contracts";

import {
  createQuestionRevision,
  submitReviewDecision,
  submitReviewerFeedback,
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

export function RevisionForm({
  versionId,
  prompt,
  choices,
  answerSpec,
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
