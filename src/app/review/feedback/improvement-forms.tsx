"use client";

import { useActionState, useState } from "react";

import {
  createImprovementProposal,
  decideImprovementProposal,
  implementApprovedTemplateProposal,
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

type TemplateOption = {
  id: string;
  templateKey: string;
  version: number;
  status: "DRAFT" | "APPROVED" | "RETIRED";
  skillTitle: string;
  questionType: string;
  difficulty: string;
  instructions: string;
  parameterConstraints: Record<string, unknown>;
  prohibitedPatterns: string[];
  validatorContract: Record<string, unknown>;
};

export function TemplateProposalImplementationForm({
  proposalId,
  templates,
}: {
  proposalId: string;
  templates: TemplateOption[];
}) {
  const [state, action, pending] = useActionState(
    implementApprovedTemplateProposal,
    initialState,
  );
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const selected = templates.find((template) => template.id === selectedId);

  if (!selected) {
    return (
      <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        No active generation template is available as a revision base.
      </p>
    );
  }

  return (
    <details className="mt-4 rounded-xl border border-[#c9d9d3] bg-[#f4faf7] p-4">
      <summary className="cursor-pointer text-sm font-bold text-[#116b65]">
        Implement as a draft template revision
      </summary>
      <p className="mt-2 text-xs leading-5 text-[#52676a]">
        This creates a new immutable draft. It cannot generate questions until a
        reviewer separately approves that template revision.
      </p>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="proposalId" value={proposalId} />
        <label className="block text-xs font-bold text-[#52676a]">
          Latest base template
          <select
            name="baseTemplateId"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.templateKey} v{template.version} · {template.status} ·{" "}
                {template.skillTitle}
              </option>
            ))}
          </select>
        </label>
        <div
          key={selected.id}
          className="grid gap-3 rounded-xl border border-[#d8ded9] bg-white p-3 lg:grid-cols-2"
        >
          <p className="text-xs leading-5 text-[#52676a] lg:col-span-2">
            Scope is locked to {formatLabel(selected.questionType)},{" "}
            {formatLabel(selected.difficulty)}, and {selected.skillTitle}.
          </p>
          <TextArea
            label="Revised instructions"
            name="instructions"
            defaultValue={selected.instructions}
            rows={6}
            minLength={40}
            maxLength={20_000}
          />
          <JsonArea
            label="Parameter constraints JSON"
            name="parameterConstraints"
            value={selected.parameterConstraints}
          />
          <JsonArea
            label="Prohibited patterns JSON"
            name="prohibitedPatterns"
            value={selected.prohibitedPatterns}
          />
          <JsonArea
            label="Validator contract JSON"
            name="validatorContract"
            value={selected.validatorContract}
          />
        </div>
        <TextArea
          label="Implementation summary"
          name="implementationSummary"
          placeholder="Describe exactly how this revision implements the approved proposal."
        />
        <TextArea
          label="Regression evidence"
          name="regressionEvidence"
          placeholder="Record the named positive and adversarial checks run and their outcomes."
        />
        <label className="flex items-start gap-2 text-xs leading-5 text-[#52676a]">
          <input
            type="checkbox"
            name="regressionChecksAttested"
            required
            className="mt-1"
          />
          I performed the recorded regression checks and confirm this revision
          remains a draft pending separate approval.
        </label>
        <ActionResult
          state={state}
          pending={pending}
          pendingLabel="Creating draft…"
          label="Create linked draft revision"
        />
      </form>
    </details>
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

function JsonArea({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: Record<string, unknown> | string[];
}) {
  return (
    <label className="block text-xs font-bold text-[#52676a]">
      {label}
      <textarea
        name={name}
        required
        defaultValue={JSON.stringify(value, null, 2)}
        rows={6}
        spellCheck={false}
        className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 font-mono text-xs font-normal"
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
