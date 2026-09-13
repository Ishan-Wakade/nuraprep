# NuraPrep resume and interview description

Use only the bullets that fit the available space and the role. Update test counts and deployment claims whenever the verified release changes.

## Target-state resume entry — use only after the full product is verified

The following describes the intended completed product. Replace every bracketed field with measured evidence and delete any bullet whose capability was not ultimately shipped.

**NuraPrep — Founder, Lead Product Engineer & ML Engineer**  
Next.js, React, TypeScript, PostgreSQL, Drizzle ORM, Python/TypeScript ML, OpenAI API, Google OAuth, Stripe, Redis, Docker, AWS, Terraform, Vercel, Neon, Playwright, Vitest

- Designed and launched a full-stack ATI TEAS preparation platform spanning Math, Reading, Science, and English and Language Usage, combining diagnostics, topic practice, adaptive review, realistic timed exams, Socratic tutoring, progress analytics, and personalized study plans for **[verified learner count]** learners.
- Built a governed bank of **[verified published-question count]** original TEAS-aligned questions across multiple interaction formats, with content-outline mapping, prerequisite graphs, versioned provenance, deterministic answer verification, similarity screening, reviewer feedback, immutable publication history, and human approval workflows.
- Developed and calibrated an explainable adaptive-learning and score-prediction system using accuracy, recency, timing, confidence, difficulty, misconception, and spaced-repetition signals; achieved **[held-out MAE]** score-estimation error and **[calibration metric]** only after validating against **[outcome sample size]** real learner outcomes.
- Engineered production authentication, privacy, and monetization with Google OAuth, database-backed sessions, role-based access control, shared rate limiting, data export/deletion, Stripe Checkout and webhooks, subscription entitlements, audit trails, and least-privilege secret management.
- Deployed and operated the application through **[verified primary deployment]**, with Dockerized AWS ECS/RDS/S3/CloudWatch infrastructure managed by Terraform, automated backups and restore drills, staging/production isolation, monitoring, cost controls, and **[measured availability or load result]** under a documented workload.
- Established an automated quality program with CI/CD, CodeQL, dependency updates, unit/integration/end-to-end testing, cross-browser validation, WCAG accessibility checks, content evaluations, and production incident runbooks, reaching **[verified test count]** automated tests and **[measured release result]**.

### Target-state one-line description

Founded and engineered NuraPrep, a production TEAS preparation platform that combines a governed original question bank, explainable adaptive learning, calibrated score prediction, AI-assisted Socratic tutoring, secure subscriptions, and cloud-native delivery across all four exam sections.

### Target-state skills summary

React, Next.js, TypeScript, PostgreSQL, Drizzle ORM, REST/server actions, Python or TypeScript ML, model evaluation and calibration, OpenAI API, prompt and evaluation design, deterministic math validation, data modeling, Google OAuth, Better Auth, Stripe, Redis/queues, Docker, AWS ECS/RDS/S3/VPC/ALB/CloudWatch/IAM, Terraform, Vercel, Neon, GitHub Actions, CodeQL, Vitest, Playwright, accessibility, observability, security, privacy, and technical product management.

## Recommended resume entry

**NuraPrep — Lead Product & Full-Stack Engineer**  
Next.js, React, TypeScript, PostgreSQL, Drizzle ORM, Better Auth, Google OAuth, Vercel, Neon, AWS, Terraform, Docker, Playwright, Vitest

- Architected a production-shaped TEAS Math platform with diagnostic, topic, adaptive, and 38-question timed practice; explanation-first feedback; progress tracking; question reporting; and transparent readiness estimates with uncertainty.
- Built a governed 470-question Math bank spanning 12 skills and four response formats, combining 38 individually owner-reviewed questions with 432 deterministic variants backed by versioned templates, programmatic answer verification, provenance records, immutable review history, and duplicate screening.
- Engineered secure account and operations foundations with Google OAuth, database sessions, role-based reviewer/admin access, shared rate limits, portable data export, transactional account erasure, security headers, and a fail-closed Stripe boundary kept disabled for the free MVP.
- Established a deployment and quality system using Vercel and Neon for the public MVP, plus Docker and validated AWS ECS/RDS/VPC/S3/CloudWatch Terraform as a cost-gated alternative; enforced CI, CodeQL, 298 unit tests, 60+ Playwright scenarios, automated accessibility checks, and cross-browser mobile coverage.

## One-line project description

Built NuraPrep, an independent full-stack TEAS Math preparation platform with 470 governed questions, explainable adaptive practice, timed diagnostics and tests, secure account controls, automated mathematical validation, and production-shaped cloud infrastructure.

## Short interview explanation

