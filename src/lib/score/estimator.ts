import type {
  ScoreDomainFeature,
  ScoreEvidenceLevel,
  ScoreFeatureSnapshot,
  ScoreSkillFeature,
  StudyPlanRecommendation,
} from "./contracts";

const DAY_MS = 86_400_000;
const EVIDENCE_WINDOW_DAYS = 180;
const RECENCY_HALF_LIFE_DAYS = 60;
const PRIOR_ALPHA = 2;
const PRIOR_BETA = 2;

export const SCORE_MODEL_VERSION = "score-baseline-v1";
export const STUDY_PLAN_MODEL_VERSION = "study-plan-v1";

type Difficulty = "FOUNDATIONAL" | "DEVELOPING" | "PROFICIENT" | "ADVANCED";
type PracticeMode =
  "TOPIC_PRACTICE" | "DIAGNOSTIC" | "ADAPTIVE" | "PRACTICE_TEST";

export type ScoreAttemptEvidence = {
  sessionId: string;
  questionId: string;
  domainTitle: string;
  skillCode: string;
  skillTitle: string;
  difficulty: Difficulty;
  correct: boolean;
  mode: PracticeMode;
  timingMode: "TIMED" | "UNTIMED";
  sessionCompleted: boolean;
  sessionAnsweredCount: number;
  sessionQuestionCount: number;
  elapsedMilliseconds: number;
  estimatedSeconds: number;
  submittedAt: Date;
};

export type ScoreSkillDefinition = {
  skillCode: string;
  skillTitle: string;
};

export type ScoreEstimateResult = {
  modelVersion: typeof SCORE_MODEL_VERSION;
  estimate: number;
  lowerBound: number;
  upperBound: number;
  evidenceLevel: ScoreEvidenceLevel;
  evidenceCount: number;
  effectiveEvidence: number;
  features: ScoreFeatureSnapshot;
  caveats: string[];
  studyPlan: StudyPlanRecommendation[];
};

export function estimateMathReadiness({
  attempts,
  domainDistribution,
  availableSkills = [],
  now = new Date(),
}: {
  attempts: ScoreAttemptEvidence[];
  domainDistribution: Record<string, number>;
  availableSkills?: ScoreSkillDefinition[];
  now?: Date;
}): ScoreEstimateResult {
  const scoredTotal = Object.values(domainDistribution).reduce(
    (total, count) => total + count,
    0,
  );
  if (scoredTotal <= 0) {
    throw new Error("A positive scored-domain distribution is required.");
  }

  const cutoff = now.getTime() - EVIDENCE_WINDOW_DAYS * DAY_MS;
  const eligible = attempts.filter(
    (attempt) =>
      attempt.submittedAt.getTime() >= cutoff &&
      Object.hasOwn(domainDistribution, attempt.domainTitle),
  );
  const deduplicated = keepMostRecentAttemptPerQuestion(eligible);
  const domains = Object.entries(domainDistribution).map(
    ([domainTitle, scoredQuestions]) =>
      summarizeDomain(
        domainTitle,
        scoredQuestions / scoredTotal,
        deduplicated.filter((attempt) => attempt.domainTitle === domainTitle),
        now,
      ),
  );
  const skills = summarizeSkills(deduplicated, availableSkills, now);
  const estimate = domains.reduce(
    (total, domain) => total + domain.blueprintWeight * domain.estimate,
    0,
  );
  const standardDeviation = Math.sqrt(
    domains.reduce(
      (variance, domain) =>
        variance +
        domain.blueprintWeight ** 2 * betaVariance(domain.alpha, domain.beta),
      0,
    ),
  );
  const lowerBound = clamp01(estimate - 1.96 * standardDeviation);
  const upperBound = clamp01(estimate + 1.96 * standardDeviation);
  const effectiveEvidence = domains.reduce(
    (total, domain) => total + domain.effectiveEvidence,
    0,
  );
  const completedPracticeTestCount = new Set(
    deduplicated
      .filter(
        (attempt) =>
          attempt.mode === "PRACTICE_TEST" &&
          attempt.sessionCompleted &&
          attempt.sessionAnsweredCount >= attempt.sessionQuestionCount * 0.8,
      )
      .map((attempt) => attempt.sessionId),
  ).size;
  const timed = deduplicated.filter(
    (attempt) => attempt.timingMode === "TIMED",
  );
  const untimed = deduplicated.filter(
    (attempt) => attempt.timingMode === "UNTIMED",
  );
  const evidenceLevel = classifyEvidence({
    effectiveEvidence,
    uniqueQuestionCount: deduplicated.length,
    completedPracticeTestCount,
  });
  const caveats = buildCaveats({
    evidenceLevel,
    timedCount: timed.length,
    domainFeatures: domains,
  });

  const domainFeatures: ScoreDomainFeature[] = domains.map((domain) => ({
    domainTitle: domain.domainTitle,
    blueprintWeight: domain.blueprintWeight,
    estimate: domain.estimate,
    lowerBound: domain.lowerBound,
    upperBound: domain.upperBound,
    uniqueQuestionCount: domain.uniqueQuestionCount,
    effectiveEvidence: domain.effectiveEvidence,
  }));
  const features: ScoreFeatureSnapshot = {
    generatedAt: now.toISOString(),
    evidenceWindowDays: EVIDENCE_WINDOW_DAYS,
    uniqueQuestionCount: deduplicated.length,
    rawAttemptCount: eligible.length,
    effectiveEvidence,
    completedPracticeTestCount,
    timed: {
      questionCount: timed.length,
      accuracy: accuracy(timed),
      withinTargetRate: timed.length
        ? timed.filter(
            (attempt) =>
              attempt.elapsedMilliseconds <= attempt.estimatedSeconds * 1_000,
          ).length / timed.length
        : null,
    },
    untimed: {
      questionCount: untimed.length,
      accuracy: accuracy(untimed),
    },
    domains: domainFeatures,
    skills,
  };

  return {
    modelVersion: SCORE_MODEL_VERSION,
    estimate,
    lowerBound,
    upperBound,
    evidenceLevel,
    evidenceCount: deduplicated.length,
    effectiveEvidence,
    features,
    caveats,
    studyPlan: buildStudyPlan(skills),
  };
}

