# Question and learning data model

This document defines the domain model and its required invariants. The PostgreSQL schema implements the content, provenance, validation, review, topic-practice, attempt, and learner-report entities described below; later learning-model entities remain planned.

## Core content entities

### ExamSpecification

A versioned record of externally published exam structure:

- exam owner and exam/version name;
- effective and last-verified dates;
- source URL and retrieval metadata;
- section timing and scored/unscored counts;
- supported response formats; and
- verification status and reviewer.

Practice-test assembly references a specific specification version.

### Skill

The stable taxonomy node:

- section, domain, topic, and subtopic hierarchy;
- internal code and human-readable learning objective;
- active dates and source alignment notes; and
- prerequisite edges with relation type and strength.

Question versions link to one primary skill and zero or more secondary/prerequisite skills.

### SourceArtifact

The provenance and rights record for a source considered during coverage research:

- canonical URL, publisher, title, artifact type, and publication date;
- access date, content hash, and optional permitted object-storage key;
- stated license, terms URL, robots result, paywall/access classification;
- allowed uses: metadata, coverage analysis, quotation, storage, model input;
- decision, rationale, reviewer, and recheck date; and
- deletion/takedown status.

Unlicensed source question text is not retained. `CoverageObservation` stores abstract concepts such as “multi-step percent change in a practical context,” not wording, values, choices, or distinctive structures.

### GenerationTemplate and GenerationRun

Templates are immutable, versioned instructions containing:

- targeted skill, response type, difficulty rubric, and parameter constraints;
- explanation and distractor requirements;
- prohibited patterns and originality controls;
- validator contract; and
- author/reviewer status.

A generation run records an idempotency key, request scope, requester, optional source question version, provider, model, template version, prompt hash, sanitized payload and parameters, seed where supported, a hard cost ceiling, timestamps, token/cost data, outcome, and parent run for regeneration. Queue execution adds a worker ID, opaque claim token, lease expiry, heartbeat, and attempt count. Request identity is immutable; only the current claim token may complete a running job. A run makes one terminal transition, and success requires a linked complete candidate version. Secrets and hidden provider reasoning are never stored or shown in the console.

### Question and QuestionVersion

`Question` is a stable identity and family. `QuestionVersion` is append-only and contains:

- prompt and optional accessible stimulus/table/graph specification;
- response type: single choice, multiple select, numeric, ordered response, or supported visual response;
- choices when applicable and a typed answer specification;
- a safe, structured mathematical verification recipe when deterministic recomputation is supported;
- worked explanation and per-distractor rationale;
- primary skill, secondary skills, prerequisites, and learning objective;
- internal difficulty rubric and rationale;
- estimated time and calculator policy;
- common misconception codes;
- provenance links and transformation notes;
- generation run or human-author record;
- validation status, review status, version number, and timestamps; and
- superseded/retracted reason when applicable.

The correct answer is never inferred from display order. Choice identifiers are stable, and shuffling preserves answer references.

The first visual-data contract is intentionally narrow: a bar graph must provide a title, labeled axes, and two to eight uniquely labeled nonnegative values. Learner and reviewer pages share one dependency-free SVG renderer and expose the same exact values in a semantic table alternative. This avoids accepting arbitrary chart payloads that the UI cannot faithfully render. Schema validation proves the structure is renderable; matching descriptive prose to the plotted values remains a template regression and human-review responsibility.

### ValidationRun

Each validator result is immutable and records validator name/version, execution time, status, structured evidence, and failure code. Required checks include:

- schema and answer-contract validity;
- deterministic arithmetic, numeric tolerance, units, and symbolic equivalence where supported;
- exactly one unambiguous answer or the declared multiple-select set;
- distractor distinctness and misconception plausibility;
- graph/table consistency and accessible text alternative;
- formatting, reading-level, calculator-policy, and topic-alignment rules;
- similarity thresholds against material legally available for comparison; and
- explanation recomputation against the answer.

