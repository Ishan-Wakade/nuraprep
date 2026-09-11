import Link from "next/link";

import { getGenerationConsole } from "@/data/content-governance";

import {
  GenerationCancellationForm,
  TemplateApprovalForm,
} from "./generation-forms";

export default async function GenerationConsolePage() {
  const consoleData = await getGenerationConsole();
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
        Controlled generation
      </p>
      <h1 className="mt-2 font-serif text-4xl tracking-[-0.03em]">
        Templates and generation requests
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5b7073]">
        Only approved, versioned templates may be dispatched. Requests are
        idempotent, cost-capped, and restricted to internal question versions
        plus human-authored abstract coverage notes.
      </p>

      <section className="mt-7" aria-labelledby="queue-health-heading">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-[#116b65] uppercase">
              Operations
            </p>
            <h2 id="queue-health-heading" className="mt-1 font-serif text-2xl">
              Queue health
            </h2>
          </div>
          <p className="text-xs text-[#52676a]">
            {consoleData.metrics.total} immutable run records
          </p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Ready / running"
            value={`${consoleData.metrics.pending} / ${consoleData.metrics.running}`}
            note="Queued and actively leased"
          />
          <MetricCard
            label="Stale leases"
            value={String(consoleData.metrics.staleLeases)}
            note={`${consoleData.metrics.retryExhausted} retry-exhausted failures recorded`}
            alert={consoleData.metrics.staleLeases > 0}
          />
          <MetricCard
            label="Active worst-case ceiling"
            value={formatDollars(consoleData.metrics.activeCeilingMicros)}
            note="Full ceilings, not forecast spend"
          />
          <MetricCard
            label="Recorded provider cost"
            value={formatDollars(consoleData.metrics.recordedCostMicros)}
            note="Run-reported estimate, not billing truth"
          />
          <MetricCard
            label="Terminal outcomes"
            value={`${consoleData.metrics.succeeded} / ${consoleData.metrics.failed} / ${consoleData.metrics.cancelled}`}
            note="Succeeded / failed / cancelled"
          />
        </div>
      </section>

      <section
        className="mt-7"
        aria-labelledby="deterministic-capacity-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-[#116b65] uppercase">
              No-cost expansion
            </p>
            <h2
              id="deterministic-capacity-heading"
              className="mt-1 font-serif text-2xl"
            >
              Deterministic draft capacity
            </h2>
          </div>
          <p className="max-w-xl text-xs leading-5 text-[#52676a]">
            Capacity is a pre-rejection engineering ceiling, not an approved
            bank size. Staged candidates stay invisible to learners until an
            exact-version human decision and publication event.
          </p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Versioned templates"
            value={String(consoleData.deterministicExpansion.templateCount)}
            note="Bounded structures across all Math leaf skills"
          />
          <MetricCard
            label="Declared structure ceiling"
            value={String(
              consoleData.deterministicExpansion.declaredStructureCapacity,
            )}
            note="Before validation and duplicate rejection"
          />
          <MetricCard
            label="Current staged drafts"
            value={String(consoleData.deterministicExpansion.stagedDraftCount)}
            note="Unreviewed and not learner-visible"
          />
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[#d8ded9] bg-white">
          <table
            className="w-full min-w-[520px] border-collapse text-left text-xs"
            aria-label="Deterministic capacity by internal difficulty"
          >
            <thead className="bg-[#edf3ef] text-[#385b59]">
              <tr>
                <th className="px-4 py-3 font-bold">Internal difficulty</th>
                <th className="px-4 py-3 text-right font-bold">
                  Structure ceiling
                </th>
                <th className="px-4 py-3 text-right font-bold">
                  Staged drafts
                </th>
              </tr>
            </thead>
            <tbody>
              {consoleData.deterministicExpansion.byDifficulty.map((band) => (
                <tr key={band.difficulty} className="border-t border-[#e0e5e1]">
                  <th className="px-4 py-3 font-semibold">
                    {titleCase(band.difficulty)}
                  </th>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {band.declaredStructureCapacity}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {band.stagedDraftCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        {consoleData.templates.map((template) => (
          <article
            key={template.id}
            id={`template-${template.id}`}
            className="rounded-2xl border border-[#d8ded9] bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-[#116b65] uppercase">
                  {template.status} · v{template.version}
                </p>
                <h2 className="mt-1 font-semibold">{template.templateKey}</h2>
                <p className="mt-1 text-xs text-[#52676a]">
                  {template.skillTitle} ·{" "}
                  {template.questionType.replaceAll("_", " ")} ·{" "}
                  {template.difficulty}
                </p>
                {template.structureCapacity !== null && (
                  <p className="mt-2 text-xs font-semibold text-[#116b65]">
                    {template.structureCapacity} declared structures ·{" "}
                    {template.stagedDraftCount} current drafts
                  </p>
                )}
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-[#faf9f4] p-3 text-xs leading-5 text-[#52676a]">
              {template.instructions}
            </p>
            {template.implementation && (
              <div className="mt-4 rounded-lg border border-[#c9d9d3] bg-[#f4faf7] p-3 text-xs leading-5">
                <p className="font-bold text-[#116b65]">
                  Linked controlled improvement
                </p>
                <p className="mt-1">{template.implementation.proposalTitle}</p>
                <p className="mt-1 text-[#52676a]">
                  {template.implementation.implementationSummary}
                </p>
                <p className="mt-1 text-[#52676a]">
                  <strong>Regression evidence:</strong>{" "}
                  {template.implementation.regressionEvidence}
                </p>
                <Link
                  href={`/review/feedback#proposal-${template.implementation.proposalId}`}
                  className="mt-2 inline-flex font-bold text-[#116b65] underline"
                >
                  Inspect approved proposal →
                </Link>
              </div>
            )}
            {template.status === "DRAFT" ? (
              <TemplateApprovalForm templateId={template.id} />
            ) : (
              <p className="mt-4 text-xs leading-5 text-[#52676a]">
                Approved by {template.approvedBy} at {template.approvedAt}.{" "}
                {template.approvalNotes}
              </p>
            )}
          </article>
        ))}
      </section>

      <section className="mt-9">
        <h2 className="font-serif text-2xl">Recent requests</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[#d8ded9] bg-white">
          <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
            <thead className="bg-[#edf3ef] text-[#385b59]">
              <tr>
                {[
                  "Status",
                  "Scope",
                  "Question",
                  "Template",
                  "Provider",
                  "Worker lease",
                  "Cost ceiling",
                  "Requested",
                  "Action / audit",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-bold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {consoleData.runs.map((run) => (
                <tr key={run.id} className="border-t border-[#e0e5e1]">
                  <td className="px-4 py-3 font-bold">
                    {run.status}
                    {run.failureCode && (
                      <span className="mt-1 block font-normal text-red-700">
                        {run.failureCode.replaceAll("_", " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {run.requestKind.replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    {run.sourceQuestionVersionId ? (
                      <Link
                        className="text-[#116b65] underline"
                        href={`/review/questions/${run.sourceQuestionVersionId}`}
                      >
                        {run.questionSlug ?? "source version"}
                      </Link>
                    ) : (
                      "New question"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {run.templateKey} v{run.templateVersion}
                  </td>
                  <td className="px-4 py-3">
                    {run.provider} / {run.model}
                  </td>
                  <td className="px-4 py-3">
                    {run.claimedBy ? (
                      <>
                        {run.claimedBy} · attempt {run.attemptCount}
                        <br />
                        until {run.leaseExpiresAt}
                      </>
                    ) : (
                      "Unclaimed"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    ${(run.maxCostMicros / 1_000_000).toFixed(4)}
                  </td>
                  <td className="px-4 py-3">{run.startedAt}</td>
                  <td className="px-4 py-3 align-top">
                    {run.status === "PENDING" ? (
                      <GenerationCancellationForm runId={run.id} />
                    ) : run.status === "CANCELLED" ? (
                      <p className="max-w-64 leading-5 text-[#52676a]">
                        Cancelled by {run.cancelledBy}: {run.cancellationReason}
                      </p>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  alert = false,
}: {
  label: string;
  value: string;
  note: string;
  alert?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ${alert ? "border-amber-400" : "border-[#d8ded9]"}`}
    >
      <p className="text-[11px] font-bold tracking-wide text-[#52676a] uppercase">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${alert ? "text-amber-800" : ""}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-[#52676a]">{note}</p>
    </article>
  );
}

function formatDollars(micros: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(micros / 1_000_000);
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLocaleLowerCase("en-US");
}
