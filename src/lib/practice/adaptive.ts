const DAY_MS = 86_400_000;
const RECENCY_HALF_LIFE_DAYS = 45;

export const ADAPTIVE_MODEL_VERSION = "adaptive-baseline-v1";

export const DIFFICULTIES = [
  "FOUNDATIONAL",
  "DEVELOPING",
  "PROFICIENT",
  "ADVANCED",
] as const;

export type AdaptiveDifficulty = (typeof DIFFICULTIES)[number];
export type AdaptiveQuestionType =
  "SINGLE_CHOICE" | "MULTIPLE_SELECT" | "NUMERIC" | "ORDERED_RESPONSE";

export type AdaptiveAttemptEvidence = {
  questionId: string;
  skillCode: string;
  questionType: AdaptiveQuestionType;
  difficulty: AdaptiveDifficulty;
  correct: boolean;
  confidence: number | null;
  misconceptionCount: number;
  submittedAt: Date;
};

export type AdaptiveCandidate = {
  questionId: string;
  questionVersionId: string;
  skillCode: string;
  skillTitle: string;
  questionType: AdaptiveQuestionType;
  difficulty: AdaptiveDifficulty;
  estimatedSeconds: number;
};

export type AdaptivePrerequisite = {
  skillCode: string;
  prerequisiteSkillCode: string;
  strength: number;
};

export type AdaptiveSkillState = {
  skillCode: string;
  mastery: number;
  uncertainty: number;
  effectiveAttempts: number;
  attemptCount: number;
  misconceptionCount: number;
  prerequisiteGap: number;
  reviewDue: boolean;
  nextReviewAt: Date | null;
  targetDifficulty: AdaptiveDifficulty;
  lastDifficulty: AdaptiveDifficulty | null;
  priority: number;
  priorityComponents: {
    need: number;
    uncertainty: number;
    reviewDue: number;
    misconceptions: number;
    prerequisites: number;
  };
};

export type AdaptiveSelection = AdaptiveCandidate & {
  score: number;
  selectionReason: string;
  skillState: AdaptiveSkillState;
};

export function buildAdaptiveSkillStates({
  skillCodes,
  attempts,
  prerequisites,
  now = new Date(),
}: {
  skillCodes: string[];
  attempts: AdaptiveAttemptEvidence[];
  prerequisites: AdaptivePrerequisite[];
  now?: Date;
}) {
  const uniqueSkillCodes = [...new Set(skillCodes)];
  const baseStates = new Map<
    string,
    Omit<
      AdaptiveSkillState,
      "prerequisiteGap" | "priority" | "priorityComponents"
    >
  >();

  for (const skillCode of uniqueSkillCodes) {
    const skillAttempts = attempts
      .filter((attempt) => attempt.skillCode === skillCode)
      .sort(
        (left, right) =>
          right.submittedAt.getTime() - left.submittedAt.getTime(),
      );
    let alpha = 2;
    let beta = 2;
    let effectiveAttempts = 0;

    for (const attempt of skillAttempts) {
      const ageDays = Math.max(
        0,
        (now.getTime() - attempt.submittedAt.getTime()) / DAY_MS,
      );
      const recencyWeight = 0.5 ** (ageDays / RECENCY_HALF_LIFE_DAYS);
      const evidenceWeight =
        recencyWeight *
        difficultyEvidenceWeight(attempt.difficulty, attempt.correct) *
        confidenceEvidenceWeight(attempt.confidence, attempt.correct);
      effectiveAttempts += evidenceWeight;
      if (attempt.correct) alpha += evidenceWeight;
      else beta += evidenceWeight;
    }

    const mastery = alpha / (alpha + beta);
    const uncertainty = Math.min(1, 2 / Math.sqrt(alpha + beta));
    const latestAttempt = skillAttempts[0];
    const correctStreak = countRecentCorrectStreak(skillAttempts);
    const nextReviewAt = latestAttempt
      ? new Date(
          latestAttempt.submittedAt.getTime() +
            reviewIntervalDays(latestAttempt.correct, correctStreak) * DAY_MS,
        )
      : null;

    baseStates.set(skillCode, {
      skillCode,
      mastery,
      uncertainty,
      effectiveAttempts,
      attemptCount: skillAttempts.length,
      misconceptionCount: skillAttempts.reduce(
        (total, attempt) => total + attempt.misconceptionCount,
        0,
      ),
      reviewDue: !nextReviewAt || nextReviewAt <= now,
      nextReviewAt,
      targetDifficulty: targetDifficulty(mastery),
      lastDifficulty: latestAttempt?.difficulty ?? null,
    });
  }

  return new Map(
    uniqueSkillCodes.map((skillCode) => {
      const base = baseStates.get(skillCode)!;
      const prerequisiteGap = calculatePrerequisiteGap(
        skillCode,
        prerequisites,
        baseStates,
      );
      const priorityComponents = {
        need: 0.4 * (1 - base.mastery),
        uncertainty: 0.2 * base.uncertainty,
        reviewDue: base.reviewDue ? 0.15 : 0,
        misconceptions: 0.15 * Math.min(1, base.misconceptionCount / 3),
        prerequisites: 0.1 * prerequisiteGap,
      };
      const priority = Object.values(priorityComponents).reduce(
        (total, component) => total + component,
        0,
      );

      return [
        skillCode,
        { ...base, prerequisiteGap, priority, priorityComponents },
      ];
    }),
  );
}

