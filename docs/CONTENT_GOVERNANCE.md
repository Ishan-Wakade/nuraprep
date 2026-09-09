# Content provenance and responsible generation

## Purpose

NuraPrep uses public exam specifications and lawfully usable educational resources to understand coverage, general reading demand, and skill expectations. It does not reproduce third-party questions or present generated content as official ATI material.

This policy is an engineering control, not legal advice. Any commercial launch should receive qualified review of trademarks, licenses, terms of service, and the source-acquisition process.

## Acquisition policy

Automated collection is allowed only after a source-level decision records:

1. the publisher and canonical URL;
2. the applicable license and terms of service;
3. robots directives and technical access controls;
4. whether the material is public, account-gated, or paid;
5. permitted storage, analysis, quotation, and model-input uses;
6. the collection rate and revalidation date; and
7. the reviewer and rationale.

NuraPrep must not bypass paywalls, authentication, CAPTCHAs, rate limits, or access controls. A publicly viewable page is not automatically licensed for storage, redistribution, or model training. If rights are unclear, record only bibliographic metadata and a human-authored abstract coverage observation, or exclude the source.

Each registered source may have a scheduled policy recheck. The reviewer console surfaces overdue, due-soon, and unscheduled records. A completed recheck requires an explicit rights-evidence attestation, updates the current fail-closed permission snapshot, and appends the previous and resulting policy states to immutable audit history in the same database transaction. Rechecks never independently grant quotation or model-input rights.

## Source classes

| Class                                             | Default handling                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Official public exam outline                      | Store metadata and permitted high-level objectives; cite directly                                   |
| Openly licensed question set                      | Store only within license terms; preserve attribution and license version                           |
| Public page with restrictive/unclear terms        | Do not retain question text or send it to a model; record metadata and abstract coverage notes only |
| Paid, account-gated, or access-controlled content | Exclude unless written permission or a compatible license is obtained                               |
| User-submitted content                            | Quarantine pending ownership/permission and originality review                                      |

## Generation separation

The generation prompt receives taxonomy nodes, learning objectives, parameter constraints, internal difficulty rubrics, and approved original templates. It does not receive unlicensed source-question wording.

Every generated candidate must differ in wording, values, answer choices, narrative context, solution-path presentation, and distinctive structure. Changing only numbers or names is not original authorship and fails review.

Provenance distinguishes:

- the public specification supporting topic alignment;
- sources that informed aggregate coverage observations;
- the internal template and generation run;
- deterministic validator versions; and
- reviewers and decisions.

## Similarity and originality checks

Similarity checks are a rejection aid, not proof of non-infringement. They should combine:

- exact and normalized phrase overlap;
- uncommon n-gram overlap;
- structural fingerprints such as operation sequence and choice pattern;
- semantic similarity against content legally retained for comparison; and
- reviewer inspection of high-scoring pairs.

Thresholds must be calibrated on known original/near-copy pairs. When source text cannot lawfully be retained, the system must not build a shadow corpus merely to run similarity checks.

## Controlled improvement loop

1. A reviewer submits categorized feedback against one immutable question version.
2. The issue is triaged for learner impact and recurring-pattern code.
3. Periodic analysis groups issues without automatically changing prompts.
4. A proposed rule, template, rubric, or evaluator change is versioned and linked to evidence.
5. Regression cases are added before new candidates are generated.
6. Automated checks and blind human review compare the candidate behavior.
7. Only approved question versions and approved generation-system changes reach production.

The reviewer console implements the evidence, proposal, and decision boundaries in steps 1 through 4. A proposal requires two matching open signals, links to their exact feedback/report records, freezes the question-version and displayed-text evidence, and receives a separate append-only approval or rejection. Approval alone remains non-executable.

For an approved `GENERATION_TEMPLATE` proposal, a reviewer may record completed regression evidence and fork only the latest non-retired template into its next version. The server preserves skill, response format, and difficulty; PostgreSQL independently verifies the approval, consecutive version, unchanged scope, attributed author, actual content difference, and `DRAFT` status. The resulting proposal-to-template implementation record is append-only. A different reviewer action must still approve that draft before any generation request can use it. Implementations for validator rules, rubrics, policies, and evaluation cases remain open work.

Regeneration creates a new run and new question version. Regenerating only an explanation or distractors still creates a new complete version so published records remain reproducible.

## Representative owner-review findings — 2026-09-07

The first owner pass covered 11 distinct candidate versions across six Math leaf skills. This is enough qualitative evidence to improve the workflow and create revision candidates; it is not a statistically representative quality sample and does not approve the remaining bank.

The pass produced four actionable content findings:

