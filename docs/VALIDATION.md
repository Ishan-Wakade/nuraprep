# Question validation and publication

NuraPrep separates validation, review, and publication. A question can be mathematically correct without being clear, original, accessible, or aligned, so no single check is treated as sufficient.

## Evidence classes

Two checks are currently automated:

- `answer-contract` validates the response type, stable identifiers, distinct displayed and numeric-equivalent choices, numeric unit aliases and comma grouping, choice set, distractor mappings, table shape, deterministic misconception rules, and internal near-duplicate rejection signals.
- `mathematical-correctness` executes a safe structured verification recipe and compares the computed result with the keyed answer.

The math verifier does not evaluate arbitrary JavaScript or model-written code. Its supported recipes are a bounded reverse-Polish arithmetic expression, equivalence checks across candidate expressions, numeric ordering, and mean/median/range operations. Unsupported or malformed recipes fail closed.

Misconception attribution also fails closed. A reviewer must explicitly map a selected distractor, omitted correct choice, numeric value, reversed ordered pair, or numeric-input error to a declared misconception code and learner-facing teaching message. Matching rules are copied into the immutable attempt record. NuraPrep does not infer a learner misconception from free-form text or an LLM response.

Tutor guidance uses a bounded, versioned sequence of reviewer-authored Socratic questions or hints plus a post-answer reflection prompt. The server releases one requested step at a time and stores an append-only interaction event. The answer contract validates the structure and stable identifiers; the human explanation-consistency review remains responsible for checking pedagogy and answer leakage.

The internal similarity pass compares different NuraPrep question families using exact normalized text, a number-invariant fingerprint, and five-token phrase containment. A blocking match fails the automated evidence, but a low score is not treated as proof of legal originality. Prior versions in the same family are excluded so legitimate revision history remains possible.

Seven additional checks can record explicit reviewer evidence:

- `difficulty-calibration`
- `reading-level`
- `calculator-policy`
- `explanation-consistency`
- `accessibility`
- `topic-alignment`
- `originality`

The difficulty check uses NuraPrep's internal reasoning-step and prerequisite rubric; it is not presented as an official ATI difficulty label. Reading-level review separates necessary mathematical vocabulary from avoidable language complexity. Calculator-policy review checks the stored designation against the arithmetic load and documented exam-mode assumptions.

For the MVP release policy, the final owner decision is the required human judgment. These seven detailed rubric checks are advisory and can be added when a second reviewer, educator, or targeted QA pass is available; they do not block release. When submitted, the reviewer records a pass or failure with at least 40 characters of written evidence per rubric and attests that they inspected the exact version, applied every displayed current rubric, and made an independent judgment. One submission inserts seven separate append-only audit records in a transaction. A failure requires a stable error code, while a pass rejects contradictory failure metadata.

Reviewer rubrics are themselves immutable versioned records. Activating a changed rubric atomically retires the previous version, requires change rationale and an explicit evidence-invalidation attestation, and leaves only one active version per key. A pass under a retired rubric is stale advisory evidence. Automated-rule changes remain code-managed because their descriptions must stay synchronized with deterministic implementations and tests.

## Publication sequence

1. Create or revise an immutable question version.
2. Run deterministic checks against that exact version.
3. Record an explicit owner approval decision with rubric scores and notes.
4. Optionally complete the consolidated reviewer form to add seven more granular QA records.
5. Publish the exact eligible version as a separate owner action.

The current-version queue can be filtered to `Human needed` as an optional follow-up worklist, and every detail page links to the next candidate lacking a complete set of detailed checks. This navigation is derived from the latest run under each active reviewer rubric; stale, failed, or missing evidence remains visible without blocking an owner-approved MVP release.

Review decisions and validator runs expose an immutable generated `synthetic` classification derived from their original actor, notes, and structured evidence context. Development and production readiness queries exclude synthetic records; the isolated browser-test environment may include them so CI can exercise the complete publication flow. Because the classification is generated by PostgreSQL from append-only evidence, the migration labels historical test records without rewriting their audit history.

Publication creates an attributed ledger record and activates the question family. Publishing a newer eligible version retires the previous ledger record without deleting it. A database trigger prevents rewriting publication identity or attribution and prevents retired records from changing. Outside the isolated test environment, learner queries also require the exact published version's latest genuine decision to remain approved. A migration retires legacy current publications that are synthetic or no longer satisfy that approval invariant while preserving their history.

Learner selection will join only the single current publication record. Drafts, approved-but-unpublished versions, retired versions, and versions missing any required evidence remain outside the learner bank.

## Current limits

- Verification recipes establish that a stored answer matches a declared calculation; a reviewer must still confirm that the recipe faithfully represents the written prompt.
- A non-matching wrong answer receives no misconception label. Missing evidence is preferable to an unsupported diagnosis.
- Internal originality signals are intentionally conservative and uncalibrated. Targeted human originality review remains recommended, and no external source text is retained merely to create a comparison corpus.
- Reading-level and broader accessibility automation will supplement, not replace, reviewer evidence in a later validation milestone.
- Seed candidates begin as development fixtures and remain unpublished until an owner records an explicit decision.
- The 12-case Math gold set spans every current leaf skill and executes in CI, but remains labeled `ENGINEERING_DRAFT` until independent owner or educator review.
