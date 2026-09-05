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
- [x] Build a local reviewer browse/filter/preview/version/feedback/decision flow.
- [x] Add safe deterministic math recipes, reviewer-attested evidence, and an explicit publication ledger.
- [ ] Add safe regeneration controls after the provider-neutral generation boundary exists.
- [ ] Add reviewer search over submitted feedback and recurring error summaries.
- Hand-author a small gold evaluation set spanning the Math taxonomy.

**Exit:** a reviewer can trace, validate, revise, compare, and approve a question; learner APIs cannot read drafts. Seed candidates are intentionally unapproved and remain blocked from publication until every validator and human-review requirement passes.

## 2. Topic-practice vertical slice

- [x] Add development identity and learner profile.
- [x] Implement persisted session assembly by topic, difficulty, item type, missed/new, and timed/untimed filters.
- [x] Build accessible renderers for choice, multiple-select, numeric, ordered, and table/graph content.
- [x] Show correctness, worked solution, per-choice rationales, and the underlying skill.
- [x] Add exact-version learner problem reporting and append-only owner triage.
- [x] Add deterministic, reviewer-authored misconception attribution without model guessing.
- Add hint-first tutor contracts with answer-reveal controls and safety logging.

**Exit:** a learner completes a reviewed multi-format practice session end to end and reports an issue.

## 3. Diagnostic and adaptive practice

- Assemble a short diagnostic with explicit coverage and stopping rules.
- Implement prerequisite graph traversal, mastery estimates, confidence input, and uncertainty.
- Implement inspectable adaptive priorities and spaced-review scheduling.
- Add selection-reason logs and tests against starvation, repetition, and abrupt difficulty jumps.

**Exit:** diagnostic results produce a clear starting point; adaptive practice reacts predictably to seeded learner histories.

## 4. Timed Math simulation

- Add a versioned 38-question, 57-minute specification based on currently verified official public details.
- Build blueprint-constrained assembly with no repeated question family.
- Implement timer recovery, navigation, review flags, submission, pacing analytics, and topic results.
- Label distribution and difficulty as internal approximations where official detail is unavailable.

**Exit:** at least one full test can be assembled from approved items and completed without repeats under tested timer behavior.

## 5. Transparent score estimate and study plan

- Implement a calibrated-accuracy baseline with topic/difficulty inputs, timed context, evidence thresholds, and uncertainty intervals.
- Explain estimate limits in plain language and generate an editable study plan.
- Define outcome-consent, calibration, MAE, interval coverage, and threshold evaluation protocols.

**Exit:** estimates are reproducible, versioned, uncertainty-aware, and never represented as official ATI scores.

## 6. Generation pipeline and scale

- Implement the source/license registry and permitted acquisition adapters.
- Add versioned templates, batch generation, idempotent jobs, validator evidence, originality checks, and cost controls.
- Add recurring-error summaries and regression suites; keep prompt/rubric changes human-approved.
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
