import { describe, expect, it, vi } from "vitest";

import {
  createAcquisitionPlan,
  MetadataOnlyAcquisitionAdapter,
} from "./acquisition";

const source = {
  canonicalUrl: "https://example.org/math-outline",
  publisher: "Example publisher",
  title: "Math outline",
  artifactType: "CONTENT_OUTLINE",
  accessClass: "PUBLIC" as const,
  decision: "METADATA_ONLY" as const,
  decisionRationale:
    "Inspect only bodyless response metadata for this public outline.",
};

describe("source acquisition planning", () => {
  it("never enables body retrieval for coverage-only sources", () => {
    expect(
      createAcquisitionPlan({ ...source, decision: "COVERAGE_ANALYSIS" }),
    ).toEqual({
      mode: "HEAD_METADATA_PLUS_HUMAN_ABSTRACT",
      mayFetchBody: false,
      mayPersistBody: false,
      maySendBodyToModel: false,
    });
  });

  it("requires another reviewed adapter before licensed body storage", () => {
    expect(
      createAcquisitionPlan({
        ...source,
        accessClass: "OPEN_LICENSED",
        decision: "LICENSED_STORAGE",
        statedLicense: "CC BY 4.0",
        termsUrl: "https://example.org/license",
      }),
    ).toMatchObject({
      mode: "LICENSED_STORAGE_REVIEW_REQUIRED",
      mayFetchBody: false,
      mayPersistBody: false,
      maySendBodyToModel: false,
    });
  });

  it("accepts a strict bodyless metadata receipt", async () => {
    const inspectHead = vi.fn().mockResolvedValue({
      status: 200,
      finalUrl: source.canonicalUrl,
      contentType: "text/html",
      contentLength: 100,
      etag: null,
      lastModified: null,
      inspectedAt: "2026-09-05T23:00:00.000Z",
    });
    const adapter = new MetadataOnlyAcquisitionAdapter({ inspectHead });
    await expect(adapter.acquire(source)).resolves.toMatchObject({
      status: 200,
      contentType: "text/html",
    });
    expect(inspectHead).toHaveBeenCalledWith(source.canonicalUrl);
  });

  it("rejects transports that return a response body", async () => {
    const adapter = new MetadataOnlyAcquisitionAdapter({
      inspectHead: vi.fn().mockResolvedValue({
        status: 200,
        finalUrl: source.canonicalUrl,
        contentType: "text/html",
        contentLength: 100,
        etag: null,
        lastModified: null,
        inspectedAt: "2026-09-05T23:00:00.000Z",
        body: "question text must not cross this adapter",
      }),
    });
    await expect(adapter.acquire(source)).rejects.toThrow();
  });
});
