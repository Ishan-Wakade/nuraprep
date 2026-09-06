import Link from "next/link";

import {
  getFeedbackOverview,
  type FeedbackOverviewFilters,
} from "@/data/reviewer";

import {
  ImprovementDecisionForm,
  ImprovementProposalForm,
} from "./improvement-forms";

const categories = [
  "MATHEMATICAL_ERROR",
  "AMBIGUITY",
  "ALIGNMENT",
  "DISTRACTOR_QUALITY",
  "EXPLANATION_QUALITY",
  "ACCESSIBILITY",
  "ORIGINALITY",
  "DIFFICULTY",
  "FORMATTING",
  "OTHER",
] as const;
const statuses = ["OPEN", "RESOLVED", "WONT_FIX"] as const;
const sources = ["LEARNER", "REVIEWER"] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FeedbackPatternsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters: FeedbackOverviewFilters = {
    query: single(params.q)?.trim() || undefined,
    category: categories.find((value) => value === single(params.category)),
    status: statuses.find((value) => value === single(params.status)),
    source: sources.find((value) => value === single(params.source)),
  };
  const overview = await getFeedbackOverview(filters);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
            Controlled improvement loop
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-[-0.03em]">
            Feedback patterns
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b7073]">
            Search learner reports and reviewer feedback together while keeping
            their original attribution and immutable question-version links.
          </p>
        </div>
        <span className="rounded-full border border-[#c9d9d3] bg-[#e8f3ef] px-3 py-2 text-xs font-semibold text-[#116b65]">
          {overview.summary.total} matching items
        </span>
      </div>

      <section
        className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-label="Feedback summary"
      >
        <SummaryCard label="Matching" value={overview.summary.total} />
        <SummaryCard label="Open" value={overview.summary.open} />
        <SummaryCard label="From learners" value={overview.summary.learner} />
        <SummaryCard label="From reviewers" value={overview.summary.reviewer} />
      </section>

      <form className="mt-6 grid gap-3 rounded-2xl border border-[#d8ded9] bg-[#fffdf8] p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4">
        <label className="lg:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-[#52676a]">
            Search feedback, prompt, slug, skill, or issue code
          </span>
          <input
            name="q"
            defaultValue={filters.query}
            className="w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
            placeholder="PLACE_VALUE_ERROR or unclear wording"
          />
        </label>
        <FilterSelect
          label="Source"
          name="source"
          value={filters.source}
          options={sources}
        />
        <FilterSelect
          label="Status"
          name="status"
          value={filters.status}
          options={statuses}
        />
        <FilterSelect
          label="Category"
          name="category"
          value={filters.category}
          options={categories}
        />
        <div className="flex items-end gap-2 lg:col-span-3">
          <button
            type="submit"
            className="rounded-lg bg-[#116b65] px-5 py-2.5 text-sm font-bold text-white"
          >
            Apply filters
          </button>
          <Link
            href="/review/feedback"
            className="rounded-lg border border-[#ccd5d0] px-5 py-2.5 text-sm font-bold"
          >
            Clear
          </Link>
        </div>
      </form>

      <section className="mt-7" aria-labelledby="patterns-heading">
        <h2 id="patterns-heading" className="font-serif text-2xl">
          Recurring signals
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {overview.patterns.length ? (
            overview.patterns.slice(0, 12).map((pattern) => (
              <article
                key={pattern.key}
                className="rounded-xl border border-[#d8ded9] bg-[#fffdf8] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-mono text-xs font-bold break-all text-[#116b65]">
                      {pattern.key}
                    </h3>
                    <p className="mt-1 text-xs text-[#687a7c]">
                      {formatLabel(pattern.category)}
                    </p>
                  </div>
                  <strong className="font-serif text-3xl">
                    {pattern.count}
                  </strong>
                </div>
                <p className="mt-3 text-xs text-[#52676a]">
                  {pattern.openCount} open · {pattern.learnerCount} learner ·{" "}
                  {pattern.reviewerCount} reviewer
                </p>
                {pattern.openCount >= 2 ? (
                  <ImprovementProposalForm
                    patternKey={pattern.key}
                    category={pattern.category}
                  />
                ) : (
                  <p className="mt-3 border-t border-[#d8ded9] pt-3 text-xs text-[#687a7c]">
                    Two matching open signals are required before drafting a
                    recurring-issue proposal.
                  </p>
                )}
              </article>
            ))
          ) : (
            <p className="text-sm text-[#687a7c]">
              No recurring signals match these filters.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="proposals-heading">
        <h2 id="proposals-heading" className="font-serif text-2xl">
          Improvement proposals
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5b7073]">
          Proposals snapshot exact feedback evidence. Approval authorizes only
          the plan; it never edits a prompt, rubric, validator, or question.
        </p>
        <div className="mt-3 space-y-4">
          {overview.proposals.length ? (
            overview.proposals.map((proposal) => (
              <article
                key={proposal.id}
                className="rounded-2xl border border-[#d8ded9] bg-[#fffdf8] p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-[11px] font-bold tracking-wide text-[#116b65] uppercase">
                      {proposal.decision?.decision ?? "DRAFT"} ·{" "}
                      {formatLabel(proposal.target)}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {proposal.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#687a7c]">
                      {proposal.patternKey} · {formatLabel(proposal.category)} ·{" "}
                      {proposal.evidence.length} evidence links
                    </p>
                  </div>
                  <span className="text-xs text-[#687a7c]">
                    {proposal.createdAt}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <ProposalField
                    label="Problem summary"
                    value={proposal.problemSummary}
                  />
                  <ProposalField
                    label="Proposed change"
                    value={proposal.proposedChange}
                  />
                  <ProposalField
                    label="Regression plan"
                    value={proposal.regressionPlan}
                  />
                </div>
                <details className="mt-4 rounded-xl border border-[#d8ded9] bg-white p-3">
                  <summary className="cursor-pointer text-xs font-bold text-[#116b65]">
                    Inspect linked evidence ({proposal.evidence.length})
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {proposal.evidence.map((evidence) => (
                      <li key={evidence.id} className="text-xs leading-5">
                        <span className="font-bold">
                          {formatLabel(evidence.source)}:
                        </span>{" "}
                        {evidence.details}{" "}
                        <Link
                          href={`/review/questions/${evidence.questionVersionId}`}
                          className="font-bold text-[#116b65] underline"
                        >
                          Inspect version
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
                {proposal.decision ? (
                  <p className="mt-4 rounded-lg bg-[#edf3ef] px-3 py-2 text-xs leading-5 text-[#385b59]">
                    {formatLabel(proposal.decision.decision)} by{" "}
                    {proposal.decision.decidedBy} at{" "}
                    {proposal.decision.decidedAt}: {proposal.decision.notes}
                  </p>
                ) : (
                  <ImprovementDecisionForm proposalId={proposal.id} />
                )}
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[#bccac4] bg-white/60 px-6 py-10 text-center text-sm text-[#687a7c]">
              No evidence-backed improvement proposals yet.
            </div>
          )}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="items-heading">
        <h2 id="items-heading" className="font-serif text-2xl">
          Submitted evidence
        </h2>
        <div className="mt-3 space-y-3">
          {overview.items.length ? (
            overview.items.map((item) => (
              <article
                key={`${item.source}-${item.id}`}
                className="rounded-2xl border border-[#d8ded9] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-wide uppercase">
                  <span className="rounded-full bg-[#e8f3ef] px-2.5 py-1 text-[#116b65]">
                    {formatLabel(item.source)}
                  </span>
                  <span>{formatLabel(item.category)}</span>
                  <span>{formatLabel(item.status)}</span>
                  {item.recurringIssueCode && (
                    <code>{item.recurringIssueCode}</code>
                  )}
                </div>
                <p className="mt-3 text-sm leading-6">{item.details}</p>
                <p className="mt-3 text-xs text-[#687a7c]">
                  {item.skillTitle} · <code>{item.slug}</code> ·{" "}
                  {item.createdAt}
                </p>
                <Link
                  href={`/review/questions/${item.questionVersionId}`}
                  className="mt-3 inline-flex text-sm font-bold text-[#116b65]"
                >
                  Inspect exact question version →
                </Link>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[#bccac4] bg-white/60 px-6 py-12 text-center text-sm text-[#687a7c]">
              No submitted evidence matches these filters.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProposalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 text-xs leading-5">
      <h4 className="font-bold text-[#52676a]">{label}</h4>
      <p className="mt-1">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value?: string;
  options: readonly string[];
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold text-[#52676a]">
        {label}
      </span>
      <select
        name={name}
        defaultValue={value}
        className="w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#d8ded9] bg-[#fffdf8] p-4">
      <strong className="block font-serif text-3xl">{value}</strong>
      <span className="mt-1 block text-xs font-semibold text-[#687a7c]">
        {label}
      </span>
    </div>
  );
}

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function formatLabel(value: string) {
  return value.toLocaleLowerCase("en-US").replaceAll("_", " ");
}
