import Link from "next/link";

import { getReviewQueue, type ReviewQueueFilters } from "@/data/reviewer";

const difficulties = [
  "FOUNDATIONAL",
  "DEVELOPING",
  "PROFICIENT",
  "ADVANCED",
] as const;
const questionTypes = [
  "SINGLE_CHOICE",
  "MULTIPLE_SELECT",
  "NUMERIC",
  "ORDERED_RESPONSE",
] as const;
const reviewStatuses = [
  "UNREVIEWED",
  "APPROVED",
  "NEEDS_REVISION",
  "REJECTED",
] as const;
const scopes = ["CURRENT", "HISTORY"] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const difficulty = single(params.difficulty);
  const questionType = single(params.questionType);
  const reviewStatus = single(params.status);
  const scope = single(params.scope);
  const filters: ReviewQueueFilters = {
    scope: scopes.find((value) => value === scope) ?? "CURRENT",
    query: single(params.q)?.trim() || undefined,
    difficulty: difficulties.find((value) => value === difficulty),
    questionType: questionTypes.find((value) => value === questionType),
    reviewStatus: reviewStatuses.find((value) => value === reviewStatus),
    skillCode: single(params.skill) || undefined,
  };
  const queue = await getReviewQueue(filters);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
            Owner workspace
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-[-0.03em]">
            Question review queue
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b7073]">
            Inspect original development candidates, validator evidence, rights
            metadata, and immutable review history.
          </p>
        </div>
        <span className="rounded-full border border-[#c9d9d3] bg-[#e8f3ef] px-3 py-2 text-xs font-semibold text-[#116b65]">
          {queue.summary.total} visible versions ·{" "}
          {filters.scope === "CURRENT"
            ? "latest candidate per family"
            : "full history"}
        </span>
      </div>

      <section
        className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5"
        aria-label="Queue summary"
      >
        <SummaryCard label="Visible" value={queue.summary.total} />
        <SummaryCard label="Unreviewed" value={queue.summary.unreviewed} />
        <SummaryCard
          label="Needs revision"
          value={queue.summary.needsRevision}
        />
        <SummaryCard label="Approved" value={queue.summary.approved} />
        <SummaryCard
          label="Learner reports"
          value={queue.summary.learnerReports}
        />
      </section>

      <section className="mt-7" aria-labelledby="bank-coverage-heading">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-[#116b65] uppercase">
              Production readiness
            </p>
            <h2 id="bank-coverage-heading" className="mt-1 font-serif text-2xl">
              Math question-bank coverage
            </h2>
          </div>
          <p className="text-xs text-[#52676a]">
            {queue.bankCoverage.publishedFamilies}/
            {queue.bankCoverage.questionTarget || "—"} current learner-safe
            families · {queue.bankCoverage.skillsWithoutPublishedItems} leaf
            skills without one
          </p>
        </div>
        <p className="mt-2 max-w-4xl text-xs leading-5 text-[#52676a]">
          The section question count is a minimum family-count readiness check,
          not an official per-skill allocation. Candidate counts include drafts;
          only current publications are learner-safe.
        </p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[#d8ded9] bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="bg-[#edf3ef] text-[#385b59]">
              <tr>
                <th className="px-4 py-3 font-bold">Leaf skill</th>
                <th className="px-4 py-3 font-bold">All candidates</th>
                <th className="px-4 py-3 font-bold">Current published</th>
                <th className="px-4 py-3 font-bold">Published formats</th>
                <th className="px-4 py-3 font-bold">Coverage signal</th>
              </tr>
            </thead>
            <tbody>
              {queue.bankCoverage.rows.map((row) => (
                <tr key={row.skillId} className="border-t border-[#e0e5e1]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/review?skill=${encodeURIComponent(row.skillCode)}`}
                      className="font-semibold text-[#116b65] underline"
                    >
                      {row.skillTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.candidateFamilies}</td>
                  <td className="px-4 py-3 font-bold">
                    {row.publishedFamilies}
                  </td>
                  <td className="px-4 py-3 text-[#52676a]">
                    {row.publishedFormats.length
                      ? row.publishedFormats.map(formatLabel).join(", ")
                      : "None"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 font-bold ${
                        row.publishedFamilies > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {row.publishedFamilies > 0
                        ? "Has published evidence"
                        : "No published item"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form className="mt-6 grid gap-3 rounded-2xl border border-[#d8ded9] bg-[#fffdf8] p-4 shadow-sm md:grid-cols-2 lg:grid-cols-6">
        <label className="lg:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-[#52676a]">
            Search
          </span>
          <input
            name="q"
            defaultValue={filters.query}
            placeholder="Prompt, slug, or skill"
            className="w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          />
        </label>
        <FilterSelect
          label="Version scope"
          name="scope"
          value={filters.scope}
          options={scopes}
          includeAll={false}
        />
        <FilterSelect
          label="Status"
          name="status"
          value={filters.reviewStatus}
          options={reviewStatuses}
        />
        <FilterSelect
          label="Difficulty"
          name="difficulty"
          value={filters.difficulty}
          options={difficulties}
        />
        <FilterSelect
          label="Type"
          name="questionType"
          value={filters.questionType}
          options={questionTypes}
        />
        <label className="lg:col-span-3">
          <span className="mb-1.5 block text-xs font-bold text-[#52676a]">
            Skill
          </span>
          <select
            name="skill"
            defaultValue={filters.skillCode}
            className="w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-2.5 text-sm"
          >
            <option value="">All skills</option>
            {queue.skills.map((skill) => (
              <option key={skill.code} value={skill.code}>
                {skill.title}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2 lg:col-span-2">
          <button
            className="rounded-lg bg-[#116b65] px-5 py-2.5 text-sm font-bold text-white"
            type="submit"
          >
            Apply filters
          </button>
          <Link
            className="rounded-lg border border-[#ccd5d0] px-5 py-2.5 text-sm font-bold"
            href="/review"
          >
            Clear
          </Link>
        </div>
      </form>

      <section className="mt-6 space-y-3" aria-label="Question versions">
        {queue.items.length ? (
          queue.items.map((item) => (
            <Link
              key={item.versionId}
              href={`/review/questions/${item.versionId}`}
              className="group grid gap-4 rounded-2xl border border-[#d8ded9] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9cbcb3] hover:shadow-md lg:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-wide uppercase">
                  <StatusBadge status={item.latestDecision} />
                  <span className="text-[#52676a]">
                    {formatLabel(item.questionType)}
                  </span>
                  <span className="text-[#52676a]">
                    {formatLabel(item.difficulty)}
                  </span>
                  <span className="text-[#52676a]">v{item.version}</span>
                </div>
                <h2 className="mt-3 line-clamp-2 text-base font-semibold leading-6 group-hover:text-[#116b65]">
                  {item.prompt}
                </h2>
                <p className="mt-2 text-xs text-[#52676a]">
                  {item.skillTitle} · <code>{item.slug}</code>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-5 border-t border-[#edf0ed] pt-4 text-xs text-[#52676a] lg:border-t-0 lg:pt-0">
                <div>
                  <strong className="block text-lg text-[#123136]">
                    {item.passingValidatorCount}/{item.requiredValidatorCount}
                  </strong>
                  validators passing
                </div>
                <div>
                  <strong className="block text-lg text-[#123136]">
                    {item.provenanceCount}
                  </strong>
                  source record
                </div>
                <div>
                  <strong className="block text-lg text-[#123136]">
                    {item.learnerReportCount}
                  </strong>
                  learner reports
                </div>
                <span className="text-xl text-[#116b65]" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#bccac4] bg-white/60 px-6 py-14 text-center">
            <h2 className="font-serif text-2xl">No question versions match</h2>
            <p className="mt-2 text-sm text-[#52676a]">
              Clear a filter or broaden the search query.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#d8ded9] bg-[#fffdf8] p-4">
      <strong className="block font-serif text-3xl">{value}</strong>
      <span className="mt-1 block text-xs font-semibold text-[#52676a]">
        {label}
      </span>
    </div>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
  includeAll = true,
}: {
  label: string;
  name: string;
  value?: string;
  options: readonly string[];
  includeAll?: boolean;
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
        {includeAll && <option value="">All</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "APPROVED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "REJECTED"
        ? "bg-red-100 text-red-800"
        : status === "NEEDS_REVISION"
          ? "bg-amber-100 text-amber-800"
          : "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-2.5 py-1 ${color}`}>
      {formatLabel(status)}
    </span>
  );
}

function formatLabel(value: string) {
  return value.toLocaleLowerCase("en-US").replaceAll("_", " ");
}
