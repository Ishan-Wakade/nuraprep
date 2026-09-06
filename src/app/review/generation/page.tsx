import Link from "next/link";

import { getGenerationConsole } from "@/data/content-governance";

import { TemplateApprovalForm } from "./generation-forms";

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

      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        {consoleData.templates.map((template) => (
          <article
            key={template.id}
            className="rounded-2xl border border-[#d8ded9] bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-[#116b65] uppercase">
                  {template.status} · v{template.version}
                </p>
                <h2 className="mt-1 font-semibold">{template.templateKey}</h2>
                <p className="mt-1 text-xs text-[#687a7c]">
                  {template.skillTitle} ·{" "}
                  {template.questionType.replaceAll("_", " ")} ·{" "}
                  {template.difficulty}
                </p>
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-[#faf9f4] p-3 text-xs leading-5 text-[#52676a]">
              {template.instructions}
            </p>
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
                  <td className="px-4 py-3 font-bold">{run.status}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
