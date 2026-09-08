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

  let privilegedRole: "REVIEWER" | "ADMIN" | undefined;
  if (session?.user) {
    const grants = await getDatabase()
      .select({ role: authRoleGrants.role })
      .from(authRoleGrants)
      .where(
        and(
          eq(authRoleGrants.userId, session.user.id),
          inArray(authRoleGrants.role, ["REVIEWER", "ADMIN"]),
          isNull(authRoleGrants.revokedAt),
        ),
      );
    privilegedRole = grants.some((grant) => grant.role === "ADMIN")
      ? "ADMIN"
      : grants.some((grant) => grant.role === "REVIEWER")
        ? "REVIEWER"
        : undefined;
  }

  const identity = resolveReviewerIdentity(
    session?.user,
    privilegedRole,
    environment.APP_ENV !== "production" && environment.DEV_REVIEWER_ENABLED,
  );

  if (!identity) notFound();
  return identity;
}

export async function requireAdmin(): Promise<ReviewerIdentity> {
  const reviewer = await requireReviewer();
  if (reviewer.role !== "ADMIN") notFound();
  return reviewer;
}
