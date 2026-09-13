# Content system

This document is the source of truth for NuraPrep's Math taxonomy, question model, provenance rules, deterministic validation, human review, publication boundary, source register, and generation pipeline.

NuraPrep is independent and does not reproduce third-party questions or present its material as official ATI content. Public exam specifications and lawfully usable resources may inform high-level coverage only under recorded, fail-closed permissions.

## Domain model

### Exam specifications and skills

`ExamSpecification` versions external structure, timing, scored/unscored counts, response formats, source URL, verification date, reviewer, and status. `Skill` is a stable taxonomy node with section, domain, topic, subtopic, learning objective, source-alignment notes, active dates, and weighted prerequisite edges.

Practice-test manifests reference one specification version. Question versions link to one primary skill plus optional secondary and prerequisite skills.

### Sources and coverage observations

`SourceArtifact` records canonical URL, publisher, title, artifact type, access class, terms and license evidence, robots/access findings, content hash when permitted, allowed uses, reviewer decision, rationale, recheck date, and takedown state.

Unlicensed source-question text is not retained. `CoverageObservation` stores only a reviewer-authored abstraction such as “multi-step percent change in a practical context”—never source wording, values, choices, explanation, or distinctive structure.

### Templates and generation runs

`GenerationTemplate` is immutable and versioned. It declares target skill, response type, difficulty, parameter constraints, explanation and distractor requirements, prohibited patterns, originality controls, validator contract, and review status.

`GenerationRun` records an idempotency key, request scope, requester, source version when applicable, provider/model, template version, prompt hash, sanitized parameters, seed, hard cost ceiling, timestamps, usage, outcome, and parent run. Queue execution adds worker identity, an opaque claim token, lease expiry, heartbeat, and attempt count. Only the current claim token can complete a running job; success requires one complete linked candidate version.

Secrets and hidden provider reasoning are never stored or exposed in the reviewer console.

### Questions and versions

`Question` is a stable family. Each append-only `QuestionVersion` contains:

- prompt and optional accessible stimulus/table/graph data;
- one response type: single choice, multiple select, numeric, or ordered response;
- stable choice IDs and a typed answer specification;
- a safe deterministic verification recipe when supported;
- worked explanation and distractor rationales;
- skills, prerequisites, learning objective, difficulty rationale, time target, and calculator policy;
- misconception codes and explicit matching rules;
- provenance and generation/human-author metadata;
- validation and review state; and
- version, supersession, and retraction history.

Correctness never depends on display order. Bar-graph payloads are deliberately narrow—title, labeled axes, and two to eight unique nonnegative values—and share a semantic exact-value table between learner and reviewer views.

### Review, feedback, and publication

`ReviewDecision` is append-only and records the exact version, reviewer, rubric scores, decision, notes, and timestamp. Decisions are `APPROVED`, `NEEDS_REVISION`, or `REJECTED`.

`ReviewerFeedback` and learner reports retain exact-version evidence and category. Recurring signals may create an `ImprovementProposal` only after at least two matching open records. Proposal evidence freezes the source kind, version, and displayed text. A separate decision may approve the plan, but approval never edits a template, validator, rubric, policy, evaluation case, or question automatically.

An edit creates a new version. `QuestionPublication` separately identifies the one current learner-visible version in a family and keeps retired history. Approval does not equal publication.

## Source and rights policy

Automated collection is allowed only after recording publisher, canonical URL, license and terms, robots/access controls, access class, allowed uses, rate/recheck details, reviewer, and rationale. NuraPrep never bypasses paywalls, authentication, CAPTCHAs, rate limits, or other controls. Public visibility does not imply permission to store, redistribute, quote, or use material as model input.

| Decision            | Metadata | Abstract coverage | Storage | Quotation | Model input |
| ------------------- | -------- | ----------------- | ------- | --------- | ----------- |
| `METADATA_ONLY`     | yes      | no                | no      | no        | no          |
| `COVERAGE_ANALYSIS` | yes      | yes               | no      | no        | no          |
| `LICENSED_STORAGE`  | yes      | yes               | yes     | no        | no          |
| `QUARANTINED`       | yes      | no                | no      | no        | no          |
| `EXCLUDED`          | no       | no                | no      | no        | no          |

