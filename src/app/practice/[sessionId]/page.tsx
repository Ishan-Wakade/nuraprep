import Link from "next/link";
import { notFound } from "next/navigation";

import { getPracticeSessionView } from "@/data/practice";

import { AnswerForm } from "./answer-form";
import { ProblemReportForm } from "./problem-report-form";
import { SessionTimer } from "./session-timer";
import { TutorPanel } from "./tutor-panel";

export default async function PracticeSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const { sessionId } = await params;
  const { item } = await searchParams;
  const parsedPosition = Number.parseInt(item ?? "", 10);
  const view = await getPracticeSessionView(
    sessionId,
    Number.isFinite(parsedPosition) ? parsedPosition : undefined,
  );
  if (!view) notFound();

  const { session, item: question } = view;
  const isLast = question.position === session.actualQuestionCount;
  const sessionLabel =
    session.mode === "DIAGNOSTIC"
      ? "Math diagnostic"
      : session.mode === "ADAPTIVE"
        ? "Adaptive practice"
        : "Topic practice";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/practice" className="text-sm font-bold text-[#116b65]">
            ← Practice home
          </Link>
          <p className="mt-5 text-xs font-bold tracking-[0.12em] text-[#607477] uppercase">
            {sessionLabel} · {question.skillTitle} ·{" "}
            {label(question.difficulty)}
          </p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl">
            Question {question.position} of {session.actualQuestionCount}
          </h1>
        </div>
        <SessionTimer
          startedAt={session.startedAt}
          timeLimitSeconds={session.timeLimitSeconds}
        />
      </div>

      <nav aria-label="Question progress" className="mt-6 flex flex-wrap gap-2">
        {view.positions.map((position) => (
          <Link
            key={position.position}
            href={`/practice/${session.id}?item=${position.position}`}
            aria-current={
              position.position === question.position ? "step" : undefined
            }
            className={`grid h-9 w-9 place-items-center rounded-lg border text-xs font-bold ${
              position.position === question.position
                ? "border-[#116b65] bg-[#116b65] text-white"
                : position.correct === true
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : position.correct === false
                    ? "border-orange-300 bg-orange-50 text-orange-800"
                    : "border-[#cfd8d1] bg-[#fffdf8]"
            }`}
          >
            {position.position}
          </Link>
        ))}
      </nav>

      <section className="mt-6 rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-[11px] font-bold tracking-wide uppercase">
            <Badge>{question.skillTitle}</Badge>
            <Badge>{label(question.questionType)}</Badge>
            <Badge>{label(question.calculatorPolicy)}</Badge>
          </div>
          <span className="text-xs text-[#687a7c]">
            Internal target: {question.estimatedSeconds} sec
          </span>
        </div>

        <h2 className="mt-6 max-w-3xl text-xl font-semibold leading-8 sm:text-2xl sm:leading-9">
          {question.prompt}
        </h2>
        <Stimulus stimulus={question.stimulus} />

        {session.mode === "ADAPTIVE" && (
          <details
            open
            className="mt-5 rounded-xl border border-[#d6ddd7] bg-[#edf3ef] p-4 text-xs leading-5 text-[#52676a]"
          >
            <summary className="cursor-pointer font-bold text-[#116b65]">
              Why this question?
            </summary>
            <p className="mt-2">{question.selectionReason}</p>
          </details>
        )}

        {question.feedback ? (
          <Feedback
            feedback={question.feedback}
            choices={question.choices ?? []}
            skillTitle={question.skillTitle}
            learningObjective={question.learningObjective}
            questionVersionId={question.versionId}
            reflectionPrompt={question.tutor?.reflectionPrompt ?? null}
          />
        ) : session.status === "IN_PROGRESS" ? (
          <>
            {question.tutor && (
              <TutorPanel
                sessionId={session.id}
                sessionItemId={question.itemId}
                revealedSteps={question.tutor.revealedSteps}
                remainingSteps={question.tutor.remainingSteps}
              />
            )}
            <AnswerForm
              sessionId={session.id}
              sessionItemId={question.itemId}
              questionType={question.questionType}
              choices={question.choices ?? null}
              unitRequired={question.unitRequired}
            />
          </>
        ) : (
          <div className="mt-7 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            This session has ended. Review the session summary for your saved
            results.
          </div>
        )}
      </section>

      {question.feedback && (
        <div className="mt-5 flex justify-end">
          <Link
            href={
              isLast
                ? `/practice/${session.id}/summary`
                : `/practice/${session.id}?item=${question.position + 1}`
            }
            className="rounded-xl bg-[#15383a] px-6 py-3 text-sm font-bold text-white"
          >
            {isLast ? "View session summary" : "Continue to next question →"}
          </Link>
        </div>
      )}
    </div>
  );
}

