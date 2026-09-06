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

The reviewer console implements steps 1 through 4 as an evidence-backed proposal ledger. A proposal requires two matching open signals, links to their exact feedback/report records, freezes the question-version and displayed-text evidence, and receives a separate append-only approval or rejection. Approval is intentionally non-executable: no template, validator, rubric, policy, evaluation case, or question is changed until a contributor implements the reviewed proposal and runs the relevant regression suite.

Regeneration creates a new run and new question version. Regenerating only an explanation or distractors still creates a new complete version so published records remain reproducible.

## Takedowns and corrections

- Provide a documented rights-holder contact before launch.
- Quarantine disputed material promptly while preserving a private audit record.
- Retract invalid questions from selection without deleting affected attempt history.
- Recompute learner-facing analytics when a correction changes scoring, and notify affected learners when the impact is material.
- Record deletion obligations and derived-artifact handling per source.

## Public language

Allowed after documented review: “independent,” “original,” “TEAS Math preparation,” and “aligned to the public TEAS Version 7 content outline.”

Not allowed without evidence or permission: “official,” “actual TEAS questions,” “identical to the exam,” “guaranteed score,” “predicts your ATI score,” or any implication of ATI endorsement.