NuraPrep started as an education-product idea, but the hardest engineering problem was not rendering quizzes—it was making question quality, learner personalization, and score estimates trustworthy. I chose a modular Next.js and PostgreSQL architecture so answer submissions, progress, review decisions, and publication controls could share transactions and typed contracts. I separated immutable question versions from learner-visible publications, verified objective math programmatically, stored source-policy and provenance metadata, and required an explicit exact-version release decision. That let the bank scale through deterministic templates without claiming that automated checks were equivalent to educator review.

On the learner side, I implemented diagnostic, topic, adaptive, and timed-test flows around the same question and attempt model. Recommendations remain inspectable: accuracy, recency, confidence, timing, prerequisite relationships, and spaced-review state produce stored reasons rather than an opaque model output. The score estimator similarly exposes its evidence and uncertainty and is clearly labeled as unofficial until real learner outcomes support calibration.

For production readiness, I added Google OAuth, database-backed sessions, role grants, shared application rate limits, account export and erasure, security headers, Stripe's hosted billing boundary in disabled mode, Docker delivery, CI and CodeQL, and an AWS Terraform architecture. The fastest MVP uses Vercel and Neon to avoid upfront infrastructure cost; AWS remains a validated, cost-gated alternative rather than an inflated deployment claim.

## Strong behavioral-interview stories

### Balancing speed with quality

- **Situation:** A career-fair deadline made a public MVP more valuable than completing every long-term infrastructure milestone.
- **Task:** Ship a credible product quickly without weakening content, privacy, or security claims.
- **Action:** Kept the modular monolith, selected Vercel and Neon for the first deployment, disabled billing, retained the AWS design as a separate validated architecture, and converted content expansion into a reproducible release command with explicit limitations.
- **Result:** A deployable Math product with 470 active questions and complete learner flows, while independent educational calibration and commercial launch gates remain documented rather than falsely marked complete.

### Preventing content-quality failures at scale

- **Situation:** Deterministic validation showed 432 mathematically valid drafts, but sampling found 14 editorial defects such as repeated adjectives, capitalization errors, and incorrect singular/plural wording.
- **Task:** Preserve the scale advantage without publishing visibly low-quality material.
- **Action:** Corrected the underlying templates instead of hand-editing individual outputs, added regression checks for every discovered defect class, regenerated a deterministic release set, re-ran answer/provenance/publication gates, and archived obsolete drafts.
- **Result:** All 432 regenerated variants passed the release gates and joined the 38-question reviewed foundation as a 470-question MVP bank; the same defects are now prevented in future generations.

### Designing explainable personalization

- **Situation:** A black-box recommendation engine would be difficult to validate and inappropriate before collecting learner outcomes.
- **Task:** Personalize practice while keeping behavior understandable and testable.
- **Action:** Implemented a versioned rules baseline using accuracy, recency, attempts, difficulty, timing, confidence, misconception signals, prerequisites, and spaced repetition; persisted the inputs and selection reasons; and used uncertainty-aware score estimates instead of unsupported accuracy claims.
- **Result:** Adaptive practice is useful from the first release, debuggable by reviewers, and ready for later calibration or ML replacement when sufficient outcome data exists.

## Skills demonstrated

- **Product engineering:** requirements decomposition, MVP scoping, roadmap ownership, UX copy, accessibility, release gates, and cost-aware prioritization.
- **Frontend:** React 19, Next.js App Router, TypeScript, responsive design, Tailwind CSS, semantic HTML, keyboard support, SVG/table data displays, and error recovery.
- **Backend and data:** Server Actions, route handlers, PostgreSQL, Drizzle ORM, transactions, immutable versioning, audit records, migrations, connection pooling, and idempotent jobs.
- **Security and privacy:** Google OAuth, Better Auth, database sessions, RBAC, CSRF/origin controls, secure cookies, rate limiting, account export/deletion, privileged-account pseudonymization, secret validation, and least privilege.
- **Educational and AI systems:** skill taxonomies, prerequisite graphs, adaptive scheduling, uncertainty-aware score estimation, deterministic question generation, symbolic/programmatic verification, provenance, review workflows, and provider-neutral generation queues.
- **Infrastructure:** Vercel, Neon, Docker Compose, multi-stage containers, AWS ECS Fargate, RDS, VPC, ALB, S3, Secrets Manager, CloudWatch, IAM, budgets, and Terraform.
- **Quality and delivery:** Vitest, Testing Library, Playwright, axe accessibility testing, cross-browser checks, GitHub Actions, CodeQL, Dependabot, release documentation, and incident/restore planning.

## Accuracy boundaries

- Say **owner-authorized and machine-validated**, not independently educator-reviewed, for the 432-question expansion.
- Say the score estimate is transparent and uncertainty-aware, not proven to predict official ATI performance.
- Say the AWS infrastructure is implemented and validated unless it has actually been applied and tested in an AWS account.
- Say Stripe integration is implemented but disabled unless its complete sandbox lifecycle has been verified.
- Do not imply affiliation with ATI or describe NuraPrep questions as official exam questions.
