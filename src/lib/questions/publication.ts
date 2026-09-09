import "server-only";

import { and, ne, sql } from "drizzle-orm";

import { questionPublications } from "@/db/schema";
import { getServerEnvironment } from "@/lib/env/server";

export const E2E_FIXTURE_REVIEWER_ID = "e2e-fixture-reviewer";

/**
 * Browser-test publications are valid only inside the isolated E2E database.
 * Keeping this predicate beside every learner-bank query prevents a copied or
 * misconfigured development database from exposing synthetic fixtures.
 */
export function learnerSafePublicationCondition() {
  if (getServerEnvironment().APP_ENV === "test") return undefined;

  return and(
    ne(questionPublications.publishedBy, E2E_FIXTURE_REVIEWER_ID),
    sql`(
      SELECT genuine_decision.decision
      FROM review_decisions AS genuine_decision
      WHERE genuine_decision.question_version_id = ${questionPublications.questionVersionId}
        AND genuine_decision.synthetic = false
      ORDER BY genuine_decision.decided_at DESC, genuine_decision.id DESC
      LIMIT 1
    ) = 'APPROVED'::review_decision`,
  );
}
