DO $$
DECLARE
  target record;
  new_version_id uuid;
BEGIN
  FOR target IN
    WITH verification_specs(internal_slug, verification_spec) AS (
      VALUES
        (
          'equivalent-ratios-001',
          '{"kind":"choice_equivalence","target":[3,5,"divide"],"candidates":{"a":[6,10,"divide"],"b":[9,12,"divide"],"c":[12,20,"divide"],"d":[15,30,"divide"]},"tolerance":0.000000001}'::jsonb
        ),
        (
          'decimal-order-001',
          '{"kind":"ordered_values","values":{"a":0.62,"b":0.602,"c":0.206,"d":0.26},"direction":"ascending"}'::jsonb
        ),
        (
          'table-median-001',
          '{"kind":"data_result","operation":"median","values":[14,9,18,11,13],"tolerance":0}'::jsonb
        ),
        (
          'rectangle-perimeter-001',
          '{"kind":"numeric_result","expression":[54,2,16,"multiply","subtract",2,"divide"],"tolerance":0}'::jsonb
        )
    )
    SELECT question.id AS family_id,
           version.*,
           specification.verification_spec AS backfill_specification
    FROM verification_specs AS specification
    INNER JOIN questions AS question
      ON question.internal_slug = specification.internal_slug
    INNER JOIN LATERAL (
      SELECT latest.*
      FROM question_versions AS latest
      WHERE latest.question_id = question.id
      ORDER BY latest.version DESC
      LIMIT 1
    ) AS version ON true
    WHERE version.verification_spec IS NULL
    ORDER BY specification.internal_slug
  LOOP
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
      target.backfill_specification,
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
      'verification-metadata-backfill-2026-09-09',
      target.provenance_summary || ' Metadata-only revision adds the missing deterministic verification recipe; learner-facing content is unchanged.',
      'Supersedes a learner-identical version that lacked a deterministic verification recipe.'
    )
    RETURNING id INTO new_version_id;

    INSERT INTO question_version_sources (
      question_version_id,
      source_artifact_id,
      relationship,
      transformation_notes
    )
    SELECT new_version_id,
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
    SELECT new_version_id,
           skill_id,
           relationship
    FROM question_version_skills
    WHERE question_version_id = target.id;

    UPDATE questions
    SET updated_at = now()
    WHERE id = target.family_id;
  END LOOP;
END;
$$;
