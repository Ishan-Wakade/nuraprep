import { describe, expect, it } from "vitest";

import { parseTrustedProxyCidrs } from "./network";

describe("parseTrustedProxyCidrs", () => {
  it("normalizes comma-separated IPv4 and IPv6 ranges", () => {
    expect(
      parseTrustedProxyCidrs(
        "10.42.0.0/24, 10.42.1.0/24, 2001:db8::/64,10.42.0.0/24",
      ),
    ).toEqual(["10.42.0.0/24", "10.42.1.0/24", "2001:db8::/64"]);
  });

  it("accepts an exact proxy address and an empty local configuration", () => {
    expect(parseTrustedProxyCidrs("192.0.2.10")).toEqual(["192.0.2.10"]);
    expect(parseTrustedProxyCidrs("")).toEqual([]);
  });

  it.each([
    "10.42.0.0/33",
    "0.0.0.0/0",
    "2001:db8::/129",
    "::/0",
    "10.42.0.0/not-a-prefix",
    "not-an-address",
  ])("rejects invalid proxy range %s", (value) => {
    expect(() => parseTrustedProxyCidrs(value)).toThrow(
      "TRUSTED_PROXY_CIDRS contains an invalid IP address or CIDR",
    );
  });

  it("bounds configuration size", () => {
    const entries = Array.from(
      { length: 17 },
      (_, index) => `192.0.2.${index + 1}`,
    );
    expect(() => parseTrustedProxyCidrs(entries.join(","))).toThrow(
      "accepts at most 16 entries",
    );
  });
});
