import Link from "next/link";

import { getAdaptiveSetupData } from "@/data/adaptive";

import { AdaptiveStartForm } from "./adaptive-start-form";

export default async function AdaptivePracticePage() {
  const data = await getAdaptiveSetupData();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/practice" className="text-sm font-bold text-[#116b65]">
        ← Practice home
      </Link>
      <p className="mt-7 text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
        Adaptive Math practice
      </p>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-[-0.035em] sm:text-5xl">
        Practice where the evidence points.
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[#587073]">
        The current baseline is deterministic and inspectable. It weighs
        correctness, recency, confidence, misconceptions, prerequisite gaps,
        spaced review, response-format exposure, and recent repetition. These
        are internal learning estimates, not ATI score predictions.
      </p>

      <section className="mt-8 rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl">Build the next session</h2>
            <p className="mt-2 text-sm leading-6 text-[#587073]">
              {data.availableQuestionCount} current published questions ·{" "}
              {data.totalAttemptCount} saved attempts informing this plan
            </p>
          </div>
          <AdaptiveStartForm
            availableQuestionCount={data.availableQuestionCount}
          />
        </div>
      </section>

      {data.totalAttemptCount === 0 && (
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          There is no learner history yet. The first session prioritizes unseen
          coverage and uncertainty. For a broader starting signal, take the{" "}
          <Link href="/practice/diagnostic" className="font-bold underline">
            Math diagnostic
          </Link>
          .
        </div>
      )}

      <section className="mt-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
              Inspectable priorities
            </p>
            <h2 className="mt-2 font-serif text-3xl">Why skills rank here</h2>
          </div>
          <span className="text-xs text-[#52676a]">{data.modelVersion}</span>
        </div>

        <ol className="mt-5 grid gap-4 md:grid-cols-2">
          {data.priorities.map((priority, index) => (
            <li
              key={priority.skillCode}
              className="rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-[#116b65]">
                    Priority {index + 1}
                  </p>
                  <h3 className="mt-1 font-serif text-2xl">
                    {priority.skillTitle}
                  </h3>
                </div>
                <span className="rounded-full bg-[#e8f2ee] px-3 py-1.5 text-xs font-bold text-[#47615f]">
                  {priority.reviewDue ? "Review due" : "Scheduled"}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Metric
                  label="Internal estimate"
                  value={`${priority.masteryPercent}%`}
                />
                <Metric
                  label="Uncertainty"
                  value={`${priority.uncertaintyPercent}%`}
                />
                <Metric
                  label="Evidence"
                  value={`${priority.attemptCount} attempts`}
                />
                <Metric
                  label="Next level"
                  value={label(priority.targetDifficulty)}
                />
              </div>
              <p className="mt-4 text-xs leading-5 text-[#52676a]">
                Priority score {priority.priority.toFixed(3)} · prerequisite gap{" "}
                {priority.prerequisiteGap.toFixed(3)} ·{" "}
                {priority.nextReviewAt
                  ? `next review ${formatDate(priority.nextReviewAt)}`
                  : "new skill"}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Metric({
  label: metricLabel,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[#edf3ef] p-3">
      <span className="block text-xs text-[#52676a]">{metricLabel}</span>
      <strong className="mt-1 block">{value}</strong>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function label(value: string) {
  return value.toLocaleLowerCase("en-US").replaceAll("_", " ");
}
