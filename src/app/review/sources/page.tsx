import { getSourceRegistry } from "@/data/content-governance";

import {
  CoverageObservationForm,
  SourcePolicyRecheckForm,
  SourceRegistrationForm,
} from "./source-forms";

const sourceDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export default async function SourceRegistryPage() {
  const registry = await getSourceRegistry();
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
        Content governance
      </p>
      <h1 className="mt-2 font-serif text-4xl tracking-[-0.03em]">
        Source and rights register
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5b7073]">
        Register a source before analysis. Permissions are derived from the
        reviewed decision; this form cannot independently enable storage,
        quotation, or model input.
      </p>

      <section
        className="mt-6 grid gap-3 sm:grid-cols-3"
        aria-label="Source recheck queue"
      >
        <RecheckMetric
          label="Overdue"
          value={registry.recheckSummary.overdue}
          tone="urgent"
        />
        <RecheckMetric
          label="Due in 30 days"
          value={registry.recheckSummary.dueSoon}
          tone="warning"
        />
        <RecheckMetric
          label="Unscheduled"
          value={registry.recheckSummary.unscheduled}
          tone="neutral"
        />
      </section>

      <section className="mt-7 rounded-2xl border border-[#d8ded9] bg-[#fffdf8] p-5 shadow-sm">
        <h2 className="font-serif text-2xl">Register a source</h2>
        <p className="mt-2 text-xs leading-5 text-[#687a7c]">
          Gated, paid, and user-submitted material fails closed unless a
          compatible license or written permission is recorded.
        </p>
        <SourceRegistrationForm />
      </section>

      <section className="mt-7 space-y-4" aria-label="Registered sources">
        {registry.sources.map((source) => (
          <article
            key={source.id}
            className="rounded-2xl border border-[#d8ded9] bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <div className="flex flex-wrap gap-2 text-[11px] font-bold tracking-wide uppercase text-[#5e7274]">
                  <span className={recheckTone(source.recheckStatus)}>
                    {source.recheckStatus.replaceAll("_", " ")}
                  </span>
                  <span>·</span>
                  <span>{source.decision.replaceAll("_", " ")}</span>
                  <span>·</span>
                  <span>{source.accessClass.replaceAll("_", " ")}</span>
                  <span>·</span>
                  <span>{source.artifactType.replaceAll("_", " ")}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold">{source.title}</h2>
                <p className="mt-1 text-sm text-[#5b7073]">
                  {source.publisher}
                </p>
                <a
                  href={source.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-xs text-[#116b65] underline"
                >
                  {source.canonicalUrl}
                </a>
              </div>
              <div className="rounded-xl bg-[#edf3ef] px-4 py-3 text-xs leading-5 text-[#385b59]">
                <strong>{source.observationCount}</strong> abstract observations
                <br />
                Metadata: {source.allowMetadata ? "allowed" : "blocked"}
                <br />
                Coverage: {source.allowCoverageAnalysis ? "allowed" : "blocked"}
                <br />
                Quotation: {source.allowQuotation ? "allowed" : "blocked"}
                <br />
                Storage: {source.allowStorage ? "allowed" : "blocked"}
                <br />
                Model input: {source.allowModelInput ? "allowed" : "blocked"}
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-[#faf9f4] px-3 py-2 text-xs leading-5 text-[#52676a]">
              {source.decisionRationale}
            </p>
            <dl className="mt-3 grid gap-2 text-xs text-[#52676a] sm:grid-cols-2">
              <div>
                <dt className="font-bold">Rights evidence</dt>
                <dd className="mt-0.5">
                  {source.termsUrl ? (
                    <a
                      href={source.termsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#116b65] underline"
                    >
                      Reviewed terms
                    </a>
                  ) : (
                    "No terms URL recorded"
                  )}
                  {source.statedLicense
                    ? ` · ${source.statedLicense}`
                    : " · No reuse license recorded"}
                </dd>
              </div>
              <div>
                <dt className="font-bold">Review dates</dt>
                <dd className="mt-0.5">
                  Last reviewed{" "}
                  {sourceDateFormatter.format(new Date(source.accessedAt))}
                  {source.recheckAt
                    ? ` · Recheck by ${sourceDateFormatter.format(new Date(source.recheckAt))}`
                    : " · No recheck scheduled"}
                </dd>
              </div>
            </dl>
            <details className="mt-3 text-xs text-[#52676a]">
              <summary className="cursor-pointer font-bold">
                Policy audit history ({source.reviews.length})
              </summary>
              {source.reviews.length ? (
                <ol className="mt-2 space-y-2">
                  {source.reviews.map((review) => (
                    <li
                      key={review.id}
                      className="rounded-lg border border-[#e0e5e1] bg-[#faf9f4] px-3 py-2"
                    >
                      <strong>{review.reviewKind.toLowerCase()}</strong>
                      <span> · </span>
                      {review.resultingPolicy.decision
                        .toLowerCase()
                        .replaceAll("_", " ")}
                      <span> · </span>
                      {sourceDateFormatter.format(new Date(review.reviewedAt))}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2">
                  Legacy record; no immutable policy events are available yet.
                </p>
              )}
            </details>
            <SourcePolicyRecheckForm source={source} />
            {source.allowCoverageAnalysis && (
              <CoverageObservationForm
                sourceArtifactId={source.id}
                skills={registry.skills}
              />
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

function RecheckMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "urgent" | "warning" | "neutral";
}) {
  const toneClasses = {
    urgent: "border-red-200 bg-red-50 text-red-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    neutral: "border-slate-200 bg-slate-50 text-slate-800",
  };
  return (
    <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
      <strong className="text-2xl">{value}</strong>
      <p className="mt-1 text-xs font-bold tracking-wide uppercase">{label}</p>
    </div>
  );
}

function recheckTone(status: string) {
  if (status === "OVERDUE") return "text-red-700";
  if (status === "DUE_SOON") return "text-amber-700";
  return "text-[#5e7274]";
}
