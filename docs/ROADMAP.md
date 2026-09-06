# Delivery roadmap

Each milestone ends with formatted code, passing lint/type/tests/build, updated documentation, recorded assumptions, and one or more coherent commits. Dates are intentionally omitted until velocity is measured.

## 0. Public foundation — complete

- Create the public repository, project identity, governance files, CI, dependency updates, and issue templates.
- Publish architecture, data model, content-provenance policy, security posture, and this roadmap.
- Ship a polished responsive product shell with honest “in development” copy and screenshots.

**Exit:** clean checkout passes all quality gates; repository metadata and branch protection are configured; no unsupported product claims.

## 1. Content foundation and reviewer slice

- [x] Implement PostgreSQL and the typed schema for taxonomy, sources, question versions, validators, and reviews.
- [x] Seed the sourced TEAS Math specification and an initial topic taxonomy.
- [x] Implement typed answer contracts for single choice, multiple select, numeric, ordered, and table/graph items.
- [x] Build deterministic answer parsing and content-contract validators for arithmetic, rational numbers, units, constraints, and answer uniqueness.
- [x] Reject malformed numeric grouping, duplicate display options, equivalent numeric distractors, and duplicate unit aliases.
- [x] Build a local reviewer browse/filter/preview/version/feedback/decision flow.
- [x] Add safe deterministic math recipes, reviewer-attested evidence, and an explicit publication ledger.
- [x] Require structured exact-version, current-rubric, and independent-judgment attestations for reviewer validator evidence.
- [x] Show the exact active validator version and rubric description before reviewer evidence is submitted.
- [x] Make difficulty calibration, reading level, and calculator policy explicit publication-blocking reviewer checks.
- [x] Add safe regeneration controls after the provider-neutral generation boundary exists.
- [x] Add reviewer search over learner/reviewer feedback with recurring error summaries.
- [x] Hand-author an engineering-draft gold evaluation case for every current Math leaf skill and execute it against deterministic contracts.
- [x] Surface per-leaf candidate, current-publication, and learner-safe format coverage in the reviewer queue.
- [ ] Obtain independent owner/educator review before treating the engineering-draft gold set as benchmark truth.

**Exit:** a reviewer can trace, validate, revise, compare, and approve a question; learner APIs cannot read drafts. Seed candidates are intentionally unapproved and remain blocked from publication until every validator and human-review requirement passes.

## 2. Topic-practice vertical slice

- [x] Add development identity and learner profile.
- [x] Implement persisted session assembly by topic, difficulty, item type, missed/new, and timed/untimed filters.
- [x] Build accessible renderers for choice, multiple-select, numeric, ordered, and table/graph content.
- [x] Show correctness, worked solution, per-choice rationales, and the underlying skill.
- [x] Add exact-version learner problem reporting and append-only owner triage.
- [x] Add deterministic, reviewer-authored misconception attribution without model guessing.
- [x] Add server-controlled, reviewer-authored hint ladders with append-only request logging and post-answer reflection prompts.
- [ ] Add a provider-neutral conversational tutor only after prompt-injection, answer-reveal, and retention controls are reviewed.

**Exit:** a learner completes a reviewed multi-format practice session end to end and reports an issue.

## 3. Diagnostic and adaptive practice

- [x] Assemble a short diagnostic with explicit published-skill coverage and stopping rules.
- [x] Capture optional confidence and return conservative per-skill signals with an explicit uncertainty warning.
- [x] Implement prerequisite graph traversal and evidence-weighted mastery estimates.
- [x] Implement inspectable adaptive priorities and spaced-review scheduling.
- [x] Add versioned selection-reason logs and tests against starvation, repetition, and abrupt difficulty jumps.

**Exit:** diagnostic results produce a clear starting point; adaptive practice reacts predictably to seeded learner histories.

## 4. Timed Math simulation

