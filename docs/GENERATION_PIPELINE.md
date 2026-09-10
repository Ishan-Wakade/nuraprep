# Controlled question-generation pipeline

## Current boundary

NuraPrep has both a no-cost deterministic variant engine and the intake and dispatch boundary for future model-assisted question work. It does not call an external generation provider. This is deliberate: queued model requests remain `PENDING` with provider `UNCONFIGURED` until a reviewed adapter and credentials exist.

The current slice supports:

- a source and rights register with policy-derived permissions;
- human-authored abstract coverage observations;
- versioned generation templates with explicit owner approval evidence;
- approved-proposal-to-draft template revisions with immutable implementation and regression evidence;
- full-question, explanation-only, and distractor-only regeneration requests;
- stable idempotency keys, immutable request identity, and per-request cost ceilings;
- a provider-neutral TypeScript interface and worker orchestrator;
- atomic queue claims with worker attribution, expiring leases, heartbeats, and stale-claim fencing;
- conservative batch limits that cap both claimed job count and the sum of worst-case per-job cost ceilings;
- strict structured-output, answer-contract, symbolic-math, misconception, and regeneration-scope checks; and
- atomic candidate persistence with database-enforced one-way completion linked to exactly one generated candidate version.

It also supports a deterministic path with versioned Math templates, reproducible SHA-256 seeds, structural-diversity limits, current-bank duplicate checks, and the same content, answer-contract, symbolic-math, and misconception validators used elsewhere in the application. Dry runs write nothing; an explicit staging command can persist accepted candidates as unreviewed drafts.

No action in the reviewer UI fetches source pages, stores source question text, or sends content to a model.

## Deterministic Math variants

Run a local pilot against the latest real Math corpus with:

```bash
pnpm questions:variants:dry-run --count=8 --seed=reviewed-pilot-v1
```

The command requires `DATABASE_URL`, emits a JSON quality report, and writes nothing to PostgreSQL. Each accepted candidate records its template key and version, target skill, batch and candidate seeds, selected parameters, canonical content hash, deterministic validation result, internal similarity signals, and an explicit statement that source-question text was not provided.

A slot is rejected and retried when the template output is malformed, violates its declared type or difficulty, fails content or answer validation, fails deterministic mathematics, contains invalid misconception behavior, reuses a structure within the batch, or triggers an internal duplicate signal against the current corpus or earlier accepted variants. An exhausted slot is reported rather than silently replaced with a lower-quality item.

After inspecting a dry-run report, stage the same bounded pilot with:

```bash
pnpm questions:variants:stage -- --confirm-stage-drafts --count=8 --seed=reviewed-pilot-v1
```

The confirmation phrase is mandatory. Staging takes a database-wide advisory transaction lock, rechecks the current corpus, rejects partial batches, records the governed outline link and complete deterministic provenance, appends both required automated validation events, and creates each candidate as a new `DRAFT` family. It creates no review decision and no publication. Replaying the same template/version/seed/count returns the existing completed batch instead of generating a new batch against the changed corpus; reusing a seed with a different count or incomplete history fails closed.

The registry now contains at least one bounded template for every Math leaf skill. Its 23 current templates declare a theoretical capacity of 448 before rejection: 240 numeric-response structures, 100 single-choice structures, 48 multiple-select structures, and 60 ordered-response structures. Capacity is based on declared semantic context/frame combinations; parameter or number swaps do not increase it. The two reasoning-expansion passes add triangle area, a missing rectangle dimension, equivalent ratios, mixed-rational ordering, signed change, two-plan break-even equations, equivalent unit conversions, and event-likelihood ordering. Every family carries a deterministic answer proof. Four replay-protected pilots have staged 176 validated but unreviewed drafts: 24 from the first three-template pass, 96 from the full-taxonomy pass, 24 from a format-diversity pass, and 32 from the first four-template reasoning expansion. The staged set contains 120 numeric, 24 single-choice, 16 multiple-select, and 16 ordered-response drafts. The second four-template expansion has passed isolated eight-item dry runs but has not yet been persisted. Replaying every persisted recent batch created zero duplicates. This proves the generation, rejection, persistence, and replay-protection machinery; it does **not** mean thousands of questions are currently approved. Scaling responsibly requires multiple reasoning families and balanced response formats per skill, representative human sampling, and learner-performance calibration. Deterministic acceptance is an engineering gate, not human publication approval.

Run the honest capacity and gap report with:

```bash
pnpm questions:variants:capacity -- --target=1000
```

The target is a planning input, not an official requirement. The report compares current and published families with registered template capacity, uncovered leaf skills, and capacity by response format. Capacity is an upper bound; it is never labeled as accepted, reviewed, or published inventory.

## Source intake

Each source starts with a canonical HTTPS URL, publisher, title, access class, policy decision, rationale, reviewer, and optional recheck date. The server derives permissions from the decision instead of accepting independent permission checkboxes.

Default decisions fail closed:

| Decision            | Metadata | Abstract coverage | Storage | Quotation | Model input |
| ------------------- | -------- | ----------------- | ------- | --------- | ----------- |
| `METADATA_ONLY`     | yes      | no                | no      | no        | no          |
| `COVERAGE_ANALYSIS` | yes      | yes               | no      | no        | no          |
| `LICENSED_STORAGE`  | yes      | yes               | yes     | no        | no          |
| `QUARANTINED`       | yes      | no                | no      | no        | no          |
| `EXCLUDED`          | no       | no                | no      | no        | no          |

`LICENSED_STORAGE` requires recorded license/permission text and a reviewed terms URL. It still does not infer quotation or model-input rights. Those rights need a later explicit legal-policy workflow.

