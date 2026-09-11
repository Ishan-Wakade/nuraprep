import Link from "next/link";

import { ReadinessTrend } from "@/components/readiness-trend";
import { getScoreDashboardData } from "@/data/score";

import {
  GenerateEstimateButton,
  StudyPlanItemForm,
  StudyPlanPreferencesForm,
} from "./score-controls";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ estimate?: string }>;
}) {
  const { estimate: selectedEstimateId } = await searchParams;
  const data = await getScoreDashboardData(selectedEstimateId);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/practice" className="text-sm font-bold text-[#116b65]">
        ← Practice home
      </Link>
      <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
            Progress and planning
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-[-0.035em] sm:text-5xl">
            Turn practice evidence into a next step.
          </h1>
        </div>
        {data.estimate && <GenerateEstimateButton compact />}
      </div>

      {!data.estimate ? (
        <section className="mt-8 rounded-3xl border border-[#d6ddd7] bg-[#fffdf8] p-7 shadow-sm sm:p-10">
          <p className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
            No saved estimate
          </p>
          <h2 className="mt-2 font-serif text-3xl">
            Create an honest baseline.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#587073]">
            NuraPrep will use your most recent attempt per unique question over
            the last 180 days. With little or no evidence, the result starts
            near a neutral prior and shows a deliberately wide interval.
          </p>
          <div className="mt-6">
            <GenerateEstimateButton />
          </div>
        </section>
      ) : (
        <EstimateView data={data} />
      )}
    </div>
  );
}

function EstimateView({
  data,
}: {
  data: Awaited<ReturnType<typeof getScoreDashboardData>> & {
    estimate: NonNullable<
      Awaited<ReturnType<typeof getScoreDashboardData>>["estimate"]
    >;
  };
}) {
  const { estimate, plan } = data;
  const features = estimate.featureSnapshot;
  return (
    <>
      <section className="mt-8 rounded-3xl bg-[#15383a] p-7 text-white shadow-sm sm:p-10">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-[#acd7cc] uppercase">
              NuraPrep Math readiness estimate
            </p>
            <h2 className="mt-3 font-serif text-5xl">
              {formatBasisPoints(estimate.estimateBasisPoints)}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d1e2dd]">
              Internal uncertainty interval:{" "}
              {formatBasisPoints(estimate.lowerBasisPoints)}–
              {formatBasisPoints(estimate.upperBasisPoints)}. This estimates
              performance on NuraPrep&apos;s reviewed Math blueprint. It is not
              an official ATI score, scaled-score conversion, or guarantee.
            </p>
          </div>
          <div className="rounded-2xl border border-[#4e7975] bg-[#214a4b] p-4 text-sm">
            <span className="block text-xs text-[#acd7cc]">Evidence depth</span>
            <strong className="mt-1 block text-xl">
              {label(estimate.evidenceLevel)}
            </strong>
            <span className="mt-2 block text-xs text-[#d1e2dd]">
              {estimate.evidenceCount} unique questions
            </span>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <Metric
          label="Timed evidence"
          value={`${features.timed.questionCount} questions`}
          detail={formatOptionalPercent(features.timed.accuracy)}
        />
        <Metric
          label="Untimed evidence"
          value={`${features.untimed.questionCount} questions`}
          detail={formatOptionalPercent(features.untimed.accuracy)}
        />
        <Metric
          label="Within item target"
          value={formatOptionalPercent(features.timed.withinTargetRate)}
          detail="Timed answers only"
        />
      </div>

      <section className="mt-6 rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
              Blueprint-weighted evidence
            </p>
            <h2 className="mt-2 font-serif text-3xl">By Math domain</h2>
          </div>
          <span className="text-xs text-[#52676a]">
            {estimate.modelVersion}
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {features.domains.map((domain) => (
            <article
              key={domain.domainTitle}
              className="rounded-xl bg-[#edf3ef] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-serif text-2xl">{domain.domainTitle}</h3>
                <strong>{formatPercent(domain.estimate)}</strong>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#52676a]">
                Interval {formatPercent(domain.lowerBound)}–
                {formatPercent(domain.upperBound)} ·{" "}
                {domain.uniqueQuestionCount} unique questions ·{" "}
                {formatPercent(domain.blueprintWeight)} of the scored public
                blueprint
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-6 shadow-sm">
        <p className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
          Editable weekly plan
        </p>
        <h2 className="mt-2 font-serif text-3xl">Focus the next study block</h2>
        {plan?.items.length ? (
          <ol className="mt-5 grid gap-4">
            {plan.items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-[#d9e0da] p-5"
              >
                <p className="text-xs font-bold text-[#116b65]">
                  Priority {item.priority}
                </p>
                <h3 className="mt-1 font-serif text-2xl">{item.skillTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-[#587073]">
                  {item.rationale}
                </p>
                <StudyPlanItemForm item={item} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[#587073]">
            No published skill is available for a focused plan yet. Complete
            reviewed practice after the content bank is published, then refresh
            the estimate.
          </p>
        )}
        {plan && (
          <StudyPlanPreferencesForm
            planId={plan.id}
            weeklyMinutes={plan.weeklyMinutes}
            learnerNotes={plan.learnerNotes}
          />
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-serif text-2xl">How to read this estimate</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-950">
          {estimate.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-amber-900">
          Generated {formatDate(estimate.createdAt)} ·{" "}
          {features.rawAttemptCount} raw attempts reduced to{" "}
          {features.uniqueQuestionCount} latest unique families · effective
          evidence {features.effectiveEvidence.toFixed(1)}
        </p>
      </section>

      <ReadinessTrend history={data.history} selectedEstimateId={estimate.id} />
    </>
  );
}

function Metric({
  label: metricLabel,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-5 shadow-sm">
      <span className="text-xs text-[#52676a]">{metricLabel}</span>
      <strong className="mt-1 block text-xl">{value}</strong>
      <span className="mt-2 block text-xs text-[#52676a]">{detail}</span>
    </div>
  );
}

function formatBasisPoints(value: number) {
  return `${(value / 100).toFixed(1)}%`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatOptionalPercent(value: number | null) {
  return value === null ? "Not available" : formatPercent(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
