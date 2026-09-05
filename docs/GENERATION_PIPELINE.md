# Controlled question-generation pipeline

## Current boundary

NuraPrep now has the intake and dispatch boundary for model-assisted question work. It does not yet call an external generation provider. This is deliberate: queued requests remain `PENDING` with provider `UNCONFIGURED` until a reviewed adapter and credentials exist.

The current slice supports:

- a source and rights register with policy-derived permissions;
- human-authored abstract coverage observations;
- versioned generation templates with explicit owner approval evidence;
- full-question, explanation-only, and distractor-only regeneration requests;
- stable idempotency keys, immutable request identity, and per-request cost ceilings;
- a provider-neutral TypeScript interface and worker orchestrator;
- strict structured-output, answer-contract, symbolic-math, misconception, and regeneration-scope checks; and
- atomic candidate persistence with database-enforced one-way completion linked to exactly one generated candidate version.

No action in the reviewer UI fetches source pages, stores source question text, or sends content to a model.

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

## Request lifecycle

1. The reviewer selects an approved template matching the question's skill and response format.
2. They select full revision, explanation only, or distractors only and enter a concrete instruction.
3. The server creates a SHA-256 idempotency key over the source version, template, scope, normalized instruction, and cost ceiling.
4. A duplicate submission resolves to the existing request.
5. The worker asks the provider for a worst-case estimate and rejects the request before dispatch when it exceeds the stored ceiling.
6. Provider output is treated as untrusted. Its usage accounting, complete candidate schema, answer contract, symbolic math, misconception rules, and requested regeneration scope must pass.
7. Success atomically writes exactly one complete linked candidate version and then closes the run. Partial fields never overwrite the source version.
8. The candidate remains `DRAFT`, with no copied validations or review decisions.
9. Deterministic checks and human review must pass before a separate publication action can expose it to learners.

PostgreSQL prevents request-identity edits, deletion, repeated terminal transitions, cost-overrun records, multiple candidates for one run, and successful runs without a linked candidate version.

The provider envelope carries the stable run ID and idempotency key so adapters can propagate the same key to providers that support idempotent requests. The database uniqueness boundary still protects candidate persistence when delivery is repeated.

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
- batch budgets, rate controls, cancellation, and operational metrics;
- independent owner/educator approval of the 12-case engineering-draft gold evaluation set; and
- recurring-feedback proposals that create, but never auto-approve, new template or rubric versions.