Paid, account-gated, and user-submitted sources may only be licensed, quarantined, or excluded. The application does not bypass authentication, paywalls, CAPTCHAs, rate limits, or technical controls.

## Abstract coverage notes

A reviewer may map a source to a taxonomy skill only when `allowCoverageAnalysis` is true. They must attest that the note is their own abstraction and contains no source-question wording, values, answer choices, or distinctive structure. The note stores that attestation method and reviewer identity.

This is not a license workaround. A reviewer should use high-level observations such as “multi-step percent-change interpretation appears in this topic” rather than reconstructing an item.

## Template approval

Templates are versioned. A draft becomes dispatchable only after the owner records evidence that they checked its target skill, instructions, parameter constraints, prohibited patterns, and validator contract. Changes to instructions require a new template version; approval does not make generated output learner-safe.

An approved feedback proposal targeting a generation template may create the next draft revision through a separate transaction. An advisory lock serializes revisions of the same template key, and the database requires the selected base to remain current, the result to be a scope-preserving consecutive draft, at least one versioned content field to change, and the authenticated implementer to match the new author. The proposal approval, implementation evidence, and later template approval are deliberately separate audit events.

## Request lifecycle

1. The reviewer selects an approved template matching the question's skill and response format.
2. They select full revision, explanation only, or distractors only and enter a concrete instruction.
3. The server creates a SHA-256 idempotency key over the source version, template, scope, normalized instruction, and cost ceiling.
4. A duplicate submission resolves to the existing request.
5. A worker atomically claims one eligible request with `FOR UPDATE SKIP LOCKED`, records its identity and attempt number, and receives a unique expiring claim token. A batch may claim the request only when its full stored cost ceiling fits the remaining batch budget.
6. The worker asks the provider for a worst-case estimate and rejects the request before dispatch when it exceeds the stored ceiling.
7. Provider output is treated as untrusted. Its usage accounting, complete candidate schema, answer contract, symbolic math, misconception rules, and requested regeneration scope must pass.
8. Success atomically writes exactly one complete linked candidate version and then closes the run. Partial fields never overwrite the source version.
9. The candidate remains `DRAFT`, with no copied validations or review decisions.
10. Deterministic checks and human review must pass before a separate publication action can expose it to learners.

PostgreSQL prevents request-identity edits, deletion, repeated terminal transitions, cost-overrun records, multiple candidates for one run, and successful runs without a linked candidate version.

The provider envelope carries the stable run ID and idempotency key so adapters can propagate the same key to providers that support idempotent requests. The database uniqueness boundary still protects candidate persistence when delivery is repeated.

Only a current, unexpired claim token may load, heartbeat, complete, or fail a running job. Expiry itself fences worker writes, and terminal persistence locks the run row so it cannot race with reclaim or exhaustion. Provider timeouts must remain shorter than the lease or the host queue must renew it; heartbeat calls are bounded to 30–900 seconds. Claim tokens are operational secrets and are not displayed in the reviewer console.

A run receives at most three execution attempts: the initial claim and up to two reclaims after lease expiry. Before claiming work, the repository sweeps up to 100 expired runs that have exhausted this cap into an immutable `LEASE_ATTEMPTS_EXHAUSTED` failure while preserving the last worker and claim attribution. The production queue host must also invoke the exported sweep on its schedule so exhaustion does not depend only on new claim traffic.

A reviewer may cancel only a still-pending request. Cancellation requires a 20–2,000 character reason and stores the authenticated reviewer identity; the database rejects missing evidence, cancellation after a worker claim, and any later mutation of the terminal audit record.

Provider-bound generation requests are limited to twenty per reviewer per hour in shared PostgreSQL storage. The existing per-run micro-cost ceiling remains authoritative; this request limiter protects queue/provider churn but does not replace aggregate budget controls or worker-side wall-clock rate limits.

The reviewer console reports global queue counts, stale leases, historical retry exhaustion, active worst-case cost exposure, recorded provider-cost estimates, and terminal outcomes. These are operational indicators; cost figures are explicitly not represented as billing truth.

Batch accounting reserves each claimed job's full cost ceiling rather than optimistic estimated spend. `maxJobs` is bounded to 100, the batch budget is bounded to the corresponding 500,000,000-micro ceiling, and the runner stops when no eligible job fits the remaining budget. Actual provider usage is still recorded per run. This is a safety budget, not billing or a claim of provider-price accuracy.

Explanation-only regeneration may change only the explanation. Distractor-only regeneration is limited to choice items, preserves the correct answer and its content, and may change only distractor choices and their rationales. Any hidden change fails the worker before persistence.

## Provider adapter requirements

Before an external adapter is enabled, it must prove that it:

- receives only NuraPrep-authored question content, approved template controls, and human-authored abstract coverage notes;
- never receives unlicensed source-question text;
- validates structured output before persistence;
- records provider, model, prompt hash, sanitized parameters, token use, cost, and provider request identifier where available;
- enforces timeout, retry, idempotency, and cost behavior;
- treats provider output as untrusted data; and
- cannot publish a result.

## Still open

- a configured provider adapter and queue runner;
- licensed-storage ingestion with malware scanning and object-storage isolation;
- calibration of the implemented internal exact, number-invariant, and phrase-overlap signals, plus any legally permitted external comparison corpus;
- a production exhaustion-sweep schedule, wall-clock rate controls, durable time-series metrics, and alerts;
- independent owner/educator approval of the 12-case engineering-draft gold evaluation set; and
- equivalent implementation paths for approved validator, rubric, policy, and evaluation-case proposals; generation-template proposals now create separately reviewed draft revisions, never automatic approvals.
