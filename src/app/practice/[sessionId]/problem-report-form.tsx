"use client";

import { useActionState } from "react";

import { LEARNER_REPORT_CATEGORIES } from "@/lib/practice/contracts";

import { submitQuestionReport, type PracticeActionState } from "../actions";

const initialState: PracticeActionState = { status: "idle", message: "" };

const labels: Record<(typeof LEARNER_REPORT_CATEGORIES)[number], string> = {
  MATHEMATICAL_ERROR: "The math or answer is wrong",
  AMBIGUITY: "The wording is ambiguous",
  DISTRACTOR_QUALITY: "An answer choice is problematic",
  EXPLANATION_QUALITY: "The explanation is unclear",
  ACCESSIBILITY: "I found an accessibility barrier",
  FORMATTING: "The formatting is broken",
  OTHER: "Something else",
};

export function ProblemReportForm({
  questionVersionId,
  attemptId,
}: {
  questionVersionId: string;
  attemptId: string;
}) {
  const [state, action, pending] = useActionState(
    submitQuestionReport,
    initialState,
  );

  return (
    <details className="rounded-xl border border-[#d8ded9] bg-white p-4">
      <summary className="cursor-pointer text-sm font-bold text-[#116b65]">
        Report a problem with this question
      </summary>
      <form action={action} className="mt-4 grid gap-4">
        <input
          type="hidden"
          name="questionVersionId"
          value={questionVersionId}
        />
        <input type="hidden" name="attemptId" value={attemptId} />
        <label className="text-xs font-bold text-[#52676a]">
          Issue category
          <select
            name="category"
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          >
            {LEARNER_REPORT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {labels[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[#52676a]">
          What should the reviewer inspect?
          <textarea
            name="details"
            required
            minLength={10}
            maxLength={5_000}
            rows={4}
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm leading-6"
            placeholder="Describe the exact wording, answer, explanation, or display issue."
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-[#116b65] px-4 py-2.5 text-sm font-bold text-[#116b65] disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Saving report…" : "Send report to review"}
          </button>
          <p
            aria-live="polite"
            className={`text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}
          >
            {state.message}
          </p>
        </div>
      </form>
    </details>
  );
}
