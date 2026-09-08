import { describe, expect, it } from "vitest";

import { normalizeStripeSubscription } from "./normalize";

describe("normalizeStripeSubscription", () => {
  it("extracts the stable identifiers and latest item period", () => {
    const normalized = normalizeStripeSubscription({
      id: "sub_example",
      customer: { id: "cus_example" },
      status: "active",
      cancel_at_period_end: true,
      items: {
        data: [
          {
            current_period_end: 1_800_000_000,
            price: { id: "price_example", product: { id: "prod_example" } },
          },
          {
            current_period_end: 1_800_000_100,
            price: { id: "price_other", product: "prod_other" },
          },
        ],
      },
    } as never);

    expect(normalized).toEqual({
      id: "sub_example",
      customerId: "cus_example",
      productId: "prod_example",
      priceId: "price_example",
      status: "ACTIVE",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(1_800_000_100_000),
    });
  });

  it("rejects a malformed subscription with no priced item", () => {
    expect(() =>
      normalizeStripeSubscription({
        id: "sub_example",
        items: { data: [] },
      } as never),
    ).toThrow("STRIPE_SUBSCRIPTION_HAS_NO_ITEMS");
  });
});
