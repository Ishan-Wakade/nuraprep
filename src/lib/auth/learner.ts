import "server-only";

import { redirect } from "next/navigation";

import {
  resolveLearnerIdentity,
  type LearnerIdentity,
} from "@/lib/auth/authorization";
import { getCurrentSession } from "@/lib/auth/session";
import { getServerEnvironment } from "@/lib/env/server";

export type { LearnerIdentity } from "@/lib/auth/authorization";

export async function requireLearner(): Promise<LearnerIdentity> {
  const environment = getServerEnvironment();
  const session = await getCurrentSession();

  const identity = resolveLearnerIdentity(
    session?.user,
    environment.APP_ENV !== "production" && environment.DEV_LEARNER_ENABLED,
  );

  if (!identity) redirect("/sign-in?returnTo=/practice");
  return identity;
}
