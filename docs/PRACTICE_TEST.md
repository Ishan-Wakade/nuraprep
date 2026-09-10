# Timed Math simulation

The timed simulation is an independent NuraPrep experience. It does not reproduce ATI questions, expose an official score conversion, or claim an official difficulty distribution.

## Versioned specification

The current database seed records the public ATI TEAS Version 7 Math details last verified on September 5, 2026:

- 38 total questions;
- 34 scored and 4 unscored questions;
- 57 minutes; and
- 18 scored Numbers and Algebra questions plus 16 scored Measurement and Data questions.

The record retains its source URL, verification timestamp, reviewer identity, status, and notes. A changed public specification should create or update reviewed configuration before assembly behavior changes.

## Internal approximation

The public domain counts cover the 34 scored questions but do not place the four unscored slots. `math-blueprint-v1` allocates those four slots proportionally using largest remainders. The current two-domain result is 20 Numbers and Algebra and 18 Measurement and Data questions.

This 20/18 total distribution is an internal approximation. NuraPrep does not describe it as an official ATI blueprint. Likewise, the assembler cycles across available internal difficulty and response-format strata without claiming an official difficulty ratio.

## Assembly invariants

- Only current, non-retired learner-safe publications are candidates.
- Every test uses 38 distinct question families and immutable version IDs.
- A domain deficit blocks test creation; the assembler never silently substitutes across domains.
- A supplied random seed makes a completed manifest reproducible.
- Every saved item records the assembler version, seed, domain slot, and selection rationale.

## Exam-mode behavior

- The persisted server start time and 57-minute limit recover the timer after refresh or navigation.
- The server rejects late answer submissions and the client requests expiry as soon as the recovered countdown reaches zero.
- Answers are saved once and explanations remain hidden while the test is in progress.
- Learners can navigate among all items and append mark/unmark review events without rewriting history.
- Explicit submission leaves unanswered items unscored; it does not silently mark them wrong.
- After completion, learners can review explanations, topic results, saved-answer timing, wall-clock time, and items exceeding internal pacing targets.

## Test fixtures versus production content

The browser suite uses the reproducible 38-family reviewed development snapshot for full-test assembly. Its setup still contains a fail-safe path that creates additional synthetic families only when a disposable test database has fewer than 38 non-test publications. Any fallback records carry explicit test-only provenance, validation evidence, review decisions, and publication attribution; they are never seeded into a normal development or production database and never count toward content readiness.
