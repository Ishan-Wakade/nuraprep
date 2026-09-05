import { describe, expect, it } from "vitest";

import { getSessionTimerSeconds } from "./timing";

describe("getSessionTimerSeconds", () => {
  it("recovers untimed elapsed time from the persisted start timestamp", () => {
    expect(
      getSessionTimerSeconds({
        startedAtMilliseconds: 1_000,
        timeLimitSeconds: null,
        nowMilliseconds: 6_900,
      }),
    ).toBe(5);
  });

  it("does not display zero before a timed deadline", () => {
    expect(
      getSessionTimerSeconds({
        startedAtMilliseconds: 0,
        timeLimitSeconds: 60,
        nowMilliseconds: 59_999,
      }),
    ).toBe(1);
  });

  it("stays at zero after a timed deadline", () => {
    expect(
      getSessionTimerSeconds({
        startedAtMilliseconds: 0,
        timeLimitSeconds: 60,
        nowMilliseconds: 60_001,
      }),
    ).toBe(0);
  });
});