`LICENSED_STORAGE` requires recorded permission and a reviewed terms URL; it still does not infer quotation or model-input rights. Paid, account-gated, or user-submitted material is licensed, quarantined, or excluded.

The operational register at `/review/sources` is authoritative and surfaces overdue rechecks. A recheck appends the previous and new permission state in one transaction and never silently expands allowed use.

### Bounded source log

Last desk review: September 5, 2026.

| Source                                                                                                                            | Decision            | Allowed use                                                  |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------ |
| [ATI TEAS Version 7 content outline](https://www.atitesting.com/docs/default-source/teas-resources/ati_teas7_content_outline.pdf) | `COVERAGE_ANALYSIS` | Human abstraction of high-level objectives only              |
| [ATI TEAS exam details](https://www.atitesting.com/teas/exam-details)                                                             | `METADATA_ONLY`     | Section logistics metadata only                              |
| [ATI practice-test help](https://help.atitesting.com/teas/teas-prep/teas-practice-test/)                                          | `EXCLUDED`          | No downstream use; do not inspect protected practice content |
| [Mometrix TEAS Math landing page](https://www.mometrix.com/academy/teas-math-practice-test/)                                      | `METADATA_ONLY`     | Publisher, URL, access state, and rights decision only       |
| [Union Test Prep TEAS landing page](https://uniontestprep.com/teas/practice-test)                                                 | `METADATA_ONLY`     | Publisher, URL, access state, and rights decision only       |
| [TEAS Practice Test Math landing page](https://www.teaspracticetest.com/teas-math/)                                               | `QUARANTINED`       | Discovery metadata only                                      |

Other search results remain unreviewed leads. They cannot influence generation until the source register contains current, conservative permission evidence.

## Validation

NuraPrep separates validation, review, and publication. Mathematical correctness alone cannot establish clarity, alignment, accessibility, originality, or educational value.

Two automated checks currently gate publication:

- `answer-contract` validates response shape, stable IDs, displayed and numeric distinctness, unit aliases, choice sets, distractor mappings, table/graph structure, misconception rules, and internal duplicate signals.
- `mathematical-correctness` executes a bounded structured recipe and compares the result with the keyed answer.

The verifier never evaluates arbitrary JavaScript or model-written code. Supported operations include bounded reverse-Polish arithmetic, candidate-expression equivalence, exhaustive candidate checks for linear inequalities, numeric ordering, and mean/median/range. Malformed or unsupported recipes fail closed.

Misconception attribution also fails closed. A reviewer maps a particular distractor, omitted choice, numeric result, reversal, or numeric-input error to a declared code and teaching message. The matching evidence is copied into the immutable attempt. No LLM infers a diagnosis from free text.

Tutor guidance is a versioned, bounded sequence of reviewer-authored Socratic hints. The server releases one requested step at a time and logs an append-only interaction. Answers stay hidden until the learner submits.

Internal originality screening compares NuraPrep families using normalized exact text, number-invariant fingerprints, phrase containment, and structured stimuli. These are rejection signals, not legal proof of originality.

Seven advisory human rubrics can add evidence for difficulty, reading level, calculator policy, explanation consistency, accessibility, topic alignment, and originality. The MVP publication policy requires the final owner decision; these granular rubrics remain optional follow-up evidence for a second reviewer or educator. Rubrics are themselves immutable and versioned.

### Publication sequence

1. Create an immutable draft version.
2. Run deterministic checks against that exact version.
3. Record an explicit owner decision with useful notes.
4. Optionally append the seven detailed human-review records.
5. Publish the exact eligible version as a separate owner action.

PostgreSQL enforces one current publication, append-only identity and attribution, non-synthetic approval, and current validator evidence. Drafts, approved-but-unpublished versions, retired versions, synthetic fixtures, and versions missing required evidence cannot enter the learner bank.

## Deterministic generation

NuraPrep currently uses a no-cost deterministic Math variant engine. A provider-neutral model-assisted queue exists, but no external generation adapter is configured; those requests remain `PENDING` with provider `UNCONFIGURED`.

The deterministic engine uses versioned templates, reproducible SHA-256 seeds, structural-diversity caps, corpus duplicate checks, typed answer contracts, math proofs, and explicit misconception rules. A failed or exhausted slot is reported instead of silently downgraded.

```bash
# Read-only pilot
pnpm questions:variants:dry-run --count=8 --seed=reviewed-pilot-v1

# Explicitly stage the same candidates as unpublished drafts
pnpm questions:variants:stage -- --confirm-stage-drafts --count=8 --seed=reviewed-pilot-v1

# Rebuild and audit every deterministic draft without writing
pnpm questions:variants:audit

# Report capacity without claiming it as approved inventory
pnpm questions:variants:capacity -- --target=1000
```

Staging takes an advisory transaction lock, rechecks the corpus, rejects partial batches, records provenance and validation evidence, and creates new `DRAFT` families. It creates no human decision or publication. The idempotency key prevents a replay from silently producing a different batch.

The 51 current templates cover all 12 Math leaf skills and declare 1,008 bounded semantic structures before rejection: 440 numeric, 300 single choice, 128 multiple select, and 140 ordered response. Number swaps do not increase declared capacity.

The MVP release reproducibly selects 432 variants and publishes them alongside the 38-family owner-reviewed foundation, producing 470 active Math families. The generated expansion is owner-authorized and machine-validated—not independently educator-reviewed, empirically calibrated, or proof that every theoretical structure is acceptable.

### Review sampling

The representative queue selects one stable-hash anchor per template. The broader quality sample adds a finite-population hash-ranked sample, extra Advanced/multiple-select/ordered/table/graph candidates, and malformed or missing prompt-hash records. Its 95%/5% defect-detection framing is a transparent planning model, not approval inheritance or random educational validation. Every decision still applies to one exact version.

## Future provider boundary

A future external adapter must receive only NuraPrep-authored material and permitted abstract coverage notes, validate structured output, record provider/model/prompt hash/sanitized parameters/usage/cost/request ID, enforce timeouts/retries/idempotency/cost ceilings, treat output as untrusted, and remain unable to publish.

Queue requests use atomic claims, expiring leases, heartbeats, stale-claim fencing, terminal one-way state, a maximum of 20 reviewer requests per hour, bounded batches, and reservation of each job's full worst-case cost ceiling.

Full-question, explanation-only, and distractor-only regeneration all create complete new versions. Scope checks reject hidden changes.

## Controlled improvement loop

1. Store categorized feedback against an exact immutable version.
2. Triage impact and recurring-pattern codes.
3. Group recurring issues without changing prompts automatically.
4. Create a versioned proposal linked to frozen evidence.
5. Add regression cases before implementation.
6. Generate or revise candidates.
7. Compare automated evidence and human review.
8. Publish only separately approved exact versions.

## Current limits and release facts

- The 470-family bank passed schema, answer-contract, programmatic-math, provenance, release-decision, and configured internal-similarity gates.
- Owner approval and machine checks are not independent educator review, legal advice, difficulty calibration, accessibility validation in context, or measured learning efficacy.
- A recipe proves that the stored answer matches a declared computation; a reviewer must still confirm that the computation matches the prompt.
- The 12-case Math gold set runs in CI but remains `ENGINEERING_DRAFT` pending independent owner or educator review.
- Provider execution, licensed artifact ingestion, malware scanning, durable queue monitoring, and legally permitted external similarity corpora remain open.
- Rights-holder concerns trigger immediate quarantine or retraction while audit history is preserved.

Allowed public language includes “independent,” “original,” and “TEAS Math preparation.” Never claim “official,” “actual TEAS questions,” “identical to the exam,” guaranteed outcomes, or ATI endorsement.
