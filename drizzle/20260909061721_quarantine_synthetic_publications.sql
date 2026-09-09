UPDATE "question_publications" AS publication
SET "retired_at" = now(),
    "retired_by" = 'synthetic-evidence-quarantine-v1',
    "retirement_reason" = 'Quarantined because the publication was synthetic or its exact version lacks a latest genuine approval after synthetic-evidence classification.'
WHERE publication."retired_at" IS NULL
  AND (
    publication."published_by" = 'e2e-fixture-reviewer'
    OR coalesce((
      SELECT genuine_decision."decision"::text
      FROM "review_decisions" AS genuine_decision
      WHERE genuine_decision."question_version_id" = publication."question_version_id"
        AND genuine_decision."synthetic" = false
      ORDER BY genuine_decision."decided_at" DESC, genuine_decision."id" DESC
      LIMIT 1
    ), 'UNREVIEWED') <> 'APPROVED'
  );
