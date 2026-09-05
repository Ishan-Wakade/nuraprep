import Link from "next/link";

import { getPracticeSetupData } from "@/data/practice";

import { DiagnosticStartForm } from "./diagnostic-start-form";

export default async function DiagnosticStartPage() {
  const data = await getPracticeSetupData();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/practice" className="text-sm font-bold text-[#116b65]">
        ← Practice home
      </Link>
      <p className="mt-7 text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
        Math diagnostic
      </p>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-[-0.035em] sm:text-5xl">
        Find a defensible starting point.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#587073]">
        This short check samples one current published question from each
        available Math skill, up to six. It produces an early topic signal—not
        an official ATI score or a validated TEAS prediction.
      </p>

      <section className="mt-8 grid gap-5 rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-5 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
        <div>
          <h2 className="font-serif text-2xl">Current coverage</h2>
          <p className="mt-2 text-sm leading-6 text-[#587073]">
            {data.availability.length} published skills · {data.totalAvailable}{" "}
            published questions
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {data.availability.map((skill) => (
              <li
                key={skill.skillCode}
                className="rounded-full bg-[#e8f2ee] px-3 py-1.5 text-xs font-semibold text-[#47615f]"
              >
                {skill.skillTitle}
              </li>
            ))}
          </ul>
        </div>
        <DiagnosticStartForm skillCount={data.availability.length} />
      </section>

      <section className="mt-6 rounded-2xl border border-[#d6ddd7] bg-[#edf3ef] p-5 sm:p-7">
        <h2 className="font-serif text-2xl">How to interpret it</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[#47615f]">
          <li>Answer without looking up a method so the signal is useful.</li>
          <li>
            Confidence is optional and stored as context, not as correctness.
          </li>
          <li>
            One item cannot establish mastery; weak areas are starting
            hypotheses for practice.
          </li>
        </ul>
      </section>
    </div>
  );
}
