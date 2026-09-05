# Contributing to NuraPrep

Thank you for helping build a careful, accessible study product. Code, design, documentation, tests, and question-quality work are all welcome.

## Before you begin

- Search existing issues before opening a new one.
- Use a private security advisory for vulnerabilities; do not open a public issue.
- Do not submit copied, lightly paraphrased, paid, account-gated, or confidential question content.
- Do not include learner personal data, provider secrets, answer keys from protected exams, or unlicensed datasets.

## Local setup

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

The foundation UI does not require secrets. Use test or local credentials for integrations as later milestones are added.

## Development workflow

1. Create a focused branch from `main`.
2. Keep changes small enough to review and avoid unrelated formatting churn.
3. Add or update tests for behavior changes.
4. Update documentation and `.env.example` when contracts or configuration change.
5. Run `pnpm check` before committing.
6. Use clear, imperative commit messages such as `feat: add numeric answer validator`.
7. Open a pull request that explains behavior, verification, risks, screenshots, and follow-up work.

Use Conventional Commit prefixes where practical: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, and `security`.

## Required checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run `pnpm test:e2e` for learner/reviewer workflow changes. Database migrations must include forward and rollback/repair notes plus migration tests where feasible.

## Content contributions

Question work follows [docs/CONTENT_GOVERNANCE.md](docs/CONTENT_GOVERNANCE.md). A candidate is not publishable until it has:

- a valid source/provenance record;
- an explicit skill and learning objective;
- a typed answer contract;
- deterministic validation where possible;
- a worked explanation and distractor rationales;
- accessibility text for non-text stimuli;
- originality and ambiguity review; and
- an independent approval decision.

Never “fix” originality by changing only numbers, names, or surface wording. If you cannot establish permitted use for a source, do not add its question text to the repository, issues, pull requests, fixtures, or prompts.

## Pull-request review

At least one approving review is expected before merge. Security-sensitive authentication, authorization, billing, privacy, prediction, and publishing changes require a threat/risk note and focused tests. Generated code and generated educational content receive the same review standard as human-written work.

By contributing, you agree that your code contribution is licensed under the repository's MIT License and that you have the right to submit all included material.
