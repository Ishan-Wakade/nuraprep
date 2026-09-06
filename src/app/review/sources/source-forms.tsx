"use client";

import { useActionState } from "react";

import {
  recordCoverageObservation,
  recheckSourcePolicy,
  registerSource,
  type GovernanceActionState,
} from "./actions";

const initialState: GovernanceActionState = { status: "idle", message: "" };

export function SourceRegistrationForm() {
  const [state, action, pending] = useActionState(registerSource, initialState);
  return (
    <form action={action} className="mt-5 grid gap-4 lg:grid-cols-2">
      <Field label="Canonical HTTPS URL" name="canonicalUrl" type="url" />
      <Field label="Publisher" name="publisher" />
      <Field label="Title" name="title" />
      <Field
        label="Artifact type"
        name="artifactType"
        placeholder="CONTENT_OUTLINE"
      />
      <Select
        label="Access class"
        name="accessClass"
        options={[
          "PUBLIC",
          "OPEN_LICENSED",
          "ACCOUNT_GATED",
          "PAID",
          "USER_SUBMITTED",
        ]}
      />
      <Select
        label="Policy decision"
        name="decision"
        options={[
          "METADATA_ONLY",
          "COVERAGE_ANALYSIS",
          "LICENSED_STORAGE",
          "EXCLUDED",
          "QUARANTINED",
        ]}
      />
      <Field
        label="Stated license or written permission"
        name="statedLicense"
        required={false}
      />
      <Field label="Terms URL" name="termsUrl" type="url" required={false} />
      <Field
        label="Robots/access summary"
        name="robotsSummary"
        required={false}
      />
      <Field
        label="Recheck date"
        name="recheckAt"
        type="date"
        required={false}
      />
      <label className="text-xs font-bold text-[#52676a] lg:col-span-2">
        Decision rationale
        <textarea
          name="decisionRationale"
          required
          minLength={20}
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm font-normal"
          placeholder="Record what may be retained or analyzed and why."
        />
      </label>
      <ActionResult state={state} pending={pending} label="Register source" />
    </form>
  );
}

export function CoverageObservationForm({
  sourceArtifactId,
  skills,
}: {
  sourceArtifactId: string;
  skills: { id: string; code: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(
    recordCoverageObservation,
    initialState,
  );
  return (
    <form
      action={action}
      className="mt-4 space-y-3 border-t border-[#e0e5e1] pt-4"
    >
      <input type="hidden" name="sourceArtifactId" value={sourceArtifactId} />
      <label className="block text-xs font-bold text-[#52676a]">
        Mapped skill
        <select
          name="skillId"
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2 text-sm"
        >
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.title}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-bold text-[#52676a]">
        Abstract coverage observation
        <textarea
          name="observation"
          required
          minLength={20}
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2 text-sm font-normal"
          placeholder="Describe the high-level skill coverage without retaining question text or structure."
        />
      </label>
      <label className="flex gap-2 text-xs leading-5 text-[#52676a]">
        <input
          required
          type="checkbox"
          name="abstractOnlyAttestation"
          className="mt-1"
        />
        I confirm this is my own abstract note and contains no source-question
        wording, values, choices, or distinctive structure.
      </label>
      <ActionResult
        state={state}
        pending={pending}
        label="Record observation"
      />
    </form>
  );
}

export function SourcePolicyRecheckForm({
  source,
}: {
  source: {
    id: string;
    accessClass: string;
    decision: string;
    statedLicense: string | null;
    termsUrl: string | null;
    robotsSummary: string | null;
    decisionRationale: string;
    recheckAt: string | null;
  };
}) {
  const [state, action, pending] = useActionState(
    recheckSourcePolicy,
    initialState,
  );

  return (
    <details className="mt-4 border-t border-[#e0e5e1] pt-4">
      <summary className="cursor-pointer text-xs font-bold text-[#116b65]">
        Record policy recheck
      </summary>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="sourceArtifactId" value={source.id} />
        <Select
          label="Rechecked access class"
          name="accessClass"
          defaultValue={source.accessClass}
          options={[
            "PUBLIC",
            "OPEN_LICENSED",
            "ACCOUNT_GATED",
            "PAID",
            "USER_SUBMITTED",
          ]}
        />
        <Select
          label="Rechecked policy decision"
          name="decision"
          defaultValue={source.decision}
          options={[
            "METADATA_ONLY",
            "COVERAGE_ANALYSIS",
            "LICENSED_STORAGE",
            "EXCLUDED",
            "QUARANTINED",
          ]}
        />
        <Field
          label="Rechecked license or permission"
          name="statedLicense"
          required={false}
          defaultValue={source.statedLicense ?? ""}
        />
        <Field
          label="Rechecked terms URL"
          name="termsUrl"
          type="url"
          required={false}
          defaultValue={source.termsUrl ?? ""}
        />
        <Field
          label="Rechecked robots/access summary"
          name="robotsSummary"
          required={false}
          defaultValue={source.robotsSummary ?? ""}
        />
        <Field
          label="Next recheck date"
          name="nextRecheckAt"
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          required
          defaultValue={source.recheckAt?.slice(0, 10) ?? ""}
        />
        <label className="text-xs font-bold text-[#52676a] sm:col-span-2">
          Recheck rationale
          <textarea
            name="decisionRationale"
            required
            minLength={20}
            rows={3}
            defaultValue={source.decisionRationale}
            className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm font-normal"
          />
        </label>
        <label className="flex gap-2 text-xs leading-5 text-[#52676a] sm:col-span-2">
          <input
            required
            type="checkbox"
            name="rightsEvidenceAttestation"
            className="mt-1"
          />
          I reviewed the current access state, terms or license evidence, and
          selected the conservative policy decision shown above.
        </label>
        <ActionResult
          state={state}
          pending={pending}
          label="Save policy recheck"
        />
      </form>
    </details>
  );
}

function Field({
  label,
  required = true,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="text-xs font-bold text-[#52676a]">
      {label}
      <input
        {...props}
        required={required}
        className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm font-normal"
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <label className="text-xs font-bold text-[#52676a]">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm font-normal"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.toLocaleLowerCase("en-US").replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionResult({
  state,
  pending,
  label,
}: {
  state: GovernanceActionState;
  pending: boolean;
  label: string;
}) {
  return (
    <div className="lg:col-span-2">
      <button
        disabled={pending}
        className="rounded-lg bg-[#116b65] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        type="submit"
      >
        {pending ? "Saving…" : label}
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
