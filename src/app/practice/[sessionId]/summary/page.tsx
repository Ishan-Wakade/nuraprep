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
  const isDiagnostic = session.mode === "DIAGNOSTIC";
  const isPracticeTest = session.mode === "PRACTICE_TEST";
  const displayedSkills = data.diagnostic
    ? data.diagnostic.signals.map((skill) => ({
        ...skill,
        signalText: signalLabel(skill.signal),
      }))
    : data.skillBreakdown.map((skill) => ({ ...skill, signalText: null }));

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/practice" className="text-sm font-bold text-[#116b65]">
        ← Practice home
      </Link>
      <div className="mt-6 rounded-3xl bg-[#15383a] p-6 text-white shadow-sm sm:p-9">
        <p className="text-xs font-bold tracking-[0.14em] text-[#acd7cc] uppercase">
          {isDiagnostic
            ? "Diagnostic results"
            : isPracticeTest
              ? "Timed Math test results"
              : "Session summary"}
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h1 className="font-serif text-4xl sm:text-5xl">
              {session.correctCount} of {session.answeredCount} correct
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#d1e2dd]">
              {isDiagnostic
                ? "This is an early signal from one sampled item per available skill. It is not proof of mastery, an official ATI score, or a validated TEAS prediction."
                : isPracticeTest
                  ? "Accuracy uses answered questions only; unanswered questions remain unscored. This independent simulation is not an official ATI score or a validated TEAS prediction."
                  : "This is practice accuracy on a small internal question set. It is not an official ATI score or a validated TEAS prediction."}
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

      {isDiagnostic &&
        session.status === "COMPLETED" &&
        data.diagnostic?.startingPoint && (
          <section className="mt-6 rounded-2xl border border-[#9fc9bd] bg-[#e8f2ee] p-6 shadow-sm">
            <p className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
              Personalized starting point
            </p>
            <h2 className="mt-2 font-serif text-3xl">
              {data.diagnostic.startingPoint.skillTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#47615f]">
              {data.diagnostic.startingPoint.explanation}
            </p>
            <Link
              href={`/practice?skill=${encodeURIComponent(data.diagnostic.startingPoint.skillCode)}`}
              className="mt-5 inline-flex rounded-xl bg-[#116b65] px-5 py-3 text-sm font-bold text-white"
            >
              Practice this skill
            </Link>
          </section>
        )}

      {isPracticeTest && data.pacing && (
        <section className="mt-6 rounded-2xl border border-[#d6ddd7] bg-[#edf3ef] p-6 shadow-sm">
          <p className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
            Pacing analytics
          </p>
          <h2 className="mt-2 font-serif text-3xl">How the time was used</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <Metric
              label="Average saved answer time"
              value={formatDuration(data.pacing.averageAnswerMilliseconds)}
            />
            <Metric
              label="Over internal item target"
              value={`${data.pacing.overTargetCount} questions`}
            />
            <Metric
              label="Wall-clock test time"
              value={formatDuration(data.pacing.wallClockMilliseconds)}
            />
          </dl>
          <p className="mt-4 text-xs leading-5 text-[#607477]">
            Item targets are internal reviewer estimates, not official ATI
            pacing requirements.
          </p>
        </section>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-6 shadow-sm">
          <h2 className="font-serif text-2xl">
            {isDiagnostic ? "Starting signals" : "By skill"}
          </h2>
          <ul className="mt-4 space-y-4">
            {displayedSkills.map((skill) => {
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
                  {skill.signalText && (
                    <p className="mt-1 text-xs font-semibold text-[#587073]">
                      {skill.signalText}
                    </p>
                  )}
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
            <Metric label="Session type" value={label(session.mode)} />
            <Metric label="Status" value={label(session.status)} />
          </dl>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/practice" className="button button-primary">
          {isDiagnostic ? "Choose focused practice" : "Build another session"}
        </Link>
        {isPracticeTest && session.status === "COMPLETED" && (
          <Link
            href={`/practice/${session.id}?item=1`}
            className="rounded-xl border border-[#bdcbc4] bg-[#fffdf8] px-6 py-3 text-sm font-bold"
          >
            Review test answers
          </Link>
        )}
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

function signalLabel(
  signal: "START_HERE" | "REINFORCE" | "BUILD_ON" | "INCOMPLETE",
) {
  return {
    START_HERE: "Start here · confirm with focused practice",
    REINFORCE: "Reinforce · correct with low confidence",
    BUILD_ON: "Build on · encouraging early evidence",
    INCOMPLETE: "Incomplete · no saved answer",
  }[signal];
}
