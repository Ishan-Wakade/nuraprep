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

A generation run records provider, model, template version, prompt hash, sanitized parameters, seed where supported, timestamps, token/cost data, outcome, and parent run for regeneration. Secrets and hidden provider reasoning are never stored.

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

Editing creates a new `QuestionVersion`. Approval never mutates an older version.

`QuestionPublication` identifies the one current learner-eligible version in a question family and retains retired publication history. Approval alone does not publish content.

## Learner entities

The topic-practice slice now implements `learner_profiles`, `practice_sessions`, immutable `practice_session_items`, immutable `attempts`, append-only `tutor_interactions`, exact-version `learner_question_reports`, and append-only `learner_question_report_events`. The remaining entities below are added with their owning milestone.

- **PracticeSession:** mode, filters, timing policy, start/end state, and a reproducible item manifest.
- **Attempt:** exact session item, answer payload, correctness, duration, confidence, evaluator version, server timestamp, and any matched reviewer-authored misconception-rule evidence.
- **AttemptEvaluation:** future expansion point for partial credit and richer evaluation traces; deterministic misconception attribution is already stored with the attempt.
- **TutorInteraction:** exact session item, reviewed hint-step identifier and index, and request time. Unrequested steps are not sent to the learner, and answer content is not part of the hint contract.
- **SkillEstimate:** user, skill, estimator version, evidence count, mastery estimate, uncertainty, and calculation timestamp.
- **ReviewSchedule:** user, skill/question family, due date, spacing state, and reason.
- **TestForm:** reproducible assembly manifest with distribution rules and no repeated family.
- **ScoreEstimate:** model version, evidence window, estimate, interval, calibration status, caveats, and feature snapshot.
- **StudyPlan:** versioned goals and scheduled skill activities with user adjustments.
- **ProblemReport:** implemented as immutable learner evidence linked to the exact attempt and question version; append-only reviewer events carry triage status and resolution evidence. Notification delivery remains planned.

## Publication invariants

1. A learner receives only the current explicitly published version of an active question family. Publication requires an approved review and the latest run of every required validator to pass.
2. Every published question has provenance records even when it was authored entirely in-house.
3. Attempts always reference the exact presented version; later corrections do not rewrite history.
4. Retraction removes an item from future selection but preserves audit records and affected-attempt analysis.
5. Aggregate usage statistics are derived from attempts and cannot modify the content record.
6. Model-generated difficulty is a suggestion until reviewer-approved; empirical difficulty is stored separately.
7. Score estimates retain uncertainty and cannot use the label “official ATI score.”
