# Operations and launch readiness

This document combines NuraPrep's incident runbook with its evidence-based launch gate. It describes how the system should be operated; it is not evidence that monitoring, staffing, legal review, or every drill already exists.

## Current release status

**LIVE career-fair MVP; NO-GO for a fully validated commercial launch.** Vercel, Neon PostgreSQL, a scale-to-zero AWS Lambda mirror, public Google OAuth, protected learner routes, owner administrator access, and the 470-family Math bank have been exercised live. Independent educator sampling, legal review, manual assistive-technology testing, managed restore/load drills, full production monitoring, empirical score calibration, support ownership, Stripe verification, and the commercial ECS/RDS AWS deployment remain open.

## Incident severity

| Severity | Examples                                                                                                                         | Initial objective                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| SEV-1    | Confirmed credential or learner-data exposure, unauthorized admin access, incorrect charges at scale, destructive database event | Stop exposure or harm and preserve evidence |
| SEV-2    | Sustained outage, widespread sign-in failure, broadly wrong scoring/content, backup failure                                      | Stabilize and identify affected scope       |
| SEV-3    | Degraded latency, isolated billing sync, limited bad content, elevated cost or error signal                                      | Limit growth, repair, and monitor           |
| SEV-4    | Cosmetic defect, documentation error, low-risk warning                                                                           | Track through normal engineering work       |

Stop or disable an affected capability whenever correctness, authorization, privacy, payment state, or recoverability is uncertain.

## First 15 minutes

1. Open a private incident record with start time, reporter, symptoms, environment, release identity, and provisional severity.
2. Assign one incident lead.
3. Preserve relevant logs, alarms, deployment events, provider event IDs, and timestamps without copying raw secrets or unnecessary personal data.
4. Contain the narrowest unsafe boundary: pause a deployment, disable billing/generation, revoke a role/session, retract a publication, or isolate database access.
5. Verify containment with an observable check.
6. Record each command, console change, approver, and timestamp.

Never place credentials, tokens, learner answers, exports, identity documents, raw database rows, or unnecessary personal data in a public issue.

## Scenario playbooks

### Account, session, or role compromise

- Revoke affected sessions and roles and verify database state.
- Rotate an exposed auth secret and end all sessions; coordinate Server Action key rotation across every running build.
- Inspect account audits, role grants, review decisions, publications, and generation requests.
- Retract questionable content without deleting history.

### Google OAuth incident

- Disable Google sign-in or remove the compromised client.
- Rotate the client secret in Google and the deployment secret store.
- Verify exact callback origins, HTTPS, state/nonce/PKCE behavior, session issuance, and denial/replay behavior before re-enabling.

### Stripe or entitlement incident

- Disable unsafe Checkout/Portal entry points while preserving signed webhook ingestion when necessary.
- Compare Stripe's subscription object with the local projection using IDs and timestamps—never card data.
- Prefer provider correction or idempotent resynchronization over manual entitlement edits.

### Database exposure or corruption

- Remove compromised access paths and preserve a snapshot when safe.
- Restore into an isolated environment first.
- Verify migrations, row counts, ownership, publication history, and learner isolation before promotion.
- Never test a destructive restore against the only production copy.

### Incorrect educational content

- Retract the publication immediately while retaining history.
- Find every related learner session, report, generation run, and template version.
- Categorize mathematics, ambiguity, alignment, distractor, explanation, accessibility, originality, difficulty, or formatting impact.
- Create a new version, rerun checks, and require a new exact-version approval before republishing.
- Decide whether affected estimates or study plans require recalculation or learner notice.

### Availability or cost incident

- Check platform health, deployments, application errors, database connections/CPU/storage, and network state.
- Roll back only when the prior image remains compatible with applied migrations.
- Pause optional generation/reporting work before adding capacity.
- Identify unexpected cloud cost by service, region, resource, and start time; treat budget alerts as delayed notifications, not hard caps.

## Recovery and review

Recovery requires direct evidence: health checks, error/latency samples, authorization tests, Stripe test events, database consistency, question validation, or restore checks. Observe at least one relevant retry, deployment, event, or workload cycle before closure.

A blameless post-incident review records impact, detection, timeline, root cause, contributing conditions, successful safeguards, corrective actions, new tests/alarms/docs, and remaining unknowns. Security or privacy notification requirements require qualified legal review.

## Commercial launch checklist

Every completed item needs dated evidence and a named owner. Any unresolved stop condition keeps the commercial launch at **NO-GO**.

### Release and content

