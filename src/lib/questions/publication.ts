import "server-only";

import { ne } from "drizzle-orm";

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

  return ne(questionPublications.publishedBy, E2E_FIXTURE_REVIEWER_ID);
}
