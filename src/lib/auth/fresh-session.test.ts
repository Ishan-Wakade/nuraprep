import { describe, expect, it } from "vitest";

import {
  FRESH_SESSION_WINDOW_MILLISECONDS,
  isFreshSession,
} from "./fresh-session";

describe("isFreshSession", () => {
  const now = new Date("2026-09-06T16:00:00.000Z");

  it("accepts a session inside the sensitive-action window", () => {
    expect(isFreshSession(new Date(now.getTime() - 60_000), now)).toBe(true);
    expect(
      isFreshSession(
        new Date(now.getTime() - FRESH_SESSION_WINDOW_MILLISECONDS),
        now,
      ),
    ).toBe(true);
  });

  it("rejects old and future-dated sessions", () => {
    expect(
      isFreshSession(
        new Date(now.getTime() - FRESH_SESSION_WINDOW_MILLISECONDS - 1),
        now,
      ),
    ).toBe(false);
    expect(isFreshSession(new Date(now.getTime() + 1), now)).toBe(false);
  });
});
