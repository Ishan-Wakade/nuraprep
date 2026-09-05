import Link from "next/link";

import { getPracticeSetupData } from "@/data/practice";

import { PracticeSetupForm } from "./practice-setup-form";

export default async function PracticeSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const { skill } = await searchParams;
  const data = await getPracticeSetupData();
  const defaultSkillCode = data.availability.some(
    (item) => item.skillCode === skill,
  )
    ? skill
    : undefined;

  return (
    <div>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <p className="text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
            Topic practice
          </p>
          <h1 className="mt-3 max-w-2xl font-serif text-4xl tracking-[-0.035em] sm:text-5xl">
            Build a focused Math session.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#587073]">
            Choose what to work on and how you want to pace it. Only explicitly
            published question versions can enter a learner session.
          </p>

          <Link
            href="/practice/diagnostic"
            className="mt-7 grid gap-4 rounded-2xl border border-[#9fc9bd] bg-[#e8f2ee] p-5 shadow-sm transition hover:border-[#4f9185] sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
          >
            <span>
              <span className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
                New learner
              </span>
              <strong className="mt-2 block font-serif text-2xl">
                Take the Math diagnostic
              </strong>
              <span className="mt-2 block text-sm leading-6 text-[#47615f]">
                Sample the current skill coverage and get a conservative
                starting recommendation.
              </span>
            </span>
            <span className="text-sm font-bold text-[#116b65]">
              Start check-in →
            </span>
          </Link>

          <Link
            href="/practice/adaptive"
            className="mt-4 grid gap-4 rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-5 shadow-sm transition hover:border-[#85afa6] sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
          >
            <span>
              <span className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
                Returning learner
              </span>
              <strong className="mt-2 block font-serif text-2xl">
                Continue with adaptive practice
              </strong>
              <span className="mt-2 block text-sm leading-6 text-[#47615f]">
                Build an inspectable session from your saved performance,
                confidence, misconceptions, and review timing.
              </span>
            </span>
            <span className="text-sm font-bold text-[#116b65]">
              View priorities →
            </span>
          </Link>

          <Link
            href="/practice/test"
            className="mt-4 grid gap-4 rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-5 shadow-sm transition hover:border-[#85afa6] sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
          >
            <span>
              <span className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
                Exam rehearsal
              </span>
              <strong className="mt-2 block font-serif text-2xl">
                Take a full timed Math test
              </strong>
              <span className="mt-2 block text-sm leading-6 text-[#47615f]">
                Check the reviewed bank against the versioned 38-question,
                57-minute blueprint before starting.
              </span>
            </span>
            <span className="text-sm font-bold text-[#116b65]">
              Check readiness →
            </span>
          </Link>

          <Link
            href="/practice/progress"
            className="mt-4 grid gap-4 rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-5 shadow-sm transition hover:border-[#85afa6] sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
          >
            <span>
              <span className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
                Progress and planning
              </span>
              <strong className="mt-2 block font-serif text-2xl">
                Estimate readiness and build a study plan
              </strong>
              <span className="mt-2 block text-sm leading-6 text-[#47615f]">
                Save a versioned internal estimate with uncertainty, then edit
                the recommended weekly priorities.
              </span>
            </span>
            <span className="text-sm font-bold text-[#116b65]">
              View progress →
            </span>
          </Link>

          <div className="mt-8 rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-5 shadow-sm sm:p-7">
            <PracticeSetupForm
              skills={data.availability}
              totalAvailable={data.totalAvailable}
              defaultSkillCode={defaultSkillCode}
            />
          </div>

          {data.totalAvailable === 0 && (
            <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              No question has cleared every validation, approval, and
              publication gate in this database. Use the{" "}
              <Link href="/review" className="font-bold underline">
                owner review queue
              </Link>{" "}
              to prepare development content.
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl bg-[#15383a] p-5 text-white shadow-sm">
            <p className="text-[11px] font-bold tracking-[0.12em] text-[#acd7cc] uppercase">
              Signed in locally
            </p>
            <h2 className="mt-2 font-serif text-2xl">
              {data.identity.displayName}
            </h2>
            <p className="mt-3 text-xs leading-5 text-[#d3e4df]">
              This temporary identity is disabled in production. Google sign-in
              comes after the core learning loop is proven.
            </p>
          </section>

          <section className="rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-5 shadow-sm">
            <h2 className="text-sm font-bold">Recent sessions</h2>
            {data.recentSessions.length ? (
              <ul className="mt-3 space-y-3">
                {data.recentSessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={
                        session.status === "COMPLETED"
                          ? `/practice/${session.id}/summary`
                          : `/practice/${session.id}`
                      }
                      className="block rounded-lg border border-[#e1e5e1] p-3 text-xs hover:border-[#85afa6]"
                    >
                      <strong>{label(session.status)}</strong>
                      <span className="mt-1 block text-[#637679]">
                        {label(session.mode)} · {session.requestedQuestionCount}{" "}
                        requested · {label(session.timingMode)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs leading-5 text-[#637679]">
                Your completed and in-progress sessions will appear here.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function label(value: string) {
  return value.toLocaleLowerCase("en-US").replaceAll("_", " ");
}
