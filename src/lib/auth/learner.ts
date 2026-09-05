import "server-only";

import { notFound } from "next/navigation";

import { getServerEnvironment } from "@/lib/env/server";

export type LearnerIdentity = {
  subject: string;
  displayName: string;
  mode: "development";
};

export function requireLearner(): LearnerIdentity {
  const environment = getServerEnvironment();

  if (
    !environment.DEV_LEARNER_ENABLED ||
    environment.APP_ENV === "production"
  ) {
    notFound();
  }

  return {
    subject: "development-learner",
    displayName: "Development learner",
    mode: "development",
  };
}
