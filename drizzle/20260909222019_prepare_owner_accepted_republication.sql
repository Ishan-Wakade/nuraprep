DO $$
DECLARE
  target record;
  successor_id uuid;
BEGIN
  SELECT question.id AS family_id,
         latest.*
  INTO target
  FROM questions AS question
  INNER JOIN LATERAL (
    SELECT version.*
    FROM question_versions AS version
    WHERE version.question_id = question.id
    ORDER BY version.version DESC
    LIMIT 1
  ) AS latest ON true
  WHERE question.internal_slug = 'whole-number-groups-001'
    AND EXISTS (
      SELECT 1
      FROM question_publications AS publication
      WHERE publication.question_version_id = latest.id
        AND publication.retired_at IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM question_publications AS publication
      WHERE publication.question_id = question.id
        AND publication.retired_at IS NULL
    );

  IF target.id IS NULL THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(target.family_id::text, 0));

  INSERT INTO question_versions (
    question_id,
    version,
    question_type,
    prompt,
    stimulus,
    choices,
    answer_spec,
    explanation,
    distractor_rationales,
    verification_spec,
    primary_skill_id,
    learning_objective,
    difficulty,
    difficulty_rationale,
    estimated_seconds,
    calculator_policy,
    common_misconceptions,
    misconception_rules,
    tutor_guidance,
    authoring_mode,
    author_id,
    provenance_summary,
    superseded_reason
  ) VALUES (
    target.question_id,
    target.version + 1,
    target.question_type,
    target.prompt,
    target.stimulus,
    target.choices,
    target.answer_spec,
    target.explanation,
    target.distractor_rationales,
    target.verification_spec,
    target.primary_skill_id,
    target.learning_objective,
    target.difficulty,
    target.difficulty_rationale,
    target.estimated_seconds,
    target.calculator_policy,
    target.common_misconceptions,
    target.misconception_rules,
    target.tutor_guidance,
    'HUMAN',
    'owner-accepted-republication-2026-09-09',
    target.provenance_summary || ' Learner-identical successor created because the previously accepted version is permanently retired.',
    'Supersedes a learner-identical version that cannot be republished after retirement.'
  )
  RETURNING id INTO successor_id;

  INSERT INTO question_version_sources (
    question_version_id,
    source_artifact_id,
    relationship,
    transformation_notes
  )
  SELECT successor_id,
         source_artifact_id,
         relationship,
         transformation_notes
  FROM question_version_sources
  WHERE question_version_id = target.id;

  INSERT INTO question_version_skills (
    question_version_id,
    skill_id,
    relationship
  )
  SELECT successor_id,
         skill_id,
         relationship
  FROM question_version_skills
  WHERE question_version_id = target.id;

  UPDATE questions
  SET updated_at = now()
  WHERE id = target.family_id;
END;
$$;
