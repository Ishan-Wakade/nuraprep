import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuestionStimulus } from "@/components/question-stimulus";
import { getPracticeSessionView } from "@/data/practice";

import { AnswerForm } from "./answer-form";
import { PracticeTestControls } from "./practice-test-controls";
import { ProblemReportForm } from "./problem-report-form";
import { SessionTimer } from "./session-timer";
import { TutorPanel } from "./tutor-panel";

export const metadata: Metadata = {
  title: "Practice session",
};

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
        : session.mode === "PRACTICE_TEST"
          ? "Timed Math test"
          : "Topic practice";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/practice" className="text-sm font-bold text-[#116b65]">
            ← Practice home
          </Link>
          <p className="mt-5 text-xs font-bold tracking-[0.12em] text-[#52676a] uppercase">
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
          sessionId={session.id}
          expireOnZero={session.mode === "PRACTICE_TEST"}
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
            aria-label={`Question ${position.position}${position.flagged ? ", marked for review" : ""}`}
            className={`grid h-9 w-9 place-items-center rounded-lg border text-xs font-bold ${
              position.position === question.position
                ? "border-[#116b65] bg-[#116b65] text-white"
                : position.flagged
                  ? "border-amber-400 bg-amber-50 text-amber-900"
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

      {session.mode === "PRACTICE_TEST" && session.status === "IN_PROGRESS" && (
        <PracticeTestControls
          sessionId={session.id}
          sessionItemId={question.itemId}
          flagged={question.flagged}
          answeredCount={session.answeredCount}
          questionCount={session.actualQuestionCount}
        />
      )}

      <section className="mt-6 rounded-2xl border border-[#d6ddd7] bg-[#fffdf8] p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-[11px] font-bold tracking-wide uppercase">
            <Badge>{question.skillTitle}</Badge>
            <Badge>{label(question.questionType)}</Badge>
            <Badge>{label(question.calculatorPolicy)}</Badge>
          </div>
          <span className="text-xs text-[#52676a]">
            Internal target: {question.estimatedSeconds} sec
          </span>
        </div>

        <h2 className="mt-6 max-w-3xl text-xl font-semibold leading-8 sm:text-2xl sm:leading-9">
          {question.prompt}
        </h2>
        <QuestionStimulus stimulus={question.stimulus} />

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
        ) : session.mode === "PRACTICE_TEST" && question.answered ? (
          <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
            Answer saved. Correctness and explanations stay hidden until the
            test is submitted.
          </div>
        ) : session.status === "IN_PROGRESS" ? (
          <>
            {question.tutor && session.mode !== "PRACTICE_TEST" && (
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
              submitLabel={
                session.mode === "PRACTICE_TEST"
                  ? "Save answer and continue"
                  : "Check answer"
              }
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