function keepMostRecentAttemptPerQuestion(attempts: ScoreAttemptEvidence[]) {
  const sorted = [...attempts].sort(
    (left, right) =>
      right.submittedAt.getTime() - left.submittedAt.getTime() ||
      left.questionId.localeCompare(right.questionId),
  );
  const seen = new Set<string>();
  return sorted.filter((attempt) => {
    if (seen.has(attempt.questionId)) return false;
    seen.add(attempt.questionId);
    return true;
  });
}

function summarizeDomain(
  domainTitle: string,
  blueprintWeight: number,
  attempts: ScoreAttemptEvidence[],
  now: Date,
) {
  let alpha = PRIOR_ALPHA;
  let beta = PRIOR_BETA;
  let effectiveEvidence = 0;
  for (const attempt of attempts) {
    const weight = evidenceWeight(attempt, now);
    const normalizedOutcome = difficultyNormalizedOutcome(attempt);
    alpha += weight * normalizedOutcome;
    beta += weight * (1 - normalizedOutcome);
    effectiveEvidence += weight;
  }
  const estimate = alpha / (alpha + beta);
  const standardDeviation = Math.sqrt(betaVariance(alpha, beta));
  return {
    domainTitle,
    blueprintWeight,
    estimate,
    lowerBound: clamp01(estimate - 1.96 * standardDeviation),
    upperBound: clamp01(estimate + 1.96 * standardDeviation),
    uniqueQuestionCount: attempts.length,
    effectiveEvidence,
    alpha,
    beta,
  };
}

function summarizeSkills(
  attempts: ScoreAttemptEvidence[],
  availableSkills: ScoreSkillDefinition[],
  now: Date,
) {
  const grouped = new Map<string, ScoreAttemptEvidence[]>();
  for (const skill of availableSkills) grouped.set(skill.skillCode, []);
  for (const attempt of attempts) {
    const values = grouped.get(attempt.skillCode) ?? [];
    values.push(attempt);
    grouped.set(attempt.skillCode, values);
  }

  const skills: ScoreSkillFeature[] = [];
  const titles = new Map(
    availableSkills.map((skill) => [skill.skillCode, skill.skillTitle]),
  );
  for (const [skillCode, skillAttempts] of grouped) {
    let alpha = PRIOR_ALPHA;
    let beta = PRIOR_BETA;
    let effectiveEvidence = 0;
    for (const attempt of skillAttempts) {
      const weight = evidenceWeight(attempt, now);
      const outcome = difficultyNormalizedOutcome(attempt);
      alpha += weight * outcome;
      beta += weight * (1 - outcome);
      effectiveEvidence += weight;
    }
    skills.push({
      skillCode,
      skillTitle:
        skillAttempts[0]?.skillTitle ?? titles.get(skillCode) ?? skillCode,
      estimate: alpha / (alpha + beta),
      uniqueQuestionCount: skillAttempts.length,
      effectiveEvidence,
    });
  }
  return skills.sort(
    (left, right) =>
      left.estimate - right.estimate ||
      right.effectiveEvidence - left.effectiveEvidence ||
      left.skillCode.localeCompare(right.skillCode),
  );
}

