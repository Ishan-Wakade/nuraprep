"use client";

import { useActionState } from "react";

import { startPracticeTestSession, type PracticeActionState } from "../actions";

const initialState: PracticeActionState = { status: "idle", message: "" };

export function PracticeTestStartForm({ ready }: { ready: boolean }) {
  const [state, action, pending] = useActionState(
    startPracticeTestSession,
    initialState,
  );

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending || !ready}
        className="button button-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Assembling test…" : "Start timed Math test"}
      </button>
      <p
        aria-live="polite"
        className={`mt-3 max-w-xl text-sm ${state.status === "error" ? "text-red-700" : "text-[#587073]"}`}
      >
        {state.message}
      </p>
    </form>
  );
}
