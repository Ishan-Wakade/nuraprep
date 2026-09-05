# Adaptive practice baseline

`adaptive-baseline-v1` is NuraPrep's first deterministic scheduler. It is intentionally simple enough to inspect, reproduce, and test before learner-outcome data exists. It is not an ATI scoring model and its constants are internal product hypotheses.

## Inputs

The planner reads only learner-authorized attempt history and current learner-safe publications:

- correctness, timestamp, internal difficulty, response type, and optional confidence;
- deterministic misconception attributions;
- internal prerequisite edges with strengths from 1 to 3; and
- candidate question family, immutable version, response type, and difficulty.

The selected immutable version IDs and a complete score explanation are saved with the practice session. Later publication changes therefore cannot rewrite a learner's session.

## Skill estimate

Each skill starts with a symmetric `Beta(2, 2)` prior, which has a mean of 0.5 and deliberately high uncertainty. Attempt evidence decays with a 45-day half-life.

Correct answers receive weights from 0.75 at Foundational through 1.5 at Advanced. Incorrect answers reverse that scale, from 1.5 at Foundational through 0.75 at Advanced. Optional confidence adjusts evidence modestly: low-confidence correct answers count less, while high-confidence incorrect answers count more. This is a transparent heuristic, not a calibrated mastery probability.

The displayed internal estimate is the posterior mean. The uncertainty indicator is `min(1, 2 / sqrt(alpha + beta))`; it communicates evidence scarcity but is not a statistical confidence interval.

## Review timing

- an incorrect latest attempt is due immediately;
- consecutive correct attempts schedule review after 1, 3, 7, 14, then 30 days; and
- a skill with no evidence is due immediately.

These intervals are conservative defaults. Outcome studies are required before claiming that they optimize retention.

## Priority score

The skill score is the sum of five bounded components:

| Component        | Maximum contribution | Interpretation                                  |
| ---------------- | -------------------- | ----------------------------------------------- |
| Estimated need   | 0.40                 | One minus the internal estimate                 |
| Uncertainty      | 0.20                 | Sparse or decayed evidence                      |
| Review due       | 0.15                 | Spaced-review date has arrived                  |
| Misconceptions   | 0.15                 | Up to three deterministic misconception matches |
| Prerequisite gap | 0.10                 | Largest weighted direct or transitive skill gap |

Candidate adjustments add 0.12 for an unseen family and 0.05 for an underexposed response format. They subtract 0.45 for one of the three most recent families and 0.08 per band of distance from the target difficulty.

## Safety and diversity constraints

- Difficulty may move by at most one internal band from the latest attempt in that skill.
- A question version cannot repeat inside one session.
- No skill can occupy more than half a session while alternatives exist.
- Current publication status is checked before every assembly.
- The planner returns an honest error when no candidate satisfies the safety rules.

Regression tests cover prerequisite traversal, recent-family avoidance, unseen-skill starvation protection, per-skill concentration, and abrupt difficulty jumps.

## Evaluation and changes

Before changing weights or intervals, add a failing evaluation case that captures the intended behavior. A future version should be compared on completion, learning gain, delayed retention, calibration, and subgroup outcomes. Do not replace this baseline with a learned model until there is enough consented outcome data to evaluate it reliably.
