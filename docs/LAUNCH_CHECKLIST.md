# Launch readiness checklist

## How to use this gate

This is a go/no-go record for a future staging or public launch. Repository implementation and local tests satisfy only part of it. Mark an item complete only with a dated evidence link or artifact and a named owner. Any unresolved stop condition keeps the launch at **NO-GO**.

Current status: **NO-GO for public launch.** The local 38-family Math bank has owner decisions and passing deterministic checks, but the larger production bank and the real Google, Stripe, AWS, legal, manual-accessibility, restore, load, monitoring, and support gates have not been completed.

## Release identity and ownership

- [ ] Record release commit and immutable application/migration image digests.
- [ ] Name the release owner, incident lead, database operator, content approver, privacy contact, and support contact.
- [ ] Confirm staging and production are separate and development/E2E seed commands cannot target either.
- [ ] Review every change since the last approved release; require CI and migration evidence.
- [ ] Confirm rollback compatibility with every already-applied forward migration.

## Math content and educational integrity

- [ ] Map every published family to the reviewed Math outline and leaf skill.
- [ ] Approve enough distinct, learner-safe families to assemble the diagnostic, topic, adaptive, and 38-item test without E2E fixtures or accidental repetition.
- [ ] Confirm every exact release version has an explicit owner approval with useful notes; sample the optional detailed rubrics during final QA.
- [ ] Verify every source/provenance decision, license field, recheck date, and coverage abstraction; store no restricted source question bodies.
- [ ] Run deterministic validators and gold evaluations on the exact release bank.
- [ ] Sample explanations, distractor rationales, hints, numeric formatting, tables/graphs, and mobile math rendering.
- [ ] Test question reporting, retraction, revision, republishing, and affected-learner analysis.
- [ ] Confirm all public copy says independent and TEAS-aligned without claiming ATI affiliation or official score equivalence.

## Learner experience and scoring

- [ ] Complete diagnostic, topic, missed/new filtering, adaptive, timed-test, summary, progress, score-estimate, study-plan, tutor, and report flows on mobile and desktop.
- [ ] Confirm timers, early submission, resume behavior, unanswered items, and no pre-answer answer leakage.
- [ ] Verify every practice/test manifest contains no duplicate family and respects the reviewed blueprint.
- [ ] Review baseline-estimator caveats, uncertainty intervals, low-evidence behavior, timed/untimed weighting, and calibration plan.
- [ ] Prohibit predictive-accuracy or outcome claims until held-out learner outcomes support them.
- [ ] Confirm empty, loading, rate-limited, expired-session, database-error, and recovery states are understandable.

## Authentication, privacy, and authorization

- [ ] Configure environment-specific Google OAuth credentials and exact HTTPS callbacks.
- [ ] Verify success, denial, malformed/replayed callback, state/nonce/PKCE, verified email, account-linking, logout, revocation, and secure cookies in staging.
- [ ] Verify learner isolation and reviewer/admin denial for every protected page, route, Server Action, and data-access function.
- [ ] Exercise export, ordinary erasure, Stripe-coordinated erasure, and second-admin privileged pseudonymization.
- [ ] Approve data inventory, purposes, retention periods, subprocessors, deletion exceptions, backup expiry, log redaction, and incident-notification policy.
- [ ] Complete privacy policy, terms, support policy, and qualified legal review for target jurisdictions.
- [ ] Confirm production has no development access, default secret, test key, broad proxy CIDR, or credential in source/image/logs.

## Billing, if enabled

- [ ] Approve free/premium boundaries, pricing, trial, cancellation, refund, tax, and support terms without dark patterns.
- [ ] Complete Stripe test-mode purchase, renewal, failure/recovery, cancellation, refund, Portal, duplicate/replayed/out-of-order webhook, and test-clock scenarios.
- [ ] Verify mode-matching keys/product IDs, signed raw-body webhooks, entitlement denial by default, and no card-data storage.
- [ ] Configure billing alerts and a reconciliation procedure.
- [ ] Keep `BILLING_ENABLED=false` if any billing gate is incomplete.

## Infrastructure, data safety, and cost

- [ ] Calculate region-specific monthly cost from a saved plan; approve a ceiling and confirmed notification recipient.
- [ ] Review private networking, security groups, IAM, secret injection, TLS, log retention, backups, deletion protection, final snapshots, and S3 public-access controls.
- [ ] Apply staging only after explicit owner approval of the saved plan.
- [ ] Run migration failure, application rollback, backup restore, secret rotation, scaling, and teardown drills.
- [ ] Verify alarms for app errors, task health, database CPU/storage/connections, and cost notifications.
- [ ] Run an authorized load test against staging; record workload, p50/p95/p99, throughput, error rate, database connections, and limitations.
- [ ] Confirm support and incident responders can access the required systems with MFA and least privilege.

## Accessibility and quality

- [x] Automated WCAG A/AA regression scans cover representative public, learner, account, and reviewer surfaces locally.
- [ ] Complete keyboard-only navigation, visible focus, skip links, timeout handling, zoom/reflow, reduced-motion, screen-reader, contrast, and math/table announcement review.
- [ ] Test supported browsers and representative phone/tablet/desktop widths.
- [ ] Review plain language, reading load, error recovery, color independence, target sizes, and form instructions with humans.
- [ ] Resolve or explicitly accept every launch-blocking defect with an owner and rationale.

## Operations and public presentation

- [ ] Assign incident contacts and complete every drill in the incident-response runbook.
- [ ] Publish truthful status/support channels and define maintenance communication.
- [ ] Verify README screenshots, architecture, setup, environment, testing, security, integrity, deployment, roadmap, and limitations against the release.
- [ ] Confirm repository license, contribution/security policies, issue/PR templates, dependency updates, branch rules, and passing GitHub Actions.
- [ ] Review public GitHub profile text and pinned repositories separately with owner approval.
- [ ] Create a final backup and verify clone, database migration/seed, build, tests, and documented reproduction from a clean environment.

## Final decision

- [ ] Every required item has dated evidence, or a named approver has documented a narrow exception and residual risk.
- [ ] No open SEV-1/SEV-2 issue, content publication blocker, security/privacy blocker, payment blocker, or restore blocker remains.
- [ ] Product owner, engineering owner, content approver, privacy/legal approver, and operations owner record **GO**.

If any final-decision item is unchecked, the result is **NO-GO**. A portfolio-only GitHub release may still be appropriate when its README clearly labels external services and public launch as incomplete.
