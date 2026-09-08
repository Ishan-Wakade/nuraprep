import { describe, expect, it } from "vitest";

import {
  grantsPremiumMathAccess,
  toStoredSubscriptionStatus,
} from "./contracts";

describe("billing contracts", () => {
  it("maps Stripe status values into the database enum", () => {
    expect(toStoredSubscriptionStatus("incomplete_expired")).toBe(
      "INCOMPLETE_EXPIRED",
    );
    expect(toStoredSubscriptionStatus("trialing")).toBe("TRIALING");
    expect(() => toStoredSubscriptionStatus("future_status")).toThrow(
      "UNSUPPORTED_STRIPE_SUBSCRIPTION_STATUS:future_status",
    );
  });

  it("grants premium access only for the configured product in good standing", () => {
    expect(
      grantsPremiumMathAccess(
        { productId: "prod_math", status: "ACTIVE" },
        "prod_math",
      ),
    ).toBe(true);
    expect(
      grantsPremiumMathAccess(
        { productId: "prod_math", status: "TRIALING" },
        "prod_math",
      ),
    ).toBe(true);
    expect(
      grantsPremiumMathAccess(
        { productId: "prod_math", status: "PAST_DUE" },
        "prod_math",
      ),
    ).toBe(false);
    expect(
      grantsPremiumMathAccess(
        { productId: "prod_other", status: "ACTIVE" },
        "prod_math",
      ),
    ).toBe(false);
  });
});
