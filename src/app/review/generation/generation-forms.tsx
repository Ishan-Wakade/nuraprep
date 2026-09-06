"use client";

import { useActionState } from "react";

import {
  approveGenerationTemplate,
  cancelPendingGenerationRun,
  type GenerationActionState,
} from "./actions";

const initialState: GenerationActionState = { status: "idle", message: "" };

export function TemplateApprovalForm({ templateId }: { templateId: string }) {
  const [state, action, pending] = useActionState(
    approveGenerationTemplate,
    initialState,
  );
  return (
    <form action={action} className="mt-4 border-t border-[#e0e5e1] pt-4">
      <input type="hidden" name="templateId" value={templateId} />
      <label className="block text-xs font-bold text-[#52676a]">
        Approval evidence
        <textarea
          name="approvalNotes"
          required
          minLength={20}
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2 text-sm font-normal"
          placeholder="Record the rubric, prohibited-pattern, and validator-contract checks performed."
        />
      </label>
      <button
        disabled={pending}
        type="submit"
        className="mt-3 rounded-lg bg-[#116b65] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {pending ? "Approving…" : "Approve template"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function GenerationCancellationForm({ runId }: { runId: string }) {
  const [state, action, pending] = useActionState(
    cancelPendingGenerationRun,
    initialState,
  );
  return (
    <details className="min-w-52">
      <summary className="cursor-pointer font-bold text-red-700 underline">
        Cancel request
      </summary>
      <form action={action} className="mt-2">
        <input type="hidden" name="runId" value={runId} />
        <label className="block text-[11px] font-bold text-[#52676a]">
          Cancellation reason
          <textarea
            name="reason"
            required
            minLength={20}
            maxLength={2_000}
            rows={3}
            className="mt-1 w-full rounded-lg border border-[#ccd5d0] bg-white px-2 py-1.5 text-xs font-normal"
            placeholder="Record why this queued request must not run."
          />
        </label>
        <button
          disabled={pending}
          type="submit"
          className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-800 disabled:opacity-50"
        >
          {pending ? "Cancelling…" : "Confirm cancellation"}
        </button>
        <Result state={state} />
      </form>
    </details>
  );
}

function Result({ state }: { state: GenerationActionState }) {
  return (
    <p
      aria-live="polite"
      className={`mt-2 text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}
    >
      {state.message}
    </p>
  );
}