function evidenceWeight(attempt: ScoreAttemptEvidence, now: Date) {
  const ageDays = Math.max(
    0,
    (now.getTime() - attempt.submittedAt.getTime()) / DAY_MS,
  );
  const recency = 0.5 ** (ageDays / RECENCY_HALF_LIFE_DAYS);
  const mode =
    attempt.mode === "PRACTICE_TEST"
      ? attempt.sessionCompleted &&
        attempt.sessionAnsweredCount >= attempt.sessionQuestionCount * 0.8
        ? 1
        : 0.7
      : attempt.mode === "DIAGNOSTIC"
        ? 0.8
        : attempt.mode === "ADAPTIVE"
          ? 0.65
          : 0.55;
  return recency * mode;
}

function difficultyNormalizedOutcome(attempt: ScoreAttemptEvidence) {
  const offset = {
    FOUNDATIONAL: -0.12,
    DEVELOPING: -0.04,
    PROFICIENT: 0.04,
    ADVANCED: 0.12,
  }[attempt.difficulty];
  return clamp01((attempt.correct ? 1 : 0) + offset);
}

function classifyEvidence({
  effectiveEvidence,
  uniqueQuestionCount,
  completedPracticeTestCount,
}: {
  effectiveEvidence: number;
  uniqueQuestionCount: number;
  completedPracticeTestCount: number;
}): ScoreEvidenceLevel {
  if (
    completedPracticeTestCount >= 1 &&
    uniqueQuestionCount >= 30 &&
    effectiveEvidence >= 20
  ) {
    return "SUBSTANTIAL";
  }
  if (uniqueQuestionCount >= 10 && effectiveEvidence >= 6) {
    return "DEVELOPING";
  }
  return "LOW";
}

function buildCaveats({
  evidenceLevel,
  timedCount,
  domainFeatures,
}: {
  evidenceLevel: ScoreEvidenceLevel;
  timedCount: number;
  domainFeatures: Array<{ domainTitle: string; uniqueQuestionCount: number }>;
}) {
  const caveats = [
    "This is a NuraPrep readiness estimate, not an official ATI score or score conversion.",
    "The baseline has not yet been calibrated against consented learner ATI outcomes.",
  ];
  if (evidenceLevel === "LOW") {
    caveats.push(
      "The evidence is sparse, so the interval is intentionally wide and the point estimate may move substantially.",
    );
  }
  if (timedCount === 0) {
    caveats.push(
      "No timed answers are available; current pacing under test conditions is unknown.",
    );
  }
  for (const domain of domainFeatures) {
    if (domain.uniqueQuestionCount < 5) {
      caveats.push(
        `${domain.domainTitle} has fewer than five unique questions of evidence.`,
      );
    }
  }
  return caveats;
}

function buildStudyPlan(skills: ScoreSkillFeature[]) {
  return skills.slice(0, 3).map((skill, index) => ({
    skillCode: skill.skillCode,
    skillTitle: skill.skillTitle,
    priority: index + 1,
    targetMinutes: [90, 60, 30][index] ?? 30,
    rationale:
      skill.uniqueQuestionCount < 3
        ? `Collect more evidence: only ${skill.uniqueQuestionCount} unique question${skill.uniqueQuestionCount === 1 ? "" : "s"} currently inform this skill.`
        : `Current internal estimate is ${Math.round(skill.estimate * 100)}% from ${skill.uniqueQuestionCount} unique questions; prioritize reviewed practice and revisit misconceptions.`,
  }));
}

function accuracy(attempts: ScoreAttemptEvidence[]) {
  return attempts.length
    ? attempts.filter((attempt) => attempt.correct).length / attempts.length
    : null;
}

function betaVariance(alpha: number, beta: number) {
  return (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