export function selectAdaptiveQuestions({
  candidates,
  attempts,
  prerequisites,
  count,
  now = new Date(),
}: {
  candidates: AdaptiveCandidate[];
  attempts: AdaptiveAttemptEvidence[];
  prerequisites: AdaptivePrerequisite[];
  count: number;
  now?: Date;
}) {
  const states = buildAdaptiveSkillStates({
    skillCodes: [
      ...candidates.map((candidate) => candidate.skillCode),
      ...prerequisites.flatMap((edge) => [
        edge.skillCode,
        edge.prerequisiteSkillCode,
      ]),
    ],
    attempts,
    prerequisites,
    now,
  });
  const attemptedQuestionIds = new Set(
    attempts.map((attempt) => attempt.questionId),
  );
  const recentQuestionIds = new Set(
    [...attempts]
      .sort(
        (left, right) =>
          right.submittedAt.getTime() - left.submittedAt.getTime(),
      )
      .slice(0, 3)
      .map((attempt) => attempt.questionId),
  );
  const formatCounts = countFormatsBySkill(attempts);
  const scored = candidates.flatMap((candidate) => {
    const skillState = states.get(candidate.skillCode);
    if (!skillState || !isSafeDifficultyTransition(candidate, skillState)) {
      return [];
    }

    const unseenBonus = attemptedQuestionIds.has(candidate.questionId)
      ? 0
      : 0.12;
    const formatBonus = isUnderexposedFormat(candidate, formatCounts)
      ? 0.05
      : 0;
    const recentRepeatPenalty = recentQuestionIds.has(candidate.questionId)
      ? 0.45
      : 0;
    const difficultyDistance = Math.abs(
      difficultyIndex(candidate.difficulty) -
        difficultyIndex(skillState.targetDifficulty),
    );
    const difficultyPenalty = difficultyDistance * 0.08;
    const score =
      skillState.priority +
      unseenBonus +
      formatBonus -
      recentRepeatPenalty -
      difficultyPenalty;

    return [
      {
        ...candidate,
        score,
        skillState,
        selectionReason: formatSelectionReason({
          score,
          skillState,
          unseenBonus,
          formatBonus,
          recentRepeatPenalty,
          difficultyPenalty,
        }),
      },
    ];
  });

  scored.sort(
    (left, right) =>
      right.score - left.score ||
      left.questionVersionId.localeCompare(right.questionVersionId),
  );

  const selected: AdaptiveSelection[] = [];
  const perSkill = new Map<string, number>();
  const maximumPerSkill = Math.max(1, Math.ceil(count / 2));
  for (const candidate of scored) {
    if ((perSkill.get(candidate.skillCode) ?? 0) >= maximumPerSkill) continue;
    selected.push(candidate);
    perSkill.set(
      candidate.skillCode,
      (perSkill.get(candidate.skillCode) ?? 0) + 1,
    );
    if (selected.length === count) break;
  }

  if (selected.length < count) {
    for (const candidate of scored) {
      if (
        selected.some(
          (item) => item.questionVersionId === candidate.questionVersionId,
        )
      ) {
        continue;
      }
      selected.push(candidate);
      if (selected.length === count) break;
    }
  }

  return { selected, states };
}

function difficultyEvidenceWeight(
  difficulty: AdaptiveDifficulty,
  correct: boolean,
) {
  const index = difficultyIndex(difficulty);
  return correct ? 0.75 + index * 0.25 : 1.5 - index * 0.25;
}

function confidenceEvidenceWeight(confidence: number | null, correct: boolean) {
  if (confidence === null) return 1;
  return correct
    ? 0.75 + (confidence - 1) * 0.0625
    : 0.75 + (confidence - 1) * 0.125;
}

