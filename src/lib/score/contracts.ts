export type ScoreEvidenceLevel = "LOW" | "DEVELOPING" | "SUBSTANTIAL";

export type ScoreDomainFeature = {
  domainTitle: string;
  blueprintWeight: number;
  estimate: number;
  lowerBound: number;
  upperBound: number;
  uniqueQuestionCount: number;
  effectiveEvidence: number;
};

export type ScoreSkillFeature = {
  skillCode: string;
  skillTitle: string;
  estimate: number;
  uniqueQuestionCount: number;
  effectiveEvidence: number;
};

export type ScoreFeatureSnapshot = {
  generatedAt: string;
  evidenceWindowDays: number;
  uniqueQuestionCount: number;
  rawAttemptCount: number;
  effectiveEvidence: number;
  completedPracticeTestCount: number;
  timed: {
    questionCount: number;
    accuracy: number | null;
    withinTargetRate: number | null;
  };
  untimed: {
    questionCount: number;
    accuracy: number | null;
  };
  domains: ScoreDomainFeature[];
  skills: ScoreSkillFeature[];
};

export type StudyPlanRecommendation = {
  skillCode: string;
  skillTitle: string;
  priority: number;
  targetMinutes: number;
  rationale: string;
};
