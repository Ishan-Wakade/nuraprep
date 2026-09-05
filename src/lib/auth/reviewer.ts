import "server-only";

import { notFound } from "next/navigation";

import { getServerEnvironment } from "@/lib/env/server";

export type ReviewerIdentity = {
  id: string;
  name: string;
  mode: "development";
};

export function requireReviewer(): ReviewerIdentity {
  const environment = getServerEnvironment();

  if (
    !environment.DEV_REVIEWER_ENABLED ||
    environment.APP_ENV === "production"
  ) {
    notFound();
  }

  return {
    id: "development-owner",
    name: "Development reviewer",
    mode: "development",
  };
}