- [ ] Record the release commit and immutable image/migration digests.
- [ ] Assign release, incident, database, content, privacy, and support owners.
- [ ] Confirm production and staging isolation and review every change with CI evidence.
- [ ] Verify every published family maps to a reviewed leaf skill and current specification.
- [ ] Sample explanations, distractors, hints, formats, visual data, calculator policy, and mobile rendering.
- [ ] Exercise report, retraction, revision, republishing, and affected-learner analysis.
- [ ] Complete independent educator sampling and qualified provenance/trademark review.
- [ ] Keep public claims independent, evidence-bounded, and non-affiliated with ATI.

### Learner experience and scoring

- [ ] Complete diagnostic, topic, history filters, adaptive, timed test, summary, progress, estimate, plan, tutor, and report flows on desktop and mobile.
- [ ] Verify timers, resume, unanswered items, early submission, and no pre-answer leakage.
- [ ] Verify every manifest prevents duplicate families and follows the reviewed blueprint.
- [ ] Review estimator uncertainty, low-evidence behavior, timed/untimed presentation, and calibration plan.
- [ ] Make no outcome or predictive-accuracy claim before held-out learner evidence supports it.
- [ ] Review empty, loading, rate-limited, expired, database-error, and recovery states.

### Authentication, privacy, and authorization

- [x] Configure production Google OAuth and the exact `nuraprep.vercel.app` callback.
- [ ] Verify success, denial, malformed/replayed callback, state/nonce/PKCE, verified email, linking, logout, revocation, and secure cookies in staging.
- [ ] Test learner isolation and reviewer/admin denial at page, route, Server Action, and data-access boundaries.
- [ ] Exercise export, ordinary erasure, Stripe-coordinated erasure, and second-admin privileged pseudonymization.
- [ ] Approve the data inventory, purposes, retention, subprocessors, deletion exceptions, backup expiry, logging, and incident policy.
- [ ] Complete privacy, terms, support, and jurisdiction-appropriate legal review.
- [ ] Confirm production contains no development access, defaults, test keys, broad proxy trust, or secrets in code/images/logs.

### Billing and infrastructure

- [ ] Keep `BILLING_ENABLED=false` until pricing, trial, cancellation, refund, tax, and support decisions are approved.
- [ ] Complete Stripe test-mode checkout, renewal, failure/recovery, cancellation, refund, Portal, replay, reordering, and test-clock scenarios.
- [ ] Verify mode-matched credentials, raw-body signatures, fail-closed entitlements, alerts, and reconciliation.
- [x] Apply and smoke-test the free-plan Lambda/ECR portfolio mirror with exact-resource SSM/IAM and bounded logs.
- [ ] Save a region-specific commercial ECS/RDS plan, estimate cost, approve a ceiling, and identify the budget recipient.
- [ ] Review networking, IAM, secrets, TLS, logging, backups, deletion protection, final snapshots, and S3 access.
- [ ] Apply commercial staging only after explicit owner approval.
- [ ] Run migration, rollback, restore, rotation, scaling, load, alarm, and teardown drills.

### Accessibility and browser quality

- [x] Automated WCAG A/AA regression scans cover representative public, learner, account, and reviewer pages.
- [ ] Navigate every core flow using keyboard only and verify focus order, visible focus, skip links, and no traps.
- [ ] Repeat representative flows at 200% and 400% zoom and verify reflow.
- [ ] Verify reduced-motion behavior.
- [ ] Test VoiceOver with Safari plus another available browser/screen-reader combination.
- [ ] Exercise phone, tablet, and desktop widths in Chromium, Firefox, and WebKit/Safari.
- [ ] Review plain language, color independence, target size, form instructions, and recovery with humans.
- [ ] Record every defect, correction, exact release, browser/assistive technology, reviewer, date, and evidence link.

### Operations and presentation

- [ ] Assign incident contacts and complete the drills below.
- [ ] Publish truthful status/support channels and maintenance communication.
- [ ] Verify repository screenshots, setup, deployment, security, roadmap, and limitations against the release.
- [ ] Confirm community files, issue/PR templates, dependency updates, branch rules, and passing GitHub Actions.
- [ ] Complete a fresh backup and clean-clone restore/migrate/seed/build/test rehearsal.

## Required drills

- revoke a reviewer and verify all protected operations fail;
- rotate auth and Server Action secrets in staging;
- replay, reorder, and duplicate Stripe test webhooks;
- retract and replace a deliberately incorrect fixture;
- restore a database snapshot into an isolated target;
- roll back an unhealthy image after a compatible migration;
- trigger application, database, and cost alarms; and
- run the bounded load-smoke harness while observing errors and connections.

## Final decision

Commercial launch is **GO** only when required items have evidence or narrow documented exceptions, no SEV-1/SEV-2/content/security/privacy/payment/restore blocker remains, and product, engineering, content, privacy/legal, and operations owners sign off.

The current public portfolio MVP may remain live while these commercial gates are openly documented as incomplete.
