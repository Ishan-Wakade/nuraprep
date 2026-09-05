import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getQuestionReviewDetail } from "@/data/reviewer";

import { DecisionForm, FeedbackForm, RevisionForm } from "./review-forms";

export default async function QuestionReviewPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;
  const question = await getQuestionReviewDetail(versionId);
  if (!question) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/review" className="text-sm font-semibold text-[#116b65]">
        ← Back to review queue
      </Link>
      <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold tracking-wide uppercase">
            <Badge>{question.skillTitle}</Badge>
            <Badge>{label(question.questionType)}</Badge>
            <Badge>{label(question.difficulty)}</Badge>
            <Badge>Version {question.version}</Badge>
          </div>
          <h1 className="mt-4 font-serif text-3xl tracking-[-0.03em] sm:text-4xl">
            Review question version
          </h1>
          <p className="mt-2 text-sm text-[#637679]">
            <code>{question.slug}</code> · {question.versionId}
          </p>
        </div>
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-bold ${question.publicationGate.publishable ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-900"}`}
        >
          {question.publicationGate.publishable
            ? "Eligible for publication"
            : `${question.publicationGate.blockers.length} publication blockers`}
        </div>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-6">
          <Panel title="Learner preview" eyebrow="Rendered content">
            <p className="text-lg font-semibold leading-8">{question.prompt}</p>
            {question.stimulus?.type === "table" && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <caption className="mb-2 text-left text-xs font-semibold text-[#687a7c]">
                    {question.stimulus.caption}
                  </caption>
                  <thead>
                    <tr>
                      {question.stimulus.columns.map((column) => (
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
                    {question.stimulus.rows.map((row, rowIndex) => (
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
            )}
            {question.stimulus?.type === "graph" && (
              <p className="mt-4 rounded-lg bg-[#edf3ef] p-3 text-sm">
                Graph description: {question.stimulus.accessibleDescription}
              </p>
            )}
            {question.choices && (
              <ol className="mt-5 grid gap-3 sm:grid-cols-2">
                {question.choices.map((choice) => (
                  <li
                    key={choice.id}
                    className="rounded-xl border border-[#d8ded9] bg-[#fafbf8] px-4 py-3 text-sm"
                  >
                    <span className="mr-2 font-bold text-[#116b65]">
                      {choice.id.toUpperCase()}.
                    </span>
                    {choice.content}
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel
            title="Answer and teaching content"
            eyebrow="Reviewer-only key"
          >
            <KeyValue label="Answer contract">
              <CodeBlock value={question.answerSpec} />
            </KeyValue>
            <KeyValue label="Worked explanation">
              <p className="leading-7">{question.explanation}</p>
            </KeyValue>
            <KeyValue label="Distractor rationales">
              <CodeBlock value={question.distractorRationales} />
            </KeyValue>
          </Panel>

          <Panel title="Review decision" eyebrow="Immutable audit event">
            <DecisionForm versionId={question.versionId} />
          </Panel>
          <Panel
            title="Structured feedback"
            eyebrow="Controlled improvement loop"
          >
            <FeedbackForm versionId={question.versionId} />
          </Panel>
          <Panel title="Create a revision" eyebrow="Append-only editing">
            <RevisionForm
              versionId={question.versionId}
              prompt={question.prompt}
              choices={question.choices ?? null}
              answerSpec={question.answerSpec}
              explanation={question.explanation}
              distractorRationales={question.distractorRationales}
              difficulty={question.difficulty}
              difficultyRationale={question.difficultyRationale}
              estimatedSeconds={question.estimatedSeconds}
            />
          </Panel>
        </div>

        <aside className="space-y-5">
          <SidePanel title="Publication gate">
            <ul className="space-y-2 text-xs">
              {question.publicationGate.blockers.length ? (
                question.publicationGate.blockers.map((blocker) => (
                  <li
                    key={blocker}
                    className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900"
                  >
                    ○ {label(blocker.replace(":", " · "))}
                  </li>
                ))
              ) : (
                <li className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                  ✓ Every required gate passes
                </li>
              )}
            </ul>
          </SidePanel>
          <SidePanel title="Metadata">
            <dl className="space-y-3 text-xs">
              <Meta
                term="Learning objective"
                value={question.learningObjective}
              />
              <Meta
                term="Difficulty rationale"
                value={question.difficultyRationale}
              />
              <Meta
                term="Estimated time"
                value={`${question.estimatedSeconds} seconds`}
              />
              <Meta
                term="Calculator"
                value={label(question.calculatorPolicy)}
              />
              <Meta
                term="Authoring"
                value={`${label(question.authoringMode)} · ${question.authorId ?? question.generationRunId ?? "unknown"}`}
              />
            </dl>
          </SidePanel>
          <SidePanel title="Validation evidence">
            <ul className="space-y-2 text-xs">
              {question.validations.length ? (
                question.validations.map((run) => (
                  <li
                    key={run.id}
                    className="flex items-center justify-between rounded-lg border border-[#e2e6e2] px-3 py-2"
                  >
                    <span>
                      {run.key} v{run.version}
                    </span>
                    <strong
                      className={
                        run.outcome === "PASS"
                          ? "text-emerald-700"
                          : "text-red-700"
                      }
                    >
                      {run.outcome}
                    </strong>
                  </li>
                ))
              ) : (
                <li className="text-[#687a7c]">No validator runs.</li>
              )}
            </ul>
          </SidePanel>
          <SidePanel title="Provenance">
            {question.sources.map((source) => (
              <div
                key={source.id}
                className="mb-3 rounded-lg border border-[#e2e6e2] p-3 text-xs"
              >
                <a
                  href={source.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#116b65]"
                >
                  {source.title} ↗
                </a>
                <p className="mt-1 text-[#687a7c]">
                  {source.relationship} · {source.decision}
                </p>
                <p className="mt-2 leading-5">{source.transformationNotes}</p>
                <p className="mt-2 font-semibold">
                  Model input:{" "}
                  {source.allowModelInput ? "permitted" : "not permitted"}
                </p>
              </div>
            ))}
          </SidePanel>
          <SidePanel title="Version history">
            <div className="flex flex-wrap gap-2">
              {question.versions.map((version) => (
                <Link
                  key={version.id}
                  href={`/review/questions/${version.id}`}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold ${version.id === question.versionId ? "border-[#116b65] bg-[#e8f3ef] text-[#116b65]" : "border-[#d8ded9]"}`}
                >
                  v{version.version}
                </Link>
              ))}
            </div>
          </SidePanel>
          <SidePanel title="Audit history">
            <p className="text-xs text-[#687a7c]">
              {question.decisions.length} decisions · {question.feedback.length}{" "}
              feedback items
            </p>
            {question.decisions.slice(0, 3).map((decision) => (
              <div
                key={decision.id}
                className="mt-3 border-t border-[#e2e6e2] pt-3 text-xs"
              >
                <strong>{label(decision.decision)}</strong>
                <p className="mt-1 leading-5">{decision.notes}</p>
              </div>
            ))}
          </SidePanel>
        </aside>
      </div>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#d8ded9] bg-[#fffdf8] p-5 shadow-sm sm:p-7">
      <p className="text-[10px] font-bold tracking-[0.14em] text-[#116b65] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-serif text-2xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
function SidePanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#d8ded9] bg-[#fffdf8] p-4 shadow-sm">
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[#e7efeb] px-2.5 py-1 text-[#47615f]">
      {children}
    </span>
  );
}
function KeyValue({
  label: keyLabel,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-[#e2e6e2] py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-xs font-bold tracking-wide text-[#52676a] uppercase">
        {keyLabel}
      </h3>
      {children}
    </div>
  );
}
function CodeBlock({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-[#15383a] p-4 font-mono text-xs leading-5 text-[#e8f3ef]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
function Meta({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="font-bold text-[#52676a]">{term}</dt>
      <dd className="mt-1 leading-5">{value}</dd>
    </div>
  );
}
function label(value: string) {
  return value.toLocaleLowerCase("en-US").replaceAll("_", " ");
}
