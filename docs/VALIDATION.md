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

Seven checks require explicit reviewer evidence:

- `difficulty-calibration`
- `reading-level`
- `calculator-policy`
- `explanation-consistency`
- `accessibility`
- `topic-alignment`
- `originality`

The difficulty check uses NuraPrep's internal reasoning-step and prerequisite rubric; it is not presented as an official ATI difficulty label. Reading-level review separates necessary mathematical vocabulary from avoidable language complexity. Calculator-policy review checks the stored designation against the arithmetic load and documented exam-mode assumptions.

The reviewer records a pass or failure with at least 40 characters of written evidence and must attest that they inspected the exact version, applied the current selected rubric, and made an independent judgment rather than accepting automation or model output alone. A failure requires a stable error code, while a pass rejects contradictory failure metadata. Every run is append-only, and the newest run for each validator determines publication readiness.

## Publication sequence

1. Create or revise an immutable question version.
2. Run deterministic checks against that exact version.
3. Record the seven reviewer-only checks.
4. Record an approval decision with rubric scores and notes.
5. Publish the exact eligible version as a separate owner action.

Publication creates an attributed ledger record and activates the question family. Publishing a newer eligible version retires the previous ledger record without deleting it. A database trigger prevents rewriting publication identity or attribution and prevents retired records from changing.

Learner selection will join only the single current publication record. Drafts, approved-but-unpublished versions, retired versions, and versions missing any required evidence remain outside the learner bank.

## Current limits

- Verification recipes establish that a stored answer matches a declared calculation; a reviewer must still confirm that the recipe faithfully represents the written prompt.
- A non-matching wrong answer receives no misconception label. Missing evidence is preferable to an unsupported diagnosis.
- Internal originality signals are intentionally conservative and uncalibrated. Human originality review remains required, and no external source text is retained merely to create a comparison corpus.
- Reading-level and broader accessibility automation will supplement, not replace, reviewer evidence in a later validation milestone.
- Seed candidates are development fixtures. They are not human-reviewed or production-approved.
- The 12-case Math gold set spans every current leaf skill and executes in CI, but remains labeled `ENGINEERING_DRAFT` until independent owner or educator review.
