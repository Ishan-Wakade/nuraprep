"use client";

import { useActionState } from "react";

import {
  approveGenerationTemplate,
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
