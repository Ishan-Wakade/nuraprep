export type DeterministicReviewSampleCandidate = {
  versionId: string;
  latestDecision: string;
  difficulty: string;
  questionType: string;
  hasStimulus: boolean;
  generationTemplateKey: string | null;
  generationTemplateVersion: number | null;
  generationProvider: string | null;
  generationModel: string | null;
  generationPromptHash: string | null;
};

export const DETERMINISTIC_QA_SAMPLE_POLICY = {
  assumedDefectRate: 0.05,
  targetConfidence: 0.95,
} as const;

export type DeterministicQualitySampleReport<
  T extends DeterministicReviewSampleCandidate,
> = {
  items: T[];
  populationSize: number;
  templateCount: number;
  templateAnchorCount: number;
  hashEligiblePopulationSize: number;
  detectionSampleSize: number;
  targetConfidence: number;
  assumedDefectRate: number;
  modeledDetectionProbability: number;
  riskTemplateCount: number;
  riskSupplementCount: number;
  missingHashCount: number;
  riskVersionIds: string[];
};

/**
 * Selects one stable, unreviewed candidate from each deterministic template.
 * The prompt hash makes the result independent of database row order.
 */
export function selectDeterministicReviewSample<
  T extends DeterministicReviewSampleCandidate,
>(candidates: readonly T[]): T[] {
  const selected = new Map<string, T>();

  for (const candidate of candidates) {
    if (
      candidate.latestDecision !== "UNREVIEWED" ||
      candidate.generationProvider !== "NuraPrep" ||
      !candidate.generationModel?.startsWith("deterministic/") ||
      !candidate.generationTemplateKey ||
      candidate.generationTemplateVersion === null
    ) {
      continue;
    }

    const templateIdentity = `${candidate.generationTemplateKey}@${candidate.generationTemplateVersion}`;
    const current = selected.get(templateIdentity);
    if (!current || samplingKey(candidate) < samplingKey(current)) {
      selected.set(templateIdentity, candidate);
    }
  }

  return [...selected.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, candidate]) => candidate);
}

/**
 * Builds a stable quality-review queue without treating the result as approval.
 *
 * The union contains:
 * - one anchor from every deterministic template;
 * - a hash-ranked sample sized to detect an assumed defect prevalence;
 * - one extra candidate from each higher-risk template; and
 * - every otherwise-eligible candidate whose prompt hash is missing or invalid.
 *
 * The detection probability is a finite-population planning model. It assumes
 * uniformly distributed, non-adversarial SHA-256 prompt hashes and says nothing
 * about the correctness of candidates that were not reviewed.
 */
export function buildDeterministicQualitySample<
  T extends DeterministicReviewSampleCandidate,