function countRecentCorrectStreak(attempts: AdaptiveAttemptEvidence[]) {
  let streak = 0;
  for (const attempt of attempts) {
    if (!attempt.correct) break;
    streak += 1;
  }
  return streak;
}

function reviewIntervalDays(latestCorrect: boolean, correctStreak: number) {
  if (!latestCorrect) return 0;
  return [1, 3, 7, 14, 30][Math.min(correctStreak - 1, 4)] ?? 1;
}

function targetDifficulty(mastery: number): AdaptiveDifficulty {
  if (mastery < 0.4) return "FOUNDATIONAL";
  if (mastery < 0.6) return "DEVELOPING";
  if (mastery < 0.78) return "PROFICIENT";
  return "ADVANCED";
}

function calculatePrerequisiteGap(
  skillCode: string,
  prerequisites: AdaptivePrerequisite[],
  states: Map<
    string,
    Omit<
      AdaptiveSkillState,
      "prerequisiteGap" | "priority" | "priorityComponents"
    >
  >,
) {
  let largestGap = 0;
  const bestPathWeight = new Map<string, number>([[skillCode, 1]]);
  const pending = prerequisites
    .filter((edge) => edge.skillCode === skillCode)
    .map((edge) => ({
      code: edge.prerequisiteSkillCode,
      weight: edge.strength / 3,
    }));

  while (pending.length) {
    const current = pending.shift()!;
    if (current.code === skillCode) continue;
    if (current.weight <= (bestPathWeight.get(current.code) ?? 0)) continue;
    bestPathWeight.set(current.code, current.weight);
    const state = states.get(current.code);
    if (state) {
      largestGap = Math.max(largestGap, (1 - state.mastery) * current.weight);
    }
    for (const edge of prerequisites.filter(
      (candidate) => candidate.skillCode === current.code,
    )) {
      pending.push({
        code: edge.prerequisiteSkillCode,
        weight: current.weight * (edge.strength / 3),
      });
    }
  }

  return largestGap;
}

function countFormatsBySkill(attempts: AdaptiveAttemptEvidence[]) {
  const counts = new Map<string, Map<AdaptiveQuestionType, number>>();
  for (const attempt of attempts) {
    const skillCounts = counts.get(attempt.skillCode) ?? new Map();
    skillCounts.set(
      attempt.questionType,
      (skillCounts.get(attempt.questionType) ?? 0) + 1,
    );
    counts.set(attempt.skillCode, skillCounts);
  }
  return counts;
}

function isUnderexposedFormat(
  candidate: AdaptiveCandidate,
  counts: Map<string, Map<AdaptiveQuestionType, number>>,
) {
  const skillCounts = counts.get(candidate.skillCode);
  if (!skillCounts) return true;
  const candidateCount = skillCounts.get(candidate.questionType) ?? 0;
  const highestCount = Math.max(0, ...skillCounts.values());
  return candidateCount < highestCount;
}

function isSafeDifficultyTransition(
  candidate: AdaptiveCandidate,
  state: AdaptiveSkillState,
) {
  return (
    !state.lastDifficulty ||
    Math.abs(
      difficultyIndex(candidate.difficulty) -
        difficultyIndex(state.lastDifficulty),
    ) <= 1
  );
}

function difficultyIndex(difficulty: AdaptiveDifficulty) {
  return DIFFICULTIES.indexOf(difficulty);
}

function formatSelectionReason({
  score,
  skillState,
  unseenBonus,
  formatBonus,
  recentRepeatPenalty,
  difficultyPenalty,
}: {
  score: number;
  skillState: AdaptiveSkillState;
  unseenBonus: number;
  formatBonus: number;
  recentRepeatPenalty: number;
  difficultyPenalty: number;
}) {
  const components = skillState.priorityComponents;
  return [
    ADAPTIVE_MODEL_VERSION,
    `adaptive score ${score.toFixed(3)}`,
    `need ${components.need.toFixed(3)}`,
    `uncertainty ${components.uncertainty.toFixed(3)}`,
    `review ${components.reviewDue.toFixed(3)}`,
    `misconceptions ${components.misconceptions.toFixed(3)}`,
    `prerequisites ${components.prerequisites.toFixed(3)}`,
    `unseen +${unseenBonus.toFixed(2)}`,
    `format +${formatBonus.toFixed(2)}`,
    `recent repeat -${recentRepeatPenalty.toFixed(2)}`,
    `difficulty fit -${difficultyPenalty.toFixed(2)}`,
    `target ${skillState.targetDifficulty.toLocaleLowerCase("en-US")}`,
  ].join("; ");
}