- `calculate-mean-001` and `table-mean-001` calculate correctly but should explain what a mean represents before applying the procedure;
- `table-mean-001` should move from Proficient to Developing under the internal difficulty rubric;
- `supplementary-angle-001` should move from Foundational to Developing because the learner must identify and apply the supplementary-angle relationship; and
- `evaluate-linear-expression-001` was marked Approved while its note requested a move from Foundational to Developing, so the note is treated as revision evidence rather than as a clean approval.

The pass also revealed two workflow defects. A preselected `NEEDS_REVISION` value caused accidental audit events, and the static preview did not let the reviewer exercise response controls. The remediation requires explicit decision and score selection, displays the internal difficulty and explanation rubrics, adds a no-write interactive learner sandbox, and defaults the queue to one latest non-test candidate per family.

No owner decision from this pass is converted into validator evidence automatically. Revised versions begin unreviewed and must receive a new exact-version decision plus passing deterministic checks before publication.

The reviewer interface also presents seven detailed human rubrics together. These are optional follow-up QA under the MVP release policy. If used, the owner chooses an explicit outcome and writes rubric-specific evidence for each check; the server appends seven distinct exact-version records atomically and never fabricates them from the broader decision.

On 2026-09-09, the owner explicitly accepted the current Math candidates for MVP use and chose the final owner decision as the required human release judgment. The release gate therefore requires exact-version provenance, a genuine latest approval, and passing deterministic answer-contract and mathematical-correctness checks. Difficulty, reading level, calculator policy, explanation, accessibility, alignment, and originality rubrics remain visible, versioned, and advisory so a later educator or second-reviewer pass can add stronger evidence without misrepresenting who performed it.

## Full owner-decision pass — 2026-09-08

The owner added decisions for the 27 candidates that remained unreviewed after the representative pass. Seven were explicitly marked `NEEDS_REVISION`. Two approved decisions also contained narrower wording or difficulty corrections, which the implementation treats as revision evidence rather than silently discarding the notes. The recurring findings were:

- unit-conversion explanations should show conversion factors with units and make cancellation visible;
- numeric prompts that already name the requested unit should accept the number without requiring a separate unit-string convention;
- familiar two-step inequality and even-set median items fit Developing rather than Proficient under internal rubric v2;
- formula explanations should define their variables, and fraction explanations should name why a denominator is selected; and
- instructional wording should prefer familiar mathematical language when a more unusual analogy adds reading load.

[Official ATI sample-item guidance](https://help.atitesting.com/what-are-the-question-types-on-the-ati-teas-version-7-exam/) confirms that TEAS Version 7 includes numeric fill-in-the-blank items, and [ATI's calculator guidance](https://help.atitesting.com/do-i-need-to-bring-a-calculator/) says the exam provides a calculator. The public material reviewed did not establish a universal typed-unit syntax. NuraPrep therefore treats numeric-only entry for a prompt-specified unit as an internal usability decision, retains the canonical unit in the answer contract and feedback, and does not claim this interaction is identical to ATI's proprietary interface.

The pass did not supply genuine owner decisions for every current version. A later audit also found a browser-test decision written under the development reviewer identity, which a publisher-name-only filter could not detect. Those records remain a human-review gate. As before, every content correction creates a new immutable version whose earlier decision does not transfer.

## Synthetic-fixture containment

Browser-test publications use a dedicated `_e2e` database. After an earlier configuration leaked test approvals into the development database, affected publication records were retired rather than deleted so the audit trail remains inspectable. Learner-bank queries now independently reject publications made by the E2E fixture actor outside `APP_ENV=test` and require the exact published version's latest genuine decision to be approved. Synthetic items may verify mechanics in the disposable test environment but never count as reviewed educational content.

The database also derives an immutable synthetic classification for every decision and validator run from its original evidence. Non-test review queues, validator counts, publication coverage, and publication gates exclude those records even if a test fixture used the development reviewer identity. A data-quality migration retires any still-current synthetic publication or publication whose exact version lacks a latest genuine approval. This preserves contaminated history for diagnosis while preventing it from satisfying a real content gate.

## Takedowns and corrections

- Provide a documented rights-holder contact before launch.
- Quarantine disputed material promptly while preserving a private audit record.
- Retract invalid questions from selection without deleting affected attempt history.
- Recompute learner-facing analytics when a correction changes scoring, and notify affected learners when the impact is material.
- Record deletion obligations and derived-artifact handling per source.

## Public language

Allowed after documented review: “independent,” “original,” “TEAS Math preparation,” and “aligned to the public TEAS Version 7 content outline.”

Not allowed without evidence or permission: “official,” “actual TEAS questions,” “identical to the exam,” “guaranteed score,” “predicts your ATI score,” or any implication of ATI endorsement.
