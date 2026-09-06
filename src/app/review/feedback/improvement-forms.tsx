"use client";

import { useActionState } from "react";

import {
  createImprovementProposal,
  decideImprovementProposal,
  type ImprovementActionState,
} from "./actions";

const initialState: ImprovementActionState = { status: "idle", message: "" };

export function ImprovementProposalForm({
  patternKey,
  category,
}: {
  patternKey: string;
  category: string;
}) {
  const [state, action, pending] = useActionState(
    createImprovementProposal,
    initialState,
  );
  return (
    <details className="mt-4 border-t border-[#d8ded9] pt-3">
      <summary className="cursor-pointer text-xs font-bold text-[#116b65]">
        Draft an improvement proposal
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="patternKey" value={patternKey} />
        <input type="hidden" name="category" value={category} />
        <Field
          label="Proposal title"
          name="title"
          placeholder={`Address ${formatLabel(patternKey)}`}
          minLength={8}
          maxLength={240}
        />
        <label className="block text-xs font-bold text-[#52676a]">
          Change target
          <select
            name="target"
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2 text-sm"
          >
            {[
              "GENERATION_TEMPLATE",
              "VALIDATOR_RULE",
              "DIFFICULTY_RUBRIC",
              "EVALUATION_CASE",
              "CONTENT_POLICY",
            ].map((target) => (
              <option key={target} value={target}>
                {formatLabel(target)}
              </option>
            ))}
          </select>
        </label>
        <TextArea
          label="Evidence-backed problem summary"
          name="problemSummary"
          placeholder="Summarize the recurring failure without treating reports as already-proven facts."
        />
        <TextArea
          label="Proposed change"
          name="proposedChange"
          placeholder="Describe the smallest template, rule, rubric, case, or policy change to review."
        />
        <TextArea
          label="Regression plan"
          name="regressionPlan"
          placeholder="Specify positive and negative cases that must pass before implementation."
        />
        <ActionResult
          state={state}
          pending={pending}
          pendingLabel="Creating…"
          label="Create draft proposal"
        />
      </form>
    </details>
  );
}

export function ImprovementDecisionForm({
  proposalId,
}: {
  proposalId: string;
}) {
  const [state, action, pending] = useActionState(
    decideImprovementProposal,
    initialState,
  );
  return (
    <form
      action={action}
      className="mt-4 grid gap-3 border-t border-[#d8ded9] pt-4 sm:grid-cols-[180px_1fr_auto] sm:items-end"
    >
      <input type="hidden" name="proposalId" value={proposalId} />
      <label className="text-xs font-bold text-[#52676a]">
        Decision
        <select
          name="decision"
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
        >
          <option value="APPROVED">Approve plan</option>
          <option value="REJECTED">Reject</option>
        </select>
      </label>
      <Field
        label="Decision notes"
        name="notes"
        placeholder="Record why this plan should or should not proceed."
        minLength={20}
        maxLength={5_000}
      />
      <button
        disabled={pending}
        type="submit"
        className="rounded-lg bg-[#116b65] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Record decision"}
      </button>
      <p
        aria-live="polite"
        className={`text-xs sm:col-span-3 ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}
      >
        {state.message}
      </p>
    </form>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-xs font-bold text-[#52676a]">
      {label}
      <input
        {...props}
        required
        className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm font-normal"
      />
    </label>
  );
}

function TextArea({
  label,
  ...props
}: React.ComponentProps<"textarea"> & {
  label: string;
}) {
  return (
    <label className="block text-xs font-bold text-[#52676a]">
      {label}
      <textarea
        {...props}
        required
        minLength={20}
        maxLength={5_000}
        rows={3}
        className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm font-normal"
      />
    </label>
  );
}

function ActionResult({
  state,
  pending,
  label,
  pendingLabel,
}: {
  state: ImprovementActionState;
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <div>
      <button
        disabled={pending}
        type="submit"
        className="rounded-lg bg-[#116b65] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
      >
        {pending ? pendingLabel : label}
      </button>
      <p
        aria-live="polite"
        className={`mt-2 text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}
      >
        {state.message}
      </p>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/(^|\s)\S/g, (letter) => letter.toLocaleUpperCase("en-US"));
}
