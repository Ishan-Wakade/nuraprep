# Score estimation and study planning

`score-baseline-v1` is a deterministic, calibration-ready estimate of Math readiness on NuraPrep's reviewed blueprint. It is not an ATI scaled-score conversion, an official ATI score, or a guarantee of exam performance. No learner-outcome dataset exists yet, so the interface states that the model is unvalidated and shows uncertainty prominently.

## Evidence contract

The estimator uses attempts from the previous 180 days that map to a domain in the latest verified Math specification. It keeps only the newest attempt for each immutable question family so repeated exposure cannot multiply the apparent evidence.

Each retained attempt records:

- immutable session, question, and question-version context;
- content domain, skill, and internal difficulty;
- correctness and submission time;
- timed or untimed context;
- saved-answer time and the reviewed item-time target; and
- session type, completion state, and completion coverage.

Timed and untimed accuracy are retained and displayed separately. Pacing is reported as the share of timed answers saved within internal item targets. The baseline does not apply an invented timed-performance penalty.

## Transparent baseline

For each public scored domain, the model starts with a Beta(2, 2) prior. Every retained attempt receives:

- exponential recency weight with a 60-day half-life;
- evidence weight 1.0 for a substantially completed full practice test, 0.7 for a partial test, 0.8 for the diagnostic, 0.65 for adaptive practice, and 0.55 for topic practice; and
- an internal difficulty normalization of -0.12, -0.04, +0.04, or +0.12 for Foundational through Advanced, clamped to the 0–1 outcome range.

These constants are product hypotheses, not learned parameters. Any change requires a new model version and regression cases.

Domain posterior means are combined using the scored-domain counts in the latest verified public specification. Learner sample proportions therefore cannot silently replace the public content weighting. The overall interval is an approximate 95% internal uncertainty interval calculated from the weighted domain posterior variances. It is not a statistically calibrated confidence interval for an ATI result.

Evidence labels are deterministic:

- **Low:** fewer than 10 unique questions or less than 6 effective observations.
- **Developing:** at least 10 unique questions and 6 effective observations.
- **Substantial:** at least 30 unique questions, 20 effective observations, and one completed practice test with at least 80% of answers saved.

“Substantial” describes evidence volume only; it does not mean the model is externally validated.

## Persistence and study plan

Every generated estimate is an append-only database record containing the model version, point estimate, interval, evidence level, exact feature snapshot, and caveats. Refreshing creates a new record rather than rewriting history.

`study-plan-v1` orders up to three skills by the weakest difficulty-adjusted estimate, breaking ties with evidence need. The initial weekly allocation is 90, 60, and 30 minutes. Learners can edit status, per-skill minutes, total weekly budget, and personal notes. Study-plan edits do not alter the estimate that produced the plan.

## Outcome consent and calibration protocol

Outcome collection is not implemented yet. Before it is enabled, NuraPrep must add a separate opt-in flow that:

1. explains the precise research and product-improvement purpose;
2. collects only the Math outcome fields needed for calibration, the exam date, and the estimate version being evaluated;
3. does not request or retain ATI questions, screenshots, or recalled item wording;
4. separates consent from access to core practice features and permits later withdrawal;
5. defines retention, export, deletion, access-control, and incident-response behavior; and
6. receives privacy, security, and methodology review.

Evaluation must split data by learner, freeze each candidate model version before scoring the holdout set, and report:

- mean absolute error;
- calibration by predicted-score band;
- empirical coverage and average width of the displayed interval;
- accuracy, sensitivity, and specificity at explicitly named learner or program thresholds; and
- performance and interval coverage across sufficiently supported subgroups.

Thresholds vary by nursing program and must not be labeled as a universal TEAS pass line. Sample-size and subgroup-support gates must be defined during the reviewed study design rather than invented after seeing results. A more complex ML model is justified only if it improves held-out calibration and error without degrading interpretability, privacy, or subgroup behavior.