function Feedback({
  feedback,
  choices,
  skillTitle,
  learningObjective,
  questionVersionId,
  reflectionPrompt,
}: {
  feedback: NonNullable<
    Awaited<ReturnType<typeof getPracticeSessionView>>
  >["item"]["feedback"];
  choices: { id: string; content: string }[];
  skillTitle: string;
  learningObjective: string;
  questionVersionId: string;
  reflectionPrompt: string | null;
}) {
  if (!feedback) return null;

  return (
    <div className="mt-7 space-y-5 border-t border-[#dce2dd] pt-7">
      <div
        className={`rounded-xl border p-5 ${feedback.correct ? "border-emerald-300 bg-emerald-50" : "border-orange-300 bg-orange-50"}`}
      >
        <p className="text-xs font-bold tracking-[0.12em] uppercase">
          {feedback.correct ? "Correct" : "Not quite yet"}
        </p>
        <h3 className="mt-2 font-serif text-2xl">
          {feedback.correct
            ? "Your reasoning landed on the right result."
            : `Correct answer: ${feedback.correctAnswer}`}
        </h3>
        {feedback.evaluationReason && (
          <p className="mt-2 text-sm">
            Input note: {label(feedback.evaluationReason)}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold">Worked solution</h3>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[#405b5e]">
          {feedback.explanation}
        </p>
      </div>

      {!feedback.correct && feedback.misconceptionAttributions.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-bold text-blue-950">
            Reasoning pattern to revisit
          </h3>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-blue-950">
            {feedback.misconceptionAttributions.map((attribution) => (
              <li key={attribution.id}>{attribution.learnerMessage}</li>
            ))}
          </ul>
        </div>
      )}

      {Object.keys(feedback.distractorRationales).length > 0 && (
        <div>
          <h3 className="text-sm font-bold">Why the other choices miss</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.entries(feedback.distractorRationales).map(
              ([choiceId, rationale]) => (
                <li
                  key={choiceId}
                  className="rounded-xl border border-[#dce2dd] bg-white p-4 text-sm leading-6"
                >
                  <strong className="text-[#116b65]">
                    {choiceId.toLocaleUpperCase("en-US")}.{" "}
                    {choices.find((choice) => choice.id === choiceId)?.content}
                  </strong>
                  <span className="mt-1 block text-[#52676a]">{rationale}</span>
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      <div className="rounded-xl bg-[#e8f2ee] p-4 text-sm">
        <strong>Skill: {skillTitle}</strong>
        <p className="mt-1 leading-6 text-[#47615f]">{learningObjective}</p>
      </div>

      {reflectionPrompt && (
        <div className="rounded-xl border border-[#b9d4cb] bg-white p-4 text-sm">
          <strong>Related follow-up</strong>
          <p className="mt-1 leading-6 text-[#47615f]">{reflectionPrompt}</p>
        </div>
      )}

      <ProblemReportForm
        questionVersionId={questionVersionId}
        attemptId={feedback.attemptId}
      />
    </div>
  );
}

function Stimulus({
  stimulus,
}: {
  stimulus: NonNullable<
    Awaited<ReturnType<typeof getPracticeSessionView>>
  >["item"]["stimulus"];
}) {
  if (!stimulus) return null;
  if (stimulus.type === "graph") {
    return (
      <p className="mt-5 rounded-xl bg-[#edf3ef] p-4 text-sm leading-6">
        Graph description: {stimulus.accessibleDescription}
      </p>
    );
  }
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-xs font-semibold text-[#687a7c]">
          {stimulus.caption}
        </caption>
        <thead>
          <tr>
            {stimulus.columns.map((column) => (
              <th
                key={column}
                className="border border-[#d8ded9] bg-[#edf3ef] px-3 py-2"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stimulus.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${rowIndex}-${cellIndex}`}
                  className="border border-[#d8ded9] px-3 py-2"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#e7efeb] px-2.5 py-1 text-[#47615f]">
      {children}
    </span>
  );
}

function label(value: string) {
  return value.toLocaleLowerCase("en-US").replaceAll("_", " ");
}