### Review and feedback

`ReviewDecision` records reviewer, question version, rubric scores, decision, notes, and timestamp. Decisions are `APPROVED`, `NEEDS_REVISION`, or `REJECTED`.

`ReviewerFeedback` stores free text plus categories such as mathematical error, ambiguity, alignment, distractor quality, explanation quality, accessibility, originality, difficulty, or formatting. A resolution links to the new template/rule/evaluation case or records why no change was made.

The feedback-pattern view preserves learner-report and reviewer-feedback provenance while grouping repeated stable issue codes or categories. Its counts are operational review signals, not claims about question correctness until an owner investigates the underlying versions.

`ImprovementProposal` turns a pattern into an immutable, human-authored change plan. It records the pattern and category, target artifact class, problem summary, proposed change, regression plan, creator, and a deterministic idempotency key. Creation requires at least two matching open signals. `ImprovementProposalEvidence` links each exact reviewer-feedback or learner-report record and freezes its source kind, question-version ID, and displayed text so later triage cannot rewrite what the approver saw.

`ImprovementProposalDecision` is a separate append-only approval or rejection. PostgreSQL rejects decisions with fewer than two evidence links and allows only one final decision per proposal. Approval authorizes only the plan: it does not edit templates, validators, rubrics, policies, evaluation cases, or questions. Implementation remains a normal reviewed code/content change with its own tests and history.

Editing creates a new `QuestionVersion`. Approval never mutates an older version.

`QuestionPublication` identifies the one current learner-eligible version in a question family and retains retired publication history. Approval alone does not publish content.

## Learner entities

The learner slice now implements `learner_profiles`, `practice_sessions`, immutable `practice_session_items`, immutable `attempts`, append-only `tutor_interactions`, exact-version `learner_question_reports`, append-only `learner_question_report_events`, append-only `score_estimates`, and editable study plans linked to estimate history. The remaining entities below are added with their owning milestone.

- **PracticeSession:** mode, filters, timing policy, start/end state, and a reproducible item manifest.
- **Attempt:** exact session item, answer payload, correctness, duration, confidence, evaluator version, server timestamp, and any matched reviewer-authored misconception-rule evidence.
- **AttemptEvaluation:** future expansion point for partial credit and richer evaluation traces; deterministic misconception attribution is already stored with the attempt.
- **TutorInteraction:** exact session item, reviewed hint-step identifier and index, and request time. Unrequested steps are not sent to the learner, and answer content is not part of the hint contract.
- **SkillEstimate:** currently represented inside versioned adaptive and score feature snapshots; a separate table is deferred until longitudinal skill-history queries justify it.
- **ReviewSchedule:** user, skill/question family, due date, spacing state, and reason.
- **TestForm:** reproducible assembly manifest with distribution rules and no repeated family.
- **ScoreEstimate:** append-only model version, evidence count, estimate, interval, evidence level, caveats, and exact feature snapshot.
- **StudyPlan / StudyPlanItem:** editable learner preferences and per-skill priorities linked to the immutable estimate that generated them.
- **ProblemReport:** implemented as immutable learner evidence linked to the exact attempt and question version; append-only reviewer events carry triage status and resolution evidence. Notification delivery remains planned.

## Publication invariants

1. A learner receives only the current explicitly published version of an active question family. MVP publication requires provenance, a latest genuine owner approval, and passing latest runs of the deterministic answer-contract and mathematical-correctness validators. Detailed reviewer rubrics remain optional QA evidence.
2. Every published question has provenance records even when it was authored entirely in-house.
3. Attempts always reference the exact presented version; later corrections do not rewrite history.
4. Retraction removes an item from future selection but preserves audit records and affected-attempt analysis.
5. Aggregate usage statistics are derived from attempts and cannot modify the content record.
6. Model-generated difficulty is a suggestion until reviewer-approved; empirical difficulty is stored separately.
7. Score estimates retain uncertainty and cannot use the label “official ATI score.”
