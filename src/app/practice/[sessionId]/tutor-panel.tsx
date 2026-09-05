"use client";

import { useActionState } from "react";

import { requestTutorStep, type PracticeActionState } from "../actions";

const initialState: PracticeActionState = { status: "idle", message: "" };

export function TutorPanel({
  sessionId,
  sessionItemId,
  revealedSteps,
  remainingSteps,
}: {
  sessionId: string;
  sessionItemId: string;
  revealedSteps: {
    id: string;
    kind: "SOCRATIC_QUESTION" | "HINT";
    content: string;
  }[];
  remainingSteps: number;
}) {
  const [state, action, pending] = useActionState(
    requestTutorStep,
    initialState,
  );

  return (
    <section className="mt-7 rounded-xl border border-[#b9d4cb] bg-[#edf6f2] p-4 sm:p-5">
      <p className="text-[11px] font-bold tracking-[0.12em] text-[#116b65] uppercase">
        Hint-first tutor
      </p>
      <h3 className="mt-1 font-serif text-xl">
        Work it out one step at a time.
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#52676a]">
        Request a reviewed question or hint. The answer stays hidden until you
        submit your own response.
      </p>

      {revealedSteps.length > 0 && (
        <ol className="mt-4 space-y-3">
          {revealedSteps.map((step, index) => (
            <li
              key={step.id}
              className="rounded-lg border border-[#d3e2dc] bg-white p-4 text-sm leading-6"
            >
              <strong className="mr-2 text-[#116b65]">
                {step.kind === "SOCRATIC_QUESTION" ? "Question" : "Hint"}{" "}
                {index + 1}
              </strong>
              {step.content}
            </li>
          ))}
        </ol>
      )}

      <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="sessionItemId" value={sessionItemId} />
        <button
          type="submit"
          disabled={pending || remainingSteps === 0}
          className="rounded-lg border border-[#116b65] bg-white px-4 py-2.5 text-sm font-bold text-[#116b65] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? "Opening next step…"
            : remainingSteps > 0
              ? revealedSteps.length > 0
                ? "Show another hint"
                : "Ask for a hint"
              : "All reviewed hints shown"}
        </button>
        <p
          aria-live="polite"
          className={`text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}
        >
          {state.message}
        </p>
      </form>
    </section>
  );
}
