export type DeterministicReviewSampleCandidate = {
  versionId: string;
  latestDecision: string;
  generationTemplateKey: string | null;
  generationTemplateVersion: number | null;
  generationProvider: string | null;
  generationModel: string | null;
  generationPromptHash: string | null;
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

function samplingKey(candidate: DeterministicReviewSampleCandidate) {
  return `${candidate.generationPromptHash ?? candidate.versionId}:${candidate.versionId}`;
}
