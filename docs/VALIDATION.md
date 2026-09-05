# Question validation and publication

NuraPrep separates validation, review, and publication. A question can be mathematically correct without being clear, original, accessible, or aligned, so no single check is treated as sufficient.

## Evidence classes

Two checks are currently automated:

- `answer-contract` validates the response type, stable identifiers, choice set, distractor mappings, and table shape.
- `mathematical-correctness` executes a safe structured verification recipe and compares the computed result with the keyed answer.

The math verifier does not evaluate arbitrary JavaScript or model-written code. Its supported recipes are a bounded reverse-Polish arithmetic expression, equivalence checks across candidate expressions, numeric ordering, and mean/median/range operations. Unsupported or malformed recipes fail closed.

Four checks require explicit reviewer evidence:

- `explanation-consistency`
- `accessibility`
- `topic-alignment`
- `originality`

The reviewer records a pass or failure with written evidence. A failure requires a stable error code. Every run is append-only, and the newest run for each validator determines publication readiness.

## Publication sequence

1. Create or revise an immutable question version.
2. Run deterministic checks against that exact version.
3. Record the four reviewer-only checks.
4. Record an approval decision with rubric scores and notes.
5. Publish the exact eligible version as a separate owner action.

Publication creates an attributed ledger record and activates the question family. Publishing a newer eligible version retires the previous ledger record without deleting it. A database trigger prevents rewriting publication identity or attribution and prevents retired records from changing.

Learner selection will join only the single current publication record. Drafts, approved-but-unpublished versions, retired versions, and versions missing any required evidence remain outside the learner bank.

## Current limits

- Verification recipes establish that a stored answer matches a declared calculation; a reviewer must still confirm that the recipe faithfully represents the written prompt.
- Originality is reviewer-attested until a legally permitted comparison corpus and calibrated similarity thresholds exist.
- Reading-level and broader accessibility automation will supplement, not replace, reviewer evidence in a later validation milestone.
- Seed candidates are development fixtures. They are not human-reviewed or production-approved.
