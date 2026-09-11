import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPracticeTestSetupData } from "@/data/practice-test";

import { PracticeTestStartForm } from "./practice-test-start-form";

export const metadata: Metadata = {
  title: "Timed Math simulation",
};

export default async function PracticeTestStartPage() {
  const data = await getPracticeTestSetupData();
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/practice" className="text-sm font-bold text-[#116b65]">
        ← Practice home
      </Link>
      <p className="mt-7 text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
        Timed Math simulation
      </p>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-[-0.035em] sm:text-5xl">
        Rehearse the complete Math section.
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[#587073]">
        This independent simulation uses {data.specification.totalQuestions}{" "}
        questions in {data.specification.durationMinutes} minutes, based on the
        currently verified public ATI TEAS Version{" "}
        {data.specification.examVersion} Math details. It is not an official ATI
        test and does not contain ATI questions.
      </p>

      <section className="mt-8 rounded-2xl bg-[#15383a] p-6 text-white shadow-sm sm:p-8">
        <div className="grid gap-7 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-[#acd7cc] uppercase">
              Blueprint readiness
            </p>
            <h2 className="mt-2 font-serif text-3xl">
              {data.ready
                ? "Reviewed bank ready"
                : "More reviewed coverage needed"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d1e2dd]">
              {data.uniqueCandidateCount} unique current question families are
              available. Assembly never repeats a family within one test.
            </p>
          </div>
          <PracticeTestStartForm ready={data.ready} />
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {data.readiness.map((domain) => (
          <section
            key={domain.domainTitle}
            className="rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-serif text-2xl">{domain.domainTitle}</h2>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${domain.deficit ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}
              >
                {domain.deficit ? `${domain.deficit} short` : "Ready"}
              </span>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <Metric label="Blueprint target" value={`${domain.required}`} />
              <Metric
                label="Available families"
                value={`${domain.available}`}
              />
            </dl>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-[#d6ddd7] bg-[#edf3ef] p-6">
        <h2 className="font-serif text-2xl">
          What is official—and what is not
        </h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[#47615f]">
          <li>
            The 38-question, 57-minute configuration and 18/16 scored-domain
            counts come from the public source linked below.
          </li>
          <li>
            The four unscored slots are allocated proportionally across the two
            domains as an internal approximation, producing targets of 20 and
            18. ATI does not publish their domain placement here.
          </li>
          <li>
            Difficulty and response formats are interleaved across the reviewed
            content available; NuraPrep does not claim an official difficulty
            ratio.
          </li>
          <li>
            Assembler version: <code>{data.assemblerVersion}</code>
          </li>
        </ul>
        <a
          href={data.specification.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex text-sm font-bold text-[#116b65] underline"
        >
          View the public ATI exam details
        </a>
      </section>

      {!data.ready && (
        <p className="mt-5 text-sm leading-6 text-amber-950">
          The start control stays disabled rather than silently changing the
          blueprint. An owner can add only reviewed, published coverage through
          the{" "}
          <Link href="/review" className="font-bold underline">
            review queue
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e2e6e2] pb-3 last:border-0">
      <dt className="text-[#52676a]">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
