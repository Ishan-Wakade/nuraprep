import { describe, expect, it } from "vitest";

import {
  readBoundedRequestBody,
  RequestBodyTooLargeError,
} from "./request-body";

describe("bounded request bodies", () => {
  it("preserves the exact UTF-8 bytes used for signature verification", async () => {
    const body = '{"type":"subscription.updated","note":"résumé"}';
    const request = new Request("https://example.test/webhook", {
      method: "POST",
      body,
    });

    const result = await readBoundedRequestBody(request, 1_024);

    expect(result.equals(Buffer.from(body))).toBe(true);
  });

  it("rejects a declared body that exceeds the limit before reading it", async () => {
    const request = new Request("https://example.test/webhook", {
      method: "POST",
      headers: { "content-length": "1025" },
      body: "small",
    });

    await expect(readBoundedRequestBody(request, 1_024)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("enforces the byte limit when content length is absent or untrusted", async () => {
    const request = new Request("https://example.test/webhook", {
      method: "POST",
      body: "€€",
    });

    await expect(readBoundedRequestBody(request, 5)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("rejects invalid configured limits", async () => {
    const request = new Request("https://example.test/webhook", {
      method: "POST",
      body: "{}",
    });

    await expect(readBoundedRequestBody(request, 0)).rejects.toThrow(
      "positive integer",
    );
  });
});
