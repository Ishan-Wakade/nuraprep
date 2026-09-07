import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getQuestionReviewDetail } from "@/data/reviewer";

import {
  AutomatedValidationForm,
  DecisionForm,
  FeedbackForm,
  LearnerReportTriageForm,
  PublishForm,
  RegenerationRequestForm,
  ReviewerValidationForm,
  RevisionForm,
} from "./review-forms";

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
      <section
        aria-label="Review workflow navigation"
        className="mt-5 rounded-2xl border border-[#c9d9d3] bg-[#f4faf7] p-4 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-bold tracking-wide text-[#116b65] uppercase">
                Latest-version review progress
              </p>
              <p className="text-xs text-[#52676a]">
                {question.reviewNavigation.reviewed}/
                {question.reviewNavigation.total} latest candidates have a
                decision
              </p>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-[#dbe7e1]"
              role="progressbar"
              aria-label="Latest candidates reviewed"
              aria-valuemin={0}
              aria-valuemax={question.reviewNavigation.total}
              aria-valuenow={question.reviewNavigation.reviewed}
            >
              <div
                className="h-full rounded-full bg-[#116b65]"
                style={{
                  width: `${question.reviewNavigation.total ? (question.reviewNavigation.reviewed / question.reviewNavigation.total) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-[#52676a]">
              {question.reviewNavigation.unreviewed} unreviewed ·{" "}
              {question.reviewNavigation.needsRevision} need revision
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/review?status=UNREVIEWED"
              className="rounded-lg border border-[#9fc9bd] bg-white px-3 py-2 text-xs font-bold text-[#116b65]"
            >
              View unreviewed
            </Link>
            {question.reviewNavigation.nextNeedsRevision && (
              <Link
                href={`/review/questions/${question.reviewNavigation.nextNeedsRevision.versionId}`}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900"
                title={`${question.reviewNavigation.nextNeedsRevision.skillTitle}: ${question.reviewNavigation.nextNeedsRevision.slug}`}
              >
                Next needing revision
              </Link>
            )}
            {question.reviewNavigation.nextUnreviewed && (
              <Link
                href={`/review/questions/${question.reviewNavigation.nextUnreviewed.versionId}`}
                className="rounded-lg bg-[#116b65] px-3 py-2 text-xs font-bold text-white"
                title={`${question.reviewNavigation.nextUnreviewed.skillTitle}: ${question.reviewNavigation.nextUnreviewed.slug}`}
              >
                Next unreviewed →
              </Link>
            )}
          </div>
        </div>
      </section>
      {!question.reviewNavigation.currentIsLatest &&
        question.reviewNavigation.latestFamilyVersion && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            You are inspecting historical version {question.version}. New review
            work should normally target the latest version.{" "}
            <Link
              href={`/review/questions/${question.reviewNavigation.latestFamilyVersion.id}`}
              className="font-bold underline"
            >
              Open version{" "}
              {question.reviewNavigation.latestFamilyVersion.version}
            </Link>
            .
          </div>
        )}
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
          <p className="mt-2 text-sm text-[#52676a]">
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
                  <caption className="mb-2 text-left text-xs font-semibold text-[#52676a]">
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
            <KeyValue label="Deterministic math verification">
              <CodeBlock value={question.verificationSpec} />
            </KeyValue>
            <KeyValue label="Worked explanation">
              <p className="leading-7">{question.explanation}</p>
            </KeyValue>
            <KeyValue label="Distractor rationales">
              <CodeBlock value={question.distractorRationales} />
            </KeyValue>
            <KeyValue label="Deterministic misconception rules">
              <CodeBlock value={question.misconceptionRules} />
            </KeyValue>
            <KeyValue label="Tutor guidance">
              <CodeBlock value={question.tutorGuidance} />
            </KeyValue>
          </Panel>

          <Panel title="Review decision" eyebrow="Immutable audit event">
            <DecisionForm versionId={question.versionId} />
          </Panel>
          <Panel title="Automated validation" eyebrow="Reproducible evidence">
            <AutomatedValidationForm versionId={question.versionId} />
          </Panel>
          <Panel title="Reviewer validation" eyebrow="Human-only checks">
            <ReviewerValidationForm
              versionId={question.versionId}
              validators={question.activeReviewerValidators}
            />
          </Panel>
          <Panel title="Publication" eyebrow="Explicit release gate">
            <PublishForm
              versionId={question.versionId}
              disabled={!question.publicationReadiness.publishable}
              alreadyPublished={
                question.currentPublication?.questionVersionId ===
                question.versionId
              }
            />
          </Panel>
          <Panel
            title="Learner problem reports"
            eyebrow="Version-linked evidence"
          >
            {question.learnerReports.length ? (
              <div className="space-y-4">
                {question.learnerReports.map((report) => (
                  <article
                    key={report.id}
                    className="rounded-xl border border-[#d8ded9] bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm">
                        {label(report.category)}
                      </strong>
                      <span className="rounded-full bg-[#edf3ef] px-2.5 py-1 text-[11px] font-bold text-[#47615f]">
                        {label(report.currentStatus)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6">{report.details}</p>
                    <p className="mt-2 text-xs text-[#52676a]">
                      {report.learnerName} · exact attempt {report.attemptId} ·{" "}
                      {report.createdAt}
                    </p>
                    {report.events.length > 0 && (
                      <ol className="mt-3 space-y-2 border-t border-[#e2e6e2] pt-3 text-xs">
                        {report.events.slice(0, 3).map((event) => (
                          <li key={event.id}>
                            <strong>{label(event.status)}</strong> by{" "}
                            {event.reviewerId}: {event.notes}
                          </li>
                        ))}
                      </ol>
                    )}
                    <LearnerReportTriageForm
                      reportId={report.id}
                      questionVersionId={question.versionId}
                      currentStatus={report.currentStatus}
                    />
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#52676a]">
                No learner has reported this exact question version.
              </p>
            )}
          </Panel>
          <Panel
            title="Structured feedback"
            eyebrow="Controlled improvement loop"
          >
            <FeedbackForm versionId={question.versionId} />
          </Panel>
          <Panel title="Regenerate" eyebrow="Controlled candidate request">
            <RegenerationRequestForm
              versionId={question.versionId}
              templates={question.approvedTemplates}
            />
            {question.regenerationRuns.length > 0 && (
              <ol className="mt-5 space-y-2 border-t border-[#e2e6e2] pt-4 text-xs text-[#52676a]">
                {question.regenerationRuns.map((run) => (
                  <li key={run.id}>
                    <strong>{label(run.status)}</strong> ·{" "}
                    {label(run.requestKind)} · {run.provider}/{run.model} ·
                    ceiling ${(run.maxCostMicros / 1_000_000).toFixed(4)}
                    {run.cancellationReason && (
                      <span className="mt-1 block text-red-700">
                        Cancelled by {run.cancelledBy}: {run.cancellationReason}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <Panel title="Create a revision" eyebrow="Append-only editing">
            <RevisionForm
              versionId={question.versionId}
              prompt={question.prompt}
              choices={question.choices ?? null}
              answerSpec={question.answerSpec}
              verificationSpec={question.verificationSpec ?? null}
              commonMisconceptions={question.commonMisconceptions}
              misconceptionRules={question.misconceptionRules}
              tutorGuidance={question.tutorGuidance ?? null}
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
              {question.generationRunId && (
                <>
                  <Meta
                    term="Generation model"
                    value={`${question.generationProvider ?? "unknown provider"} · ${question.generationModel ?? "unknown model"}`}
                  />
                  <Meta
                    term="Template"
                    value={`${question.generationTemplateKey ?? "unknown"} v${question.generationTemplateVersion ?? "?"}`}
                  />
                  <Meta
                    term="Prompt hash"
                    value={question.generationPromptHash ?? "unknown"}
                  />
                </>
              )}
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
                      {!run.active && " · retired rubric"}
                    </span>
                    <strong
                      className={
                        !run.active
                          ? "text-amber-700"
                          : run.outcome === "PASS"
                            ? "text-emerald-700"
                            : "text-red-700"
                      }
                    >
                      {run.active ? run.outcome : "STALE"}
                    </strong>
                  </li>
                ))
              ) : (
                <li className="text-[#52676a]">No validator runs.</li>
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
                <p className="mt-1 text-[#52676a]">
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
          <SidePanel title="Publication history">
            {question.publications.length ? (
              <ul className="space-y-2 text-xs">
                {question.publications.map((publication) => (
                  <li
                    key={publication.id}
                    className="rounded-lg border border-[#e2e6e2] px-3 py-2"
                  >
                    <strong>
                      {publication.retiredAt ? "Retired" : "Current"}
                    </strong>
                    <p className="mt-1 text-[#52676a]">
                      {publication.questionVersionId === question.versionId
                        ? `This version · ${publication.publishedAt}`
                        : publication.publishedAt}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#52676a]">
                No version in this family has been published.
              </p>
            )}
          </SidePanel>
          <SidePanel title="Audit history">
            <p className="text-xs text-[#52676a]">
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
    <pre
      tabIndex={0}
      className="overflow-x-auto rounded-xl bg-[#15383a] p-4 font-mono text-xs leading-5 text-[#e8f3ef]"
    >
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
