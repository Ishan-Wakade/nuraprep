export const PRACTICE_TEST_ASSEMBLER_VERSION = "math-blueprint-v1";

export type PracticeTestSpecification = {
  totalQuestions: number;
  scoredQuestions: number;
  unscoredQuestions: number;
  durationMinutes: number;
  domainDistribution: Record<string, number>;
};

export type PracticeTestCandidate = {
  questionId: string;
  questionVersionId: string;
  domainTitle: string;
  difficulty: "FOUNDATIONAL" | "DEVELOPING" | "PROFICIENT" | "ADVANCED";
  questionType:
    "SINGLE_CHOICE" | "MULTIPLE_SELECT" | "NUMERIC" | "ORDERED_RESPONSE";
};

export type PracticeTestSelection = PracticeTestCandidate & {
  position: number;
  selectionReason: string;
};

export function assemblePracticeTest({
  specification,
  candidates,
  seed,
}: {
  specification: PracticeTestSpecification;
  candidates: PracticeTestCandidate[];
  seed: string;
}) {
  const targetDistribution = allocateUnscoredQuestions(specification);
  const uniqueCandidates = keepOneVersionPerFamily(candidates, seed);
  const readiness = Object.entries(targetDistribution).map(
    ([domainTitle, required]) => {
      const available = uniqueCandidates.filter(
        (candidate) => candidate.domainTitle === domainTitle,
      ).length;
      return {
        domainTitle,
        required,
        available,
        deficit: Math.max(0, required - available),
      };
    },
  );
  const ready =
    readiness.every((domain) => domain.deficit === 0) &&
    uniqueCandidates.length >= specification.totalQuestions;

  if (!ready) {
    return {
      ready,
      readiness,
      targetDistribution,
      selections: [] as PracticeTestSelection[],
      uniqueCandidateCount: uniqueCandidates.length,
    };
  }

  const selectedByDomain = new Map(
    Object.entries(targetDistribution).map(([domainTitle, target]) => [
      domainTitle,
      stratifiedDomainSelection(
        uniqueCandidates.filter(
          (candidate) => candidate.domainTitle === domainTitle,
        ),
        target,
        `${seed}:${domainTitle}`,
      ),
    ]),
  );
  const selections: PracticeTestSelection[] = [];
  const usedByDomain = new Map<string, number>();

  while (selections.length < specification.totalQuestions) {
    const nextDomain = Object.keys(targetDistribution)
      .filter(
        (domainTitle) =>
          (usedByDomain.get(domainTitle) ?? 0) <
          targetDistribution[domainTitle],
      )
      .sort((left, right) => {
        const leftProgress =
          (usedByDomain.get(left) ?? 0) / targetDistribution[left];
        const rightProgress =
          (usedByDomain.get(right) ?? 0) / targetDistribution[right];
        return leftProgress - rightProgress || left.localeCompare(right);
      })[0];
    if (!nextDomain) break;

    const used = usedByDomain.get(nextDomain) ?? 0;
    const candidate = selectedByDomain.get(nextDomain)?.[used];
    if (!candidate) break;
    const position = selections.length + 1;
    selections.push({
      ...candidate,
      position,
      selectionReason: `${PRACTICE_TEST_ASSEMBLER_VERSION}; ${nextDomain} blueprint slot ${used + 1} of ${targetDistribution[nextDomain]}; deterministic seed ${seed}; stratified across available internal difficulty and response-format bands; no repeated question family.`,
    });
    usedByDomain.set(nextDomain, used + 1);
  }

  return {
    ready: selections.length === specification.totalQuestions,
    readiness,
    targetDistribution,
    selections,
    uniqueCandidateCount: uniqueCandidates.length,
  };
}

export function allocateUnscoredQuestions(
  specification: PracticeTestSpecification,
) {
  const entries = Object.entries(specification.domainDistribution);
  const scoredTotal = entries.reduce((total, [, count]) => total + count, 0);
  if (
    scoredTotal !== specification.scoredQuestions ||
    specification.scoredQuestions + specification.unscoredQuestions !==
      specification.totalQuestions
  ) {
    throw new Error("The practice-test specification counts are inconsistent.");
  }

  const allocations = entries.map(([domainTitle, scored]) => {
    const exactExtra =
      specification.scoredQuestions === 0
        ? 0
        : (scored / specification.scoredQuestions) *
          specification.unscoredQuestions;
    return {
      domainTitle,
      count: scored + Math.floor(exactExtra),
      remainder: exactExtra - Math.floor(exactExtra),
    };
  });
  let remaining =
    specification.totalQuestions -
    allocations.reduce((total, allocation) => total + allocation.count, 0);
  allocations
    .sort(
      (left, right) =>
        right.remainder - left.remainder ||
        left.domainTitle.localeCompare(right.domainTitle),
    )
    .forEach((allocation) => {
      if (remaining <= 0) return;
      allocation.count += 1;
      remaining -= 1;
    });

  return Object.fromEntries(
    allocations.map((allocation) => [allocation.domainTitle, allocation.count]),
  );
}

function keepOneVersionPerFamily(
  candidates: PracticeTestCandidate[],
  seed: string,
) {
  const sorted = [...candidates].sort(
    (left, right) =>
      seededRank(`${seed}:${left.questionVersionId}`) -
        seededRank(`${seed}:${right.questionVersionId}`) ||
      left.questionVersionId.localeCompare(right.questionVersionId),
  );
  const seen = new Set<string>();
  return sorted.filter((candidate) => {
    if (seen.has(candidate.questionId)) return false;
    seen.add(candidate.questionId);
    return true;
  });
}

function stratifiedDomainSelection(
  candidates: PracticeTestCandidate[],
  target: number,
  seed: string,
) {
  const strata = new Map<string, PracticeTestCandidate[]>();
  for (const candidate of candidates) {
    const key = `${candidate.difficulty}:${candidate.questionType}`;
    const values = strata.get(key) ?? [];
    values.push(candidate);
    strata.set(key, values);
  }
  for (const [key, values] of strata) {
    strata.set(
      key,
      values.sort(
        (left, right) =>
          seededRank(`${seed}:${left.questionVersionId}`) -
            seededRank(`${seed}:${right.questionVersionId}`) ||
          left.questionVersionId.localeCompare(right.questionVersionId),
      ),
    );
  }

  const keys = [...strata.keys()].sort(
    (left, right) =>
      seededRank(`${seed}:${left}`) - seededRank(`${seed}:${right}`) ||
      left.localeCompare(right),
  );
  const selected: PracticeTestCandidate[] = [];
  while (selected.length < target) {
    let added = false;
    for (const key of keys) {
      const candidate = strata.get(key)?.shift();
      if (!candidate) continue;
      selected.push(candidate);
      added = true;
      if (selected.length === target) break;
    }
    if (!added) break;
  }
  return selected;
}

function seededRank(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
