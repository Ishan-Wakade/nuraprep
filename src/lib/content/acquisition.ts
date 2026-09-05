import { z } from "zod";

import {
  sourceRegistrationSchema,
  type SourceRegistration,
} from "./source-policy";

export type AcquisitionPlan = {
  mode:
    | "SKIP"
    | "HEAD_METADATA_ONLY"
    | "HEAD_METADATA_PLUS_HUMAN_ABSTRACT"
    | "LICENSED_STORAGE_REVIEW_REQUIRED";
  mayFetchBody: boolean;
  mayPersistBody: boolean;
  maySendBodyToModel: boolean;
};

export function createAcquisitionPlan(
  source: SourceRegistration,
): AcquisitionPlan {
  switch (source.decision) {
    case "EXCLUDED":
    case "QUARANTINED":
      return {
        mode: "SKIP",
        mayFetchBody: false,
        mayPersistBody: false,
        maySendBodyToModel: false,
      };
    case "METADATA_ONLY":
      return {
        mode: "HEAD_METADATA_ONLY",
        mayFetchBody: false,
        mayPersistBody: false,
        maySendBodyToModel: false,
      };
    case "COVERAGE_ANALYSIS":
      return {
        mode: "HEAD_METADATA_PLUS_HUMAN_ABSTRACT",
        mayFetchBody: false,
        mayPersistBody: false,
        maySendBodyToModel: false,
      };
    case "LICENSED_STORAGE":
      return {
        mode: "LICENSED_STORAGE_REVIEW_REQUIRED",
        mayFetchBody: false,
        mayPersistBody: false,
        maySendBodyToModel: false,
      };
  }
}

const metadataReceiptSchema = z
  .object({
    status: z.number().int().min(100).max(599),
    finalUrl: z.url(),
    contentType: z.string().max(240).nullable(),
    contentLength: z.number().int().nonnegative().nullable(),
    etag: z.string().max(500).nullable(),
    lastModified: z.string().max(500).nullable(),
    inspectedAt: z.iso.datetime(),
  })
  .strict();

export type MetadataReceipt = z.infer<typeof metadataReceiptSchema>;

export interface MetadataInspectionTransport {
  /** Must perform a bodyless metadata request and enforce network egress rules. */
  inspectHead(canonicalUrl: string): Promise<unknown>;
}

export class MetadataOnlyAcquisitionAdapter {
  constructor(private readonly transport: MetadataInspectionTransport) {}

  async acquire(rawSource: unknown): Promise<MetadataReceipt> {
    const source = sourceRegistrationSchema.parse(rawSource);
    const plan = createAcquisitionPlan(source);
    if (
      plan.mode !== "HEAD_METADATA_ONLY" &&
      plan.mode !== "HEAD_METADATA_PLUS_HUMAN_ABSTRACT"
    ) {
      throw new Error("SOURCE_NOT_ELIGIBLE_FOR_METADATA_ADAPTER");
    }

    const rawReceipt = await this.transport.inspectHead(source.canonicalUrl);
    return metadataReceiptSchema.parse(rawReceipt);
  }
}