- [x] Add a versioned 38-question, 57-minute specification based on currently verified official public details.
- [x] Build blueprint-constrained assembly with no repeated question family.
- [x] Implement timer recovery, navigation, append-only review flags, submission, pacing analytics, and topic results.
- [x] Label distribution and difficulty as internal approximations where official detail is unavailable.

**Exit status:** the complete flow is verified with disposable browser-test fixtures. Production exit remains open until at least 38 genuinely reviewed question families satisfy the same blueprint; test-only fixture approvals do not count as production content review.

## 5. Transparent score estimate and study plan

- [x] Implement a calibration-ready accuracy baseline with topic/difficulty inputs, timed context, evidence thresholds, and uncertainty intervals.
- [x] Explain estimate limits in plain language and generate an editable study plan.
- [x] Define outcome-consent, calibration, MAE, interval coverage, and threshold evaluation protocols.

**Exit:** estimates are reproducible, versioned, uncertainty-aware, and never represented as official ATI scores. External predictive validation remains explicitly open until consented learner outcomes exist.

## 6. Generation pipeline and scale

- [x] Implement a fail-closed source/license registry and abstract coverage-intake workflow.
- [x] Add a provider-neutral boundary, versioned template approval, idempotent regeneration requests, immutable lifecycle controls, and per-request cost ceilings.
- [x] Add a strict bodyless metadata acquisition adapter contract that rejects returned content bodies.
- [x] Add budgeted provider-worker orchestration and atomic, one-candidate-only draft persistence with regeneration-scope enforcement.
- [x] Add atomic worker claims, expiring leases, heartbeats, and stale-worker completion fencing.
- [x] Add max-job and conservative worst-case-cost budgets for each queue batch.
- [x] Bound generation execution to three attempts and terminally fail exhausted stale leases.
- [x] Add reviewer-attributed, reason-required cancellation for pending generation requests.
- [x] Surface queue status, stale lease, outcome, and conservative cost metrics to reviewers.
- [x] Add internal exact, number-invariant, and phrase-overlap rejection signals to deterministic review evidence.
- [ ] Add a reviewed network transport and licensed-storage adapter; do not enable collection from gated or unclear-rights sources.
- [ ] Add a configured provider and production queue host, wall-clock rate controls, and calibration cases for originality thresholds.
- [x] Add recurring-error summaries and evidence-backed, separately approved improvement proposals that never auto-mutate prompts or rubrics.
- [ ] Implement approved proposals only through reviewed version changes and regression suites.
- Expand only at the rate human review and quality sampling can support.

**Exit:** a batch moves from approved inputs through checks and review without copying source content or silently publishing failures.

## 7. Authentication and account lifecycle

- Threat-model Google OAuth and session handling.
- Add sign-in, logout, role enforcement, progress persistence, export, and deletion.
- Add CSRF/state/nonce protections, secure cookies, session rotation, audit events, and abuse controls.

**Exit:** authorization tests cover learner/reviewer/admin boundaries and deletion behavior is documented and verified.

## 8. Billing

- Define free and paid entitlements without dark patterns.
- Implement Stripe-hosted checkout, customer portal, signed idempotent webhooks, subscription synchronization, and test clocks.
- Keep raw card data out of NuraPrep systems.

**Exit:** test-mode lifecycle covers purchase, renewal, failure, cancellation, refund, replay, and out-of-order webhook delivery.

## 9. AWS staging and production readiness

- Add infrastructure as code for app hosting, RDS, S3, secrets, logs, alarms, backups, IAM, and budgets.
- Separate staging/production, run restore and teardown drills, and document expected cost before approval.
- Complete privacy policy, terms, accessibility audit, load test, incident runbook, and launch checklist.

**Exit:** staging passes security, backup/restore, observability, accessibility, and cost reviews before any production approval.

## Later sections

Reading, Science, and English/Language Usage use the same versioned specification, taxonomy, content, validation, review, practice, and analytics contracts. Section-specific renderers and validators are added one section at a time only after Math is shipped and reviewed.
