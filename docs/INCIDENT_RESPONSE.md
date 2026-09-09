# Incident response runbook

## Purpose and current boundary

This runbook defines how NuraPrep should detect, contain, investigate, recover from, and learn from security, privacy, availability, billing, cost, and educational-content incidents. It is an operating procedure, not evidence that production monitoring or a staffed response rotation exists. Before launch, the owner must assign named responders, notification channels, legal escalation contacts, and time-zone coverage.

Never paste credentials, access tokens, learner answers, account exports, identity documents, raw database rows, or unnecessary personal data into a public GitHub issue. Keep sensitive evidence in an approved restricted system with an explicit retention period.

## Severity and stop conditions

| Severity | Examples                                                                                                                                         | Initial objective                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| SEV-1    | Confirmed credential or learner-data exposure; unauthorized reviewer/admin access; incorrect Stripe charges at scale; destructive database event | Stop exposure or financial harm immediately and preserve evidence |
| SEV-2    | Sustained outage; widespread sign-in failure; wrong answer or score logic affecting many learners; backup or restore failure                     | Stabilize the service and identify affected scope                 |
| SEV-3    | Degraded latency; isolated billing-sync failure; small set of bad questions; elevated error or cost signal                                       | Limit growth, repair safely, and monitor                          |
| SEV-4    | Cosmetic defect, documentation error, or low-risk operational warning                                                                            | Track through normal engineering work                             |

Immediately stop a release or disable the affected capability if correctness, authorization, privacy, payment state, or recoverability is uncertain. Do not keep generation, publication, billing, or score estimates active merely to preserve availability.

## First 15 minutes

1. Open a private incident record with start time, reporter, symptoms, affected environment, current commit/image digest, and provisional severity.
2. Assign one incident lead. Other responders report findings to that person rather than making independent production changes.
3. Preserve relevant logs, alarm state, deployment events, Stripe event IDs, and database timestamps. Do not copy raw secrets or full payloads.
4. Contain the narrowest unsafe boundary: pause a deployment, set desired task count, disable billing/generation through reviewed configuration, revoke a role/session, retract a question publication, or isolate database access.
5. Verify containment with a direct observable check. A configuration change alone is not proof.
6. Record every command, console mutation, approver, and timestamp. Prefer reviewed infrastructure or application changes over undocumented console edits.

## Scenario playbooks

### Account, session, or role compromise

- Revoke affected sessions and role grants; verify database state directly.
- If an auth secret may be exposed, rotate it and end all sessions. If the Server Action key may be exposed, coordinate a new build and every running task so mixed keys are never served.
- Review `account_audit_events`, role-grant history, reviewer decisions, publication history, and generation requests for the affected internal principal.
- Retract questionable publications without deleting their history.
- Do not restore reviewer/admin access until the root cause and identity-verification path are understood.

### Google OAuth credential or callback incident

- Disable Google sign-in or remove the compromised client from active deployment configuration.
- Rotate the client secret in Google and the deployment secret store; do not commit it.
- Verify exact callback origins, HTTPS, session issuance, and denied/replayed callback behavior before re-enabling.
- Treat provider compromise separately from local session compromise; revoke both where scope is uncertain.

### Stripe or entitlement incident

- Disable new Checkout/Portal entry points if session creation is unsafe; preserve signed webhook ingestion when doing so is necessary to receive cancellation or correction events.
- Compare Stripe's current subscription object with the local projection using IDs, event creation time, and processed receipt IDs—never card data.
- Prefer a correcting provider event or idempotent resynchronization over hand-editing entitlement rows.
- Escalate incorrect charges and refund decisions through the approved support/refund policy; do not improvise promises.

### Database exposure, corruption, or destructive change

- Remove application and operator access paths that may still be compromised.
- Preserve a snapshot before repair unless doing so would extend active exposure.
- Restore into an isolated environment first; validate schema migration level, row counts, ownership boundaries, publication history, and learner isolation.
- Promote a restore only after documented approval. Never test a destructive restore against the sole production copy.

### Incorrect or unsafe educational content

- Retract the affected publication immediately while retaining immutable history.
- Locate all learner sessions, reports, and generation/template versions associated with the question family.
- Categorize the failure: mathematics, ambiguity, alignment, distractor, explanation, accessibility, originality, difficulty, or formatting.
- Revise through a new version, rerun deterministic checks, and publish only after a new exact-version owner approval. Add the detailed reviewer rubrics when the incident warrants an educator or second-reviewer pass. Never edit a published version in place.
- If score estimates or plans depended materially on the item, document the affected cohort and recalculation decision.

### Availability, latency, or connection exhaustion

- Check ALB target health, ECS desired/running tasks, deployment events, application errors, RDS connections/CPU/storage, and NAT/network health.
- Roll back the application image only if it remains compatible with applied forward migrations.
- Reduce optional work before scaling: pause generation workers, expensive reports, or nonessential jobs.
- Use the checked-in load-smoke harness to confirm recovery; do not infer recovery from a single successful request.

### Unexpected AWS cost

- Identify the service, region, resource, and start time from billing data and deployment history.
- Stop only confirmed NuraPrep resources after checking data-retention and snapshot requirements.
- Treat a budget notification as delayed evidence, not a hard spending cap.
- Record whether the cause was intended capacity, leaked egress, abandoned resources, logging volume, or unauthorized activity.

## Recovery and verification

Recovery requires evidence appropriate to the failure: health checks, error-rate and latency samples, authentication/authorization tests, Stripe test events, database consistency queries, question validation, or restore checks. Monitor through at least one relevant retry, deployment, billing-event, or workload cycle. Do not close an incident because the dashboard looks quiet immediately after a change.

For any security or privacy incident, decide with qualified counsel whether notifications or regulatory reporting are required. The repository does not encode jurisdiction-specific legal advice.

## Post-incident review

Within a reasonable period after stabilization, write a blameless review containing:

- impact and affected time window;
- detection source and why earlier controls did or did not fire;
- a timestamped response timeline;
- root cause and contributing conditions;
- which safeguards worked;
- corrective actions with owners and deadlines;
- tests, alarms, documentation, or product controls added; and
- any claims that remain unknown because production evidence was unavailable.

Public summaries must remove sensitive data and must not overstate certainty. Corrective actions enter ordinary review and CI; incident urgency is not permission to bypass quality controls indefinitely.

## Required drills before launch

- revoke a reviewer and confirm every protected read/mutation is denied;
- rotate auth and Server Action secrets in staging;
- replay, reorder, and duplicate Stripe test webhooks;
- retract and replace a mathematically incorrect published fixture;
- restore a database snapshot into an isolated target and validate it;
- roll back an unhealthy application image after a compatible forward migration;
- trigger and acknowledge application/database/cost alarms; and
- run the load-smoke harness while observing connection and error metrics.

Record dates and evidence links in the private launch record. A checklist box without evidence is not a completed drill.
