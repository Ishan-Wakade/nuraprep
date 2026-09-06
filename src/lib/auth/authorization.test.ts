import { describe, expect, it } from "vitest";

import {
  resolveLearnerIdentity,
  resolveReviewerIdentity,
} from "./authorization";

const user = {
  id: "auth-user-1",
  name: "Ada Learner",
  email: "ada@example.test",
};

describe("authentication authorization policy", () => {
  it("maps an authenticated account to a stable learner principal", () => {
    expect(resolveLearnerIdentity(user, false)).toEqual({
      subject: "auth-user:auth-user-1",
      displayName: "Ada Learner",
      authUserId: "auth-user-1",
      email: "ada@example.test",
      mode: "authenticated",
    });
  });

  it("allows the learner development principal only when explicitly enabled", () => {
    expect(resolveLearnerIdentity(undefined, false)).toBeUndefined();
    expect(resolveLearnerIdentity(undefined, true)?.mode).toBe("development");
  });

  it("denies an authenticated learner without a privileged database grant", () => {
    expect(resolveReviewerIdentity(user, false, true)).toBeUndefined();
  });

  it("accepts an authenticated reviewer only with a privileged database grant", () => {
    expect(resolveReviewerIdentity(user, true, false)).toEqual({
      id: "auth-user-1",
      name: "Ada Learner",
      mode: "authenticated",
    });
  });

  it("never lets development access override a signed-in account's missing grant", () => {
    expect(resolveReviewerIdentity(user, false, true)).toBeUndefined();
    expect(resolveReviewerIdentity(undefined, false, true)?.mode).toBe(
      "development",
    );
  });
});
