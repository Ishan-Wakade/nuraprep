export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export type LearnerIdentity = {
  subject: string;
  displayName: string;
  authUserId: string | null;
  email: string | null;
  mode: "authenticated" | "development";
};

export type ReviewerIdentity = {
  id: string;
  name: string;
  mode: "authenticated" | "development";
  role: "REVIEWER" | "ADMIN" | "DEVELOPMENT";
};

export function resolveLearnerIdentity(
  user: SessionUser | undefined,
  developmentAccessEnabled: boolean,
): LearnerIdentity | undefined {
  if (user) {
    return {
      subject: `auth-user:${user.id}`,
      displayName: user.name,
      authUserId: user.id,
      email: user.email,
      mode: "authenticated",
    };
  }

  if (!developmentAccessEnabled) return undefined;

  return {
    subject: "development-learner",
    displayName: "Development learner",
    authUserId: null,
    email: null,
    mode: "development",
  };
}

export function resolveReviewerIdentity(
  user: SessionUser | undefined,
  privilegedRole: "REVIEWER" | "ADMIN" | undefined,
  developmentAccessEnabled: boolean,
): ReviewerIdentity | undefined {
  if (user) {
    if (!privilegedRole) return undefined;
    return {
      id: user.id,
      name: user.name,
      mode: "authenticated",
      role: privilegedRole,
    };
  }

  if (!developmentAccessEnabled) return undefined;

  return {
    id: "development-owner",
    name: "Development reviewer",
    mode: "development",
    role: "DEVELOPMENT",
  };
}
