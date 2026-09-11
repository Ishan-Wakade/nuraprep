import { createHash } from "node:crypto";

import { z } from "zod";

import { generatedCandidateSchema, type GeneratedCandidate } from "./contracts";
import {
  findInternalSimilaritySignals,
  type OriginalityDocument,
  type SimilaritySignal,
} from "@/lib/questions/originality";
import {
  validateMathVerification,
  validateMisconceptionRules,
  validateQuestionContent,
} from "@/lib/questions/validation";

const templateMetadataSchema = z.object({
  key: z
    .string()
    .trim()
    .min(3)
    .max(160)
    .regex(/^[a-z0-9][a-z0-9._-]+$/),
  version: z.number().int().positive(),
  targetSkillCode: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]+$/),
  questionType: z.enum([
    "SINGLE_CHOICE",
    "MULTIPLE_SELECT",
    "NUMERIC",
    "ORDERED_RESPONSE",
  ]),
  difficulty: z.enum(["FOUNDATIONAL", "DEVELOPING", "PROFICIENT", "ADVANCED"]),
  structureCapacity: z.number().int().positive().max(10_000),
});

const batchInputSchema = z.object({
  batchSeed: z.string().trim().min(1).max(160),
  requestedCount: z.number().int().min(1).max(1_000),
  maxAttemptsPerItem: z.number().int().min(1).max(100).default(20),
});

const variantDraftSchema = z.object({
  structureKey: z
    .string()
    .trim()
    .min(3)
    .max(160)
    .regex(/^[a-z0-9][a-z0-9._-]+$/),
  parameters: z.record(z.string(), z.json()),
  candidate: generatedCandidateSchema,
});

export type SeededRandom = {
  next(): number;
  integer(minimum: number, maximum: number): number;
  pick<T>(values: readonly T[]): T;
  shuffle<T>(values: readonly T[]): T[];
};

export type DeterministicVariantDraft = z.infer<typeof variantDraftSchema>;

export type DeterministicVariantTemplate = z.infer<
  typeof templateMetadataSchema
> & {
  generate(random: SeededRandom): DeterministicVariantDraft;
};

export type VariantRejectionReason =
  | "TEMPLATE_ERROR"
  | "CANDIDATE_SCHEMA_INVALID"
  | "TEMPLATE_CONTRACT_MISMATCH"
  | "CANDIDATE_CONTENT_INVALID"
  | "CANDIDATE_MATH_INVALID"
  | "CANDIDATE_MISCONCEPTION_INVALID"
  | "STRUCTURE_REUSED"
  | "CONTENT_DUPLICATE";

export type AcceptedDeterministicVariant = {
  batchId: string;
  candidateSeed: string;
  structureKey: string;
  parameters: Record<string, unknown>;
  contentHash: string;
  candidate: GeneratedCandidate;
  similaritySignals: SimilaritySignal[];
  provenance: {
    method: "DETERMINISTIC_TEMPLATE";
    templateKey: string;
    templateVersion: number;
    targetSkillCode: string;
    batchSeed: string;
    sourceQuestionTextProvided: false;
  };
};

export type RejectedDeterministicVariant = {
  slot: number;
  attempt: number;
  candidateSeed: string;
  reason: VariantRejectionReason;
  detail: string;
};

export type DeterministicVariantBatch = {
  batchId: string;
  templateKey: string;
  templateVersion: number;
  batchSeed: string;
  requestedCount: number;
  accepted: AcceptedDeterministicVariant[];
  rejected: RejectedDeterministicVariant[];
  exhaustedSlots: number;
  rejectionCounts: Record<VariantRejectionReason, number>;
};

