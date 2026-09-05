"use client";

import { useActionState } from "react";

import { startDiagnosticSession, type PracticeActionState } from "../actions";

const initialState: PracticeActionState = { status: "idle", message: "" };

export function DiagnosticStartForm({ skillCount }: { skillCount: number }) {
  const [state, action, pending] = useActionState(
    startDiagnosticSession,
    initialState,
  );

  const ready = skillCount >= 4;

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending || !ready}
        className="button button-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Building diagnostic…" : "Start diagnostic"}
      </button>
      <p
        aria-live="polite"
        className={`mt-3 text-sm ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}
      >
        {state.message}
      </p>
      {!ready && (
        <p className="mt-3 text-sm leading-6 text-amber-900">
          At least four distinct skills need a current published question. This
          database currently has {skillCount}.
        </p>
      )}
    </form>
  );
}
