"use client";

import { useActionState } from "react";

import {
  finishPracticeTestSession,
  setPracticeItemReviewFlag,
  type PracticeActionState,
} from "../actions";

const initialState: PracticeActionState = { status: "idle", message: "" };

export function PracticeTestControls({
  sessionId,
  sessionItemId,
  flagged,
  answeredCount,
  questionCount,
}: {
  sessionId: string;
  sessionItemId: string;
  flagged: boolean;
  answeredCount: number;
  questionCount: number;
}) {
  const [flagState, flagAction, flagPending] = useActionState(
    setPracticeItemReviewFlag,
    initialState,
  );
  const [finishState, finishAction, finishPending] = useActionState(
    finishPracticeTestSession,
    initialState,
  );

  return (
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#d6ddd7] bg-[#fffdf8] p-4">
      <form action={flagAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="sessionItemId" value={sessionItemId} />
        <input
          type="hidden"
          name="flagged"
          value={flagged ? "false" : "true"}
        />
        <button
          type="submit"
          disabled={flagPending}
          className="rounded-lg border border-[#aebdb6] bg-white px-4 py-2 text-sm font-bold disabled:opacity-50"
        >
          {flagPending
            ? "Saving…"
            : flagged
              ? "Remove review mark"
              : "Mark for review"}
        </button>
        <p aria-live="polite" className="mt-2 text-xs text-[#587073]">
          {flagState.message}
        </p>
      </form>

      <details className="text-right text-sm">
        <summary className="cursor-pointer font-bold text-[#116b65]">
          Submit test
        </summary>
        <form action={finishAction} className="mt-3">
          <input type="hidden" name="sessionId" value={sessionId} />
          <p className="mb-3 max-w-xs text-xs leading-5 text-[#587073]">
            {answeredCount} of {questionCount} answers are saved. Unanswered
            questions will remain unscored.
          </p>
          <button
            type="submit"
            disabled={finishPending}
            className="rounded-lg bg-[#15383a] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {finishPending ? "Submitting…" : "Confirm submission"}
          </button>
          <p aria-live="polite" className="mt-2 text-xs text-red-700">
            {finishState.message}
          </p>
        </form>
      </details>
    </div>
  );
}
