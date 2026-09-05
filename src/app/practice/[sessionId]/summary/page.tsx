import Link from "next/link";
import { notFound } from "next/navigation";

import { getPracticeSessionSummary } from "@/data/practice";

export default async function PracticeSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ expired?: string }>;
}) {
  const { sessionId } = await params;
  const { expired } = await searchParams;
  const data = await getPracticeSessionSummary(sessionId);
  if (!data) notFound();

  const { session } = data;
  const accuracy = session.answeredCount
    ? Math.round((session.correctCount / session.answeredCount) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/practice" className="text-sm font-bold text-[#116b65]">
        ← Practice home
      </Link>
      <div className="mt-6 rounded-3xl bg-[#15383a] p-6 text-white shadow-sm sm:p-9">
        <p className="text-xs font-bold tracking-[0.14em] text-[#acd7cc] uppercase">
          Session summary
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h1 className="font-serif text-4xl sm:text-5xl">
              {session.correctCount} of {session.answeredCount} correct
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#d1e2dd]">
              This is practice accuracy on a small internal question set. It is
              not an official ATI score or a validated TEAS prediction.
            </p>
          </div>
          <div className="grid h-28 w-28 place-items-center rounded-full border-8 border-[#4e8c83] bg-[#fffdf8] text-[#15383a]">
            <strong className="font-serif text-3xl">{accuracy}%</strong>
          </div>
        </div>
      </div>

      {expired && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          The session reached its internal pacing target. Unanswered questions
          were not scored as incorrect.
        </div>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-6 shadow-sm">
          <h2 className="font-serif text-2xl">By skill</h2>
          <ul className="mt-4 space-y-4">
            {data.skillBreakdown.map((skill) => {
              const percent = skill.answered
                ? Math.round((skill.correct / skill.answered) * 100)
                : 0;
              return (
                <li key={skill.skillCode}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <strong>{skill.skillTitle}</strong>
                    <span className="text-[#607477]">
                      {skill.correct}/{skill.answered}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5ebe6]">
                    <div
                      className="h-full rounded-full bg-[#116b65]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-6 shadow-sm">
          <h2 className="font-serif text-2xl">Session evidence</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <Metric
              label="Questions answered"
              value={`${session.answeredCount} of ${session.actualQuestionCount}`}
            />
            <Metric
              label="Saved answer time"
              value={formatDuration(data.totalElapsedMilliseconds)}
            />
            <Metric label="Mode" value={label(session.timingMode)} />
            <Metric label="Status" value={label(session.status)} />
          </dl>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/practice" className="button button-primary">
          Build another session
        </Link>
        {session.answeredCount < session.actualQuestionCount &&
          session.status === "IN_PROGRESS" && (
            <Link
              href={`/practice/${session.id}`}
              className="rounded-xl border border-[#bdcbc4] bg-[#fffdf8] px-6 py-3 text-sm font-bold"
            >
              Continue this session
            </Link>
          )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e2e6e2] pb-3 last:border-0">
      <dt className="text-[#607477]">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.round(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function label(value: string) {
  return value.toLocaleLowerCase("en-US").replaceAll("_", " ");
}
