export type DiagnosticSkillEvidence = {
  skillCode: string;
  skillTitle: string;
  answered: number;
  correct: number;
  averageConfidence: number | null;
  elapsedMilliseconds: number;
};

export type DiagnosticSignal = DiagnosticSkillEvidence & {
  signal: "START_HERE" | "REINFORCE" | "BUILD_ON" | "INCOMPLETE";
  explanation: string;
};

export function summarizeDiagnostic(evidence: DiagnosticSkillEvidence[]) {
  const signals = evidence.map(classifySignal).sort(compareSignals);
  const firstPriority = signals.find(
    (signal) => signal.signal === "START_HERE",
  );
  const firstReinforcement = signals.find(
    (signal) => signal.signal === "REINFORCE",
  );
  const startingCandidate =
    firstPriority ??
    firstReinforcement ??
    signals.find((signal) => signal.signal === "BUILD_ON") ??
    null;
  const startingPoint =
    startingCandidate?.signal === "BUILD_ON"
      ? {
          ...startingCandidate,
          explanation:
            "No sampled weakness stood out. Begin here to broaden the evidence; this item took the most time or carried the lowest reported confidence among the encouraging signals.",
        }
      : startingCandidate;

  return {
    signals,
    startingPoint,
    completedSkillCount: signals.filter(
      (signal) => signal.signal !== "INCOMPLETE",
    ).length,
  };
}

function classifySignal(evidence: DiagnosticSkillEvidence): DiagnosticSignal {
  if (evidence.answered === 0) {
    return {
      ...evidence,
      signal: "INCOMPLETE",
      explanation: "No answer was saved, so this skill has no signal yet.",
    };
  }

  if (evidence.correct / evidence.answered < 0.5) {
    return {
      ...evidence,
      signal: "START_HERE",
      explanation:
        "The sampled item was missed. Treat this as a starting hypothesis and confirm it with focused practice.",
    };
  }

  if (evidence.averageConfidence !== null && evidence.averageConfidence <= 2) {
    return {
      ...evidence,
      signal: "REINFORCE",
      explanation:
        "The answer was correct with low confidence, so a short reinforcement set is appropriate.",
    };
  }

  return {
    ...evidence,
    signal: "BUILD_ON",
    explanation:
      "The sampled item was correct. This is encouraging evidence, not proof of mastery.",
  };
}

const signalPriority: Record<DiagnosticSignal["signal"], number> = {
  START_HERE: 0,
  REINFORCE: 1,
  INCOMPLETE: 2,
  BUILD_ON: 3,
};

function compareSignals(left: DiagnosticSignal, right: DiagnosticSignal) {
  const priorityDifference =
    signalPriority[left.signal] - signalPriority[right.signal];
  if (priorityDifference) return priorityDifference;

  const leftConfidence = left.averageConfidence ?? 3;
  const rightConfidence = right.averageConfidence ?? 3;
  if (leftConfidence !== rightConfidence) {
    return leftConfidence - rightConfidence;
  }

  if (left.elapsedMilliseconds !== right.elapsedMilliseconds) {
    return right.elapsedMilliseconds - left.elapsedMilliseconds;
  }

  return left.skillTitle.localeCompare(right.skillTitle);
}