export function generateDeterministicVariantBatch(input: {
  template: DeterministicVariantTemplate;
  batchSeed: string;
  requestedCount: number;
  maxAttemptsPerItem?: number;
  corpus?: OriginalityDocument[];
}): DeterministicVariantBatch {
  const metadata = templateMetadataSchema.parse(input.template);
  const batch = batchInputSchema.parse({
    batchSeed: input.batchSeed,
    requestedCount: input.requestedCount,
    maxAttemptsPerItem: input.maxAttemptsPerItem,
  });
  const batchId = hash({
    templateKey: metadata.key,
    templateVersion: metadata.version,
    batchSeed: batch.batchSeed,
  }).slice(0, 24);
  if (batch.requestedCount > metadata.structureCapacity) {
    throw new Error(
      `Requested ${batch.requestedCount} variants from ${metadata.key}, but template v${metadata.version} declares only ${metadata.structureCapacity} distinct structures.`,
    );
  }
  const accepted: AcceptedDeterministicVariant[] = [];
  const rejected: RejectedDeterministicVariant[] = [];
  const structures = new Set<string>();
  const contentHashes = new Set<string>();
  const corpus = [...(input.corpus ?? [])];
  let exhaustedSlots = 0;

  for (let slot = 0; slot < batch.requestedCount; slot += 1) {
    let acceptedSlot = false;
    for (let attempt = 0; attempt < batch.maxAttemptsPerItem; attempt += 1) {
      const candidateSeed = hash({
        batchId,
        slot,
        attempt,
      });
      let rawDraft: unknown;
      try {
        rawDraft = input.template.generate(createSeededRandom(candidateSeed));
      } catch (error) {
        rejected.push({
          slot,
          attempt,
          candidateSeed,
          reason: "TEMPLATE_ERROR",
          detail: error instanceof Error ? error.message : "Template threw.",
        });
        continue;
      }

      const parsed = variantDraftSchema.safeParse(rawDraft);
      if (!parsed.success) {
        rejected.push({
          slot,
          attempt,
          candidateSeed,
          reason: "CANDIDATE_SCHEMA_INVALID",
          detail:
            parsed.error.issues[0]?.message ?? "Invalid candidate schema.",
        });
        continue;
      }
      const draft = parsed.data;
      if (
        draft.candidate.content.questionType !== metadata.questionType ||
        draft.candidate.difficulty !== metadata.difficulty
      ) {
        rejected.push({
          slot,
          attempt,
          candidateSeed,
          reason: "TEMPLATE_CONTRACT_MISMATCH",
          detail: "Question type or difficulty differs from the template.",
        });
        continue;
      }

      const contentResult = validateQuestionContent(draft.candidate.content);
      if (!contentResult.valid) {
        rejected.push({
          slot,
          attempt,
          candidateSeed,
          reason: "CANDIDATE_CONTENT_INVALID",
          detail:
            contentResult.issues[0]?.message ?? "Invalid question content.",
        });
        continue;
      }
      const mathResult = validateMathVerification(
        contentResult.content,
        draft.candidate.verificationSpec,
      );
      if (!mathResult.valid) {
        rejected.push({
          slot,
          attempt,
          candidateSeed,
          reason: "CANDIDATE_MATH_INVALID",
          detail: mathResult.failureCode,
        });
        continue;
      }
      const misconceptionIssues = validateMisconceptionRules(
        contentResult.content,
        draft.candidate.commonMisconceptions,
        draft.candidate.misconceptionRules,
      );
      if (misconceptionIssues.length > 0) {
        rejected.push({
          slot,
          attempt,
          candidateSeed,
          reason: "CANDIDATE_MISCONCEPTION_INVALID",
          detail:
            misconceptionIssues[0]?.message ?? "Invalid misconception rule.",
        });
        continue;
      }
      if (structures.has(draft.structureKey)) {
        rejected.push({
          slot,
          attempt,
          candidateSeed,
          reason: "STRUCTURE_REUSED",
          detail: `Structure ${draft.structureKey} already appears in this batch.`,
        });
        continue;
      }

      const contentHash = hash(draft.candidate.content);
      const originalityDocument = toOriginalityDocument(
        `${batchId}:${slot}`,
        contentResult.content,
      );
      const similaritySignals = findInternalSimilaritySignals(
        originalityDocument,
        corpus,
      );
      const blockingSimilarity = similaritySignals.find(
        (signal) => signal.blocking,
      );
      if (contentHashes.has(contentHash) || blockingSimilarity) {
        rejected.push({
          slot,
          attempt,
          candidateSeed,
          reason: "CONTENT_DUPLICATE",
          detail: blockingSimilarity
            ? `${blockingSimilarity.reason} against ${blockingSimilarity.comparedWithId}.`
            : "Canonical question content already appears in this batch.",
        });
        continue;
      }

      structures.add(draft.structureKey);
      contentHashes.add(contentHash);
      corpus.push(originalityDocument);
      accepted.push({
        batchId,
        candidateSeed,
        structureKey: draft.structureKey,
        parameters: draft.parameters,
        contentHash,
        candidate: draft.candidate,
        similaritySignals,
        provenance: {
          method: "DETERMINISTIC_TEMPLATE",
          templateKey: metadata.key,
          templateVersion: metadata.version,
          targetSkillCode: metadata.targetSkillCode,
          batchSeed: batch.batchSeed,
          sourceQuestionTextProvided: false,
        },
      });
      acceptedSlot = true;
      break;
    }
    if (!acceptedSlot) exhaustedSlots += 1;
  }

  return {
    batchId,
    templateKey: metadata.key,
    templateVersion: metadata.version,
    batchSeed: batch.batchSeed,
    requestedCount: batch.requestedCount,
    accepted,
    rejected,
    exhaustedSlots,
    rejectionCounts: countRejections(rejected),
  };
}

export function createSeededRandom(seed: string): SeededRandom {
  let state = createHash("sha256").update(seed).digest().readUInt32LE(0);
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };

  return {
    next,
    integer(minimum, maximum) {
      if (
        !Number.isSafeInteger(minimum) ||
        !Number.isSafeInteger(maximum) ||
        maximum < minimum
      ) {
        throw new Error("Random integer bounds must be ordered safe integers.");
      }
      return minimum + Math.floor(next() * (maximum - minimum + 1));
    },
    pick(values) {
      if (values.length === 0) {
        throw new Error("Cannot choose from an empty collection.");
      }
      return values[Math.floor(next() * values.length)]!;
    },
    shuffle(values) {
      const shuffled = [...values];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(next() * (index + 1));
        const current = shuffled[index]!;
        shuffled[index] = shuffled[swapIndex]!;
        shuffled[swapIndex] = current;
      }
      return shuffled;
    },
  };
}

function toOriginalityDocument(
  id: string,
  content: GeneratedCandidate["content"],
): OriginalityDocument {
  return {
    id,
    prompt: content.prompt,
    stimulus: content.stimulus,
    choices: content.choices,
  };
}

function countRejections(rejected: RejectedDeterministicVariant[]) {
  const counts: Record<VariantRejectionReason, number> = {
    TEMPLATE_ERROR: 0,
    CANDIDATE_SCHEMA_INVALID: 0,
    TEMPLATE_CONTRACT_MISMATCH: 0,
    CANDIDATE_CONTENT_INVALID: 0,
    CANDIDATE_MATH_INVALID: 0,
    CANDIDATE_MISCONCEPTION_INVALID: 0,
    STRUCTURE_REUSED: 0,
    CONTENT_DUPLICATE: 0,
  };
  for (const rejection of rejected) counts[rejection.reason] += 1;
  return counts;
}

function hash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}
