# Learning system

This document is the source of truth for NuraPrep's diagnostic, adaptive practice, timed Math simulation, readiness estimate, and study-plan behavior. These systems are transparent internal baselines. They are not ATI scoring rules, an official score conversion, or claims of measured learning effectiveness.

## Shared evidence model

Learner-facing models use only learner-authorized attempts against current, learner-safe publications. Every practice session stores immutable question-version IDs, so a later content revision cannot rewrite what a learner saw. Evidence includes correctness, recency, internal difficulty, response format, optional confidence, response time, session type, and reviewer-authored misconception mappings.

The system deliberately favors inspectable heuristics while no consented learner-outcome dataset exists. Constants must change under a new model version with regression tests and a written rationale.

## Diagnostic

The short diagnostic samples available published skills and returns conservative skill-level signals rather than declaring mastery from one response. Results identify likely starting points and prerequisite gaps. The interface labels the output as preliminary and separates it from any official ATI result.

## Adaptive practice

`adaptive-baseline-v1` starts every skill with a symmetric `Beta(2, 2)` prior. Attempt evidence decays with a 45-day half-life.

- Correct-answer weights rise from 0.75 at Foundational to 1.5 at Advanced.
- Incorrect-answer weights reverse that scale, from 1.5 at Foundational to 0.75 at Advanced.
- Low-confidence correct answers count less; high-confidence incorrect answers count more.
- The displayed estimate is the posterior mean.
- `min(1, 2 / sqrt(alpha + beta))` communicates evidence scarcity; it is not a calibrated statistical confidence interval.

Review is due immediately after an incorrect latest attempt or when a skill has no evidence. Consecutive correct attempts schedule review after 1, 3, 7, 14, then 30 days.

### Priority calculation

| Component        | Maximum | Meaning                                         |
| ---------------- | ------: | ----------------------------------------------- |
| Estimated need   |    0.40 | One minus the internal skill estimate           |
| Uncertainty      |    0.20 | Sparse or decayed evidence                      |
| Review due       |    0.15 | The spaced-review date has arrived              |
| Misconceptions   |    0.15 | Up to three deterministic misconception matches |
| Prerequisite gap |    0.10 | Largest weighted direct or transitive gap       |

Candidate selection adds 0.12 for an unseen family and 0.05 for an underexposed response format. It subtracts 0.45 for one of the three most recent families and 0.08 per band of distance from the target difficulty.

Safety rules prevent abrupt difficulty jumps, duplicate versions within a session, overconcentration on one skill, and selection of non-current publications. The planner returns an explicit error when no safe candidate exists. Regression tests cover prerequisite traversal, recent-family avoidance, starvation protection, skill concentration, and difficulty jumps.

## Timed Math simulation

The database stores a versioned public exam specification. The current record was last checked against ATI's public TEAS Version 7 Math details on September 5, 2026:

- 38 total questions;
- 34 scored and 4 unscored questions;
- 57 minutes;
- 18 scored Numbers and Algebra questions; and
- 16 scored Measurement and Data questions.

ATI's public domain counts do not assign the four unscored positions. `math-blueprint-v1` allocates them proportionally by largest remainder, producing a 20/18 total split. That split and the internal difficulty rotation are NuraPrep approximations, not official ATI specifications.

Assembly guarantees:

- only current, non-retired learner-safe publications;
- 38 distinct question families and immutable version IDs;
- a hard failure on domain deficits instead of silent substitution;
- reproducible manifests from a supplied random seed; and
- stored assembler version, domain slot, and selection reason for every item.

The server persists the start time and enforces the 57-minute limit after refresh. Late answers are rejected. Explanations remain hidden during the test, answers are saved once, review marks are append-only events, and unanswered items remain explicitly unanswered. Results include topic accuracy, pacing, saved-answer timing, and reviewed explanations.

Browser tests use an isolated `_e2e` database. Their emergency synthetic fixture path exists only for disposable test databases and never enters a development or production learner bank.

## Readiness estimate

`score-baseline-v1` uses attempts from the previous 180 days and keeps only the newest attempt for each immutable question family. This limits repeated-exposure inflation.

Every retained observation includes exact session and version context, domain, skill, difficulty, correctness, timed state, response time, internal pacing target, session type, completion state, and coverage. Timed and untimed accuracy are shown separately; the model does not invent a timed-performance penalty.

Each public scored domain starts with a `Beta(2, 2)` prior. Evidence receives:

- a 60-day recency half-life;
- session weights of 1.0 for a substantially completed full test, 0.7 for a partial test, 0.8 for diagnostic, 0.65 for adaptive, and 0.55 for topic practice; and
- an internal difficulty adjustment of -0.12, -0.04, +0.04, or +0.12 from Foundational through Advanced, clamped to 0–1.

Domain estimates are combined with the scored-domain counts in the latest verified public specification. The displayed 95% internal interval comes from weighted posterior variance. It communicates model uncertainty but is not calibrated against ATI outcomes.

Evidence labels are deterministic:

- **Low:** fewer than 10 unique questions or fewer than 6 effective observations.
- **Developing:** at least 10 unique questions and 6 effective observations.
- **Substantial:** at least 30 unique questions, 20 effective observations, and one practice test with at least 80% saved answers.

“Substantial” describes evidence volume, not external validity. Every estimate is append-only and stores its model version, exact feature snapshot, point estimate, interval, evidence level, and caveats.

## Study plan

`study-plan-v1` ranks up to three skills by weakest difficulty-adjusted estimate and then by evidence need. It proposes 90, 60, and 30 weekly minutes. Learners may edit status, time allocation, weekly budget, and notes without changing the immutable estimate that created the plan.

## Evaluation and future models

Outcome collection is not implemented. Before collecting real TEAS Math outcomes, NuraPrep must add explicit opt-in consent, data minimization, retention/export/deletion rules, access controls, incident handling, and privacy and methodology review. It must never collect recalled ATI item wording, screenshots, or protected exam content.

Evaluation must split data by learner, freeze candidate versions before holdout scoring, and report mean absolute error, calibration by predicted band, interval coverage and width, named-threshold accuracy/sensitivity/specificity, and sufficiently supported subgroup behavior. A more complex ML model is justified only if it improves held-out quality without sacrificing interpretability, privacy, or subgroup performance.

## Current limits

- Difficulty labels and scheduling constants are internal hypotheses.
- The estimate is uncalibrated against real learner outcomes.
- Thresholds vary by nursing program and cannot be presented as a universal pass line.
- The current simulation matches public structure only as far as legally and technically supportable.
- Independent educator review and empirical learning studies remain open.
