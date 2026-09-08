# Security policy

## Supported versions

NuraPrep is pre-release software. Security fixes are applied to the latest commit on `main`; no released version is currently supported.

## Reporting a vulnerability

Please use the repository's **Security → Report a vulnerability** flow to create a private GitHub security advisory. Do not disclose the issue in a public issue, discussion, pull request, or social post before a fix is available.

Include, when possible:

- the affected route, component, commit, or configuration;
- reproducible steps or a minimal proof of concept;
- likely impact and required attacker access;
- whether learner data, reviewer content, answer keys, or credentials may be exposed; and
- a suggested mitigation.

Do not access data that is not yours, degrade service, use social engineering, or retain sensitive data while testing. Stop after demonstrating the minimum evidence required.

The maintainer will acknowledge a complete report as soon as practical, validate severity, coordinate remediation, and credit the reporter if requested. A fixed timeline cannot be promised during the pre-release phase, but material learner-data or content-integrity issues will be prioritized.

## Security design priorities

- deny learner access to draft questions, answer keys, generation prompts, and reviewer operations;
- validate all untrusted input at trust boundaries;
- use least-privilege roles for learners, reviewers, administrators, jobs, and infrastructure;
- keep secrets server-side and out of logs, errors, fixtures, and client bundles;
- use signed, idempotent webhook handling for external providers;
- retain audit events for publishing, role, billing, and deletion operations;
- minimize learner data and document retention/deletion before launch; and
- treat prompt injection and source-content poisoning as content-pipeline security risks.

The authentication foundation remains pre-production: real Google callback fixtures, production cookie verification, and legal approval of privileged-audit retention are still required. Stripe and AWS infrastructure will not ship until their threat models, costs, and tests are reviewed.

GitHub dependency alerts, secret scanning with push protection, and CodeQL JavaScript/TypeScript analysis provide continuous repository checks. CodeQL runs on changes to `main`, pull requests, and a weekly schedule with SHA-pinned actions and the extended security query suite. Automated findings are triage inputs, not evidence that the application is vulnerability-free.