>(candidates: readonly T[]): DeterministicQualitySampleReport<T> {
  const eligible = candidates.filter(isEligibleDeterministicCandidate);
  const anchors = selectDeterministicReviewSample(eligible);
  const hashEligible = eligible
    .filter((candidate) => isSha256(candidate.generationPromptHash))
    .sort((left, right) => samplingKey(left).localeCompare(samplingKey(right)));
  const detectionSampleSize = minimumSampleSizeForDetection({
    populationSize: hashEligible.length,
    assumedDefectRate: DETERMINISTIC_QA_SAMPLE_POLICY.assumedDefectRate,
    targetConfidence: DETERMINISTIC_QA_SAMPLE_POLICY.targetConfidence,
  });
  const detectionSample = hashEligible.slice(0, detectionSampleSize);
  const missingHashes = eligible.filter(
    (candidate) => !isSha256(candidate.generationPromptHash),
  );

  const candidatesByTemplate = new Map<string, T[]>();
  for (const candidate of eligible) {
    const identity = templateIdentity(candidate);
    const templateCandidates = candidatesByTemplate.get(identity) ?? [];
    templateCandidates.push(candidate);
    candidatesByTemplate.set(identity, templateCandidates);
  }

  const riskSupplements: T[] = [];
  let riskTemplateCount = 0;
  for (const templateCandidates of candidatesByTemplate.values()) {
    if (!templateCandidates.some(isHigherRiskCandidate)) continue;
    riskTemplateCount += 1;
    const [anchor, supplement] = [...templateCandidates].sort((left, right) =>
      samplingKey(left).localeCompare(samplingKey(right)),
    );
    if (supplement && supplement.versionId !== anchor?.versionId) {
      riskSupplements.push(supplement);
    }
  }

  const riskVersionIds = new Set(
    eligible
      .filter(isHigherRiskCandidate)
      .map((candidate) => candidate.versionId),
  );
  const selectedByVersion = new Map<string, T>();
  for (const candidate of [
    ...anchors,
    ...detectionSample,
    ...riskSupplements,
    ...missingHashes,
  ]) {
    selectedByVersion.set(candidate.versionId, candidate);
  }
  const items = [...selectedByVersion.values()].sort((left, right) => {
    const templateComparison = templateIdentity(left).localeCompare(
      templateIdentity(right),
    );
    return (
      templateComparison || samplingKey(left).localeCompare(samplingKey(right))
    );
  });

  return {
    items,
    populationSize: eligible.length,
    templateCount: candidatesByTemplate.size,
    templateAnchorCount: anchors.length,
    hashEligiblePopulationSize: hashEligible.length,
    detectionSampleSize,
    targetConfidence: DETERMINISTIC_QA_SAMPLE_POLICY.targetConfidence,
    assumedDefectRate: DETERMINISTIC_QA_SAMPLE_POLICY.assumedDefectRate,
    modeledDetectionProbability: detectionProbability({
      populationSize: hashEligible.length,
      sampleSize: detectionSampleSize,
      assumedDefectRate: DETERMINISTIC_QA_SAMPLE_POLICY.assumedDefectRate,
    }),
    riskTemplateCount,
    riskSupplementCount: riskSupplements.length,
    missingHashCount: missingHashes.length,
    riskVersionIds: items
      .filter((candidate) => riskVersionIds.has(candidate.versionId))
      .map((candidate) => candidate.versionId),
  };
}

export function minimumSampleSizeForDetection(input: {
  populationSize: number;
  assumedDefectRate: number;
  targetConfidence: number;
}) {
  const { populationSize, assumedDefectRate, targetConfidence } = input;
  if (populationSize <= 0) return 0;
  for (let sampleSize = 1; sampleSize <= populationSize; sampleSize += 1) {
    if (
      detectionProbability({
        populationSize,
        sampleSize,
        assumedDefectRate,
      }) >= targetConfidence
    ) {
      return sampleSize;
    }
  }
  return populationSize;
}

export function detectionProbability(input: {
  populationSize: number;
  sampleSize: number;
  assumedDefectRate: number;
}) {
  const populationSize = Math.max(0, Math.floor(input.populationSize));
  const sampleSize = Math.min(
    populationSize,
    Math.max(0, Math.floor(input.sampleSize)),
  );
  if (populationSize === 0 || sampleSize === 0) return 0;
  const assumedDefectCount = Math.max(
    1,
    Math.ceil(populationSize * input.assumedDefectRate),
  );
  if (sampleSize > populationSize - assumedDefectCount) return 1;

  let missProbability = 1;
  for (let index = 0; index < sampleSize; index += 1) {
    missProbability *=
      (populationSize - assumedDefectCount - index) / (populationSize - index);
  }
  return 1 - missProbability;
}

function isEligibleDeterministicCandidate(
  candidate: DeterministicReviewSampleCandidate,
) {
  return (
    candidate.latestDecision === "UNREVIEWED" &&
    candidate.generationProvider === "NuraPrep" &&
    Boolean(candidate.generationModel?.startsWith("deterministic/")) &&
    Boolean(candidate.generationTemplateKey) &&
    candidate.generationTemplateVersion !== null
  );
}

function isHigherRiskCandidate(candidate: DeterministicReviewSampleCandidate) {
  return (
    candidate.difficulty === "ADVANCED" ||
    candidate.questionType === "MULTIPLE_SELECT" ||
    candidate.questionType === "ORDERED_RESPONSE" ||
    candidate.hasStimulus
  );
}

function isSha256(value: string | null): value is string {
  return Boolean(value && /^[a-f0-9]{64}$/i.test(value));
}

function templateIdentity(candidate: DeterministicReviewSampleCandidate) {
  return `${candidate.generationTemplateKey}@${candidate.generationTemplateVersion}`;
}

function samplingKey(candidate: DeterministicReviewSampleCandidate) {
  return `${candidate.generationPromptHash ?? candidate.versionId}:${candidate.versionId}`;
}
