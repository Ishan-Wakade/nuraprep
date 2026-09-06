"use client";

import { useActionState } from "react";

import {
  createValidatorRuleRevision,
  type ValidatorRuleActionState,
} from "./actions";

const initialState: ValidatorRuleActionState = {
  status: "idle",
  message: "",
};

export function ValidatorRuleRevisionForm({
  ruleKey,
  currentVersion,
  currentDescription,
}: {
  ruleKey: string;
  currentVersion: number;
  currentDescription: string;
}) {
  const [state, action, pending] = useActionState(
    createValidatorRuleRevision,
    initialState,
  );

  return (
    <details className="mt-4 border-t border-[#e0e5e1] pt-4">
      <summary className="cursor-pointer text-xs font-bold text-[#116b65]">
        Draft version {currentVersion + 1}
      </summary>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="key" value={ruleKey} />
        <label className="block text-xs font-bold text-[#52676a]">
          Revised rubric description
          <textarea
            name="description"
            required
            minLength={40}
            maxLength={5000}
            rows={4}
            defaultValue={currentDescription}
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm font-normal"
          />
        </label>
        <label className="block text-xs font-bold text-[#52676a]">
          Change rationale
          <textarea
            name="changeNotes"
            required
            minLength={40}
            maxLength={5000}
            rows={3}
            placeholder="Explain the evidence and intended review behavior behind this rubric change."
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm font-normal"
          />
        </label>
        <label className="flex gap-2 text-xs leading-5 text-[#52676a]">
          <input
            required
            type="checkbox"
            name="invalidateEvidenceAttestation"
            className="mt-1"
          />
          I understand that activating this version retires the current rubric
          and all prior passes for this rule stop satisfying publication.
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#116b65] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending
            ? "Activating…"
            : `Activate ${ruleKey} v${currentVersion + 1}`}
        </button>
        <p
          aria-live="polite"
          className={`text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}
        >
          {state.message}
        </p>
      </form>
    </details>
  );
}
