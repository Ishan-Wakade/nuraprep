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
  const filters: ReviewQueueFilters = {
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
          {queue.summary.total} visible versions
        </span>
      </div>

      <section
        className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-label="Queue summary"
      >
        <SummaryCard label="Visible" value={queue.summary.total} />
        <SummaryCard label="Unreviewed" value={queue.summary.unreviewed} />
        <SummaryCard
          label="Needs revision"
          value={queue.summary.needsRevision}
        />
        <SummaryCard label="Approved" value={queue.summary.approved} />
      </section>

      <form className="mt-6 grid gap-3 rounded-2xl border border-[#d8ded9] bg-[#fffdf8] p-4 shadow-sm md:grid-cols-2 lg:grid-cols-5">
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
                  <span className="text-[#6b7b7d]">
                    {formatLabel(item.questionType)}
                  </span>
                  <span className="text-[#6b7b7d]">
                    {formatLabel(item.difficulty)}
                  </span>
                  <span className="text-[#6b7b7d]">v{item.version}</span>
                </div>
                <h2 className="mt-3 line-clamp-2 text-base font-semibold leading-6 group-hover:text-[#116b65]">
                  {item.prompt}
                </h2>
                <p className="mt-2 text-xs text-[#687a7c]">
                  {item.skillTitle} · <code>{item.slug}</code>
                </p>
              </div>
              <div className="flex items-center gap-5 border-t border-[#edf0ed] pt-4 text-xs text-[#52676a] lg:border-t-0 lg:pt-0">
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
                <span className="text-xl text-[#116b65]" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#bccac4] bg-white/60 px-6 py-14 text-center">
            <h2 className="font-serif text-2xl">No question versions match</h2>
            <p className="mt-2 text-sm text-[#687a7c]">
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
      <span className="mt-1 block text-xs font-semibold text-[#687a7c]">
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
