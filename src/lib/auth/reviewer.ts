import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getDatabase } from "@/db/client";
import { authRoleGrants } from "@/db/schema";
import {
  resolveReviewerIdentity,
  type ReviewerIdentity,
} from "@/lib/auth/authorization";
import { getCurrentSession } from "@/lib/auth/session";
import { getServerEnvironment } from "@/lib/env/server";

export type { ReviewerIdentity } from "@/lib/auth/authorization";

export async function requireReviewer(): Promise<ReviewerIdentity> {
  const environment = getServerEnvironment();
  const session = await getCurrentSession();

  let hasPrivilegedGrant = false;
  if (session?.user) {
    const [grant] = await getDatabase()
      .select({ role: authRoleGrants.role })
      .from(authRoleGrants)
      .where(
        and(
          eq(authRoleGrants.userId, session.user.id),
          inArray(authRoleGrants.role, ["REVIEWER", "ADMIN"]),
          isNull(authRoleGrants.revokedAt),
        ),
      )
      .limit(1);
    hasPrivilegedGrant = Boolean(grant);
  }

  const identity = resolveReviewerIdentity(
    session?.user,
    hasPrivilegedGrant,
    environment.APP_ENV !== "production" && environment.DEV_REVIEWER_ENABLED,
  );

  if (!identity) notFound();
  return identity;
}
