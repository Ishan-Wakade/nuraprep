"use client";

import { useActionState } from "react";

import { startAdaptiveSession, type PracticeActionState } from "../actions";

const initialState: PracticeActionState = { status: "idle", message: "" };

export function AdaptiveStartForm({
  availableQuestionCount,
}: {
  availableQuestionCount: number;
}) {
  const [state, action, pending] = useActionState(
    startAdaptiveSession,
    initialState,
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-4">
      <label className="text-sm font-bold">
        Session length
        <select
          name="questionCount"
          defaultValue="5"
          className="mt-2 block rounded-xl border border-[#cdd7d0] bg-white px-4 py-3 font-normal"
        >
          <option value="3">Up to 3 questions</option>
          <option value="5">Up to 5 questions</option>
          <option value="10">Up to 10 questions</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending || availableQuestionCount === 0}
        className="button button-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Prioritizing…" : "Start adaptive practice"}
      </button>
      <p
        aria-live="polite"
        className={`w-full text-sm ${state.status === "error" ? "text-red-700" : "text-[#587073]"}`}
      >
        {state.message}
      </p>
    </form>
  );
}
