import type { QuestionStimulus } from "./contracts";

export type OriginalityDocument = {
  id: string;
  prompt: string;
  stimulus?: QuestionStimulus | null;
  choices?: { content: string }[] | null;
};

export type SimilaritySignal = {
  comparedWithId: string;
  exactTextMatch: boolean;
  numberInvariantMatch: boolean;
  fiveGramContainment: number;
  blocking: boolean;
  reason:
    "EXACT_TEXT" | "NUMBERS_ONLY_VARIATION" | "HIGH_PHRASE_OVERLAP" | null;
};

const minimumTokensForBlocking = 8;
const phraseOverlapThreshold = 0.55;

export function findInternalSimilaritySignals(
  candidate: OriginalityDocument,
  corpus: OriginalityDocument[],
) {
  const candidateTokens = tokenize(documentText(candidate));
  const candidateNormalized = candidateTokens.join(" ");
  const candidateNumberInvariant = numberInvariant(candidateTokens).join(" ");
  const candidateNgrams = ngrams(candidateTokens, 5);

  return corpus
    .map((comparison): SimilaritySignal => {
      const comparisonTokens = tokenize(documentText(comparison));
      const exactTextMatch =
        candidateNormalized.length > 0 &&
        candidateNormalized === comparisonTokens.join(" ");
      const numberInvariantMatch =
        candidateTokens.length >= minimumTokensForBlocking &&
        candidateNumberInvariant ===
          numberInvariant(comparisonTokens).join(" ") &&
        !exactTextMatch;
      const fiveGramContainment = containment(
        candidateNgrams,
        ngrams(comparisonTokens, 5),
      );
      const reason = exactTextMatch
        ? "EXACT_TEXT"
        : numberInvariantMatch
          ? "NUMBERS_ONLY_VARIATION"
          : candidateTokens.length >= minimumTokensForBlocking &&
              comparisonTokens.length >= minimumTokensForBlocking &&
              fiveGramContainment >= phraseOverlapThreshold
            ? "HIGH_PHRASE_OVERLAP"
            : null;
      return {
        comparedWithId: comparison.id,
        exactTextMatch,
        numberInvariantMatch,
        fiveGramContainment,
        blocking: reason !== null,
        reason,
      };
    })
    .filter((signal) => signal.blocking || signal.fiveGramContainment >= 0.5)
    .sort(
      (left, right) =>
        Number(right.blocking) - Number(left.blocking) ||
        right.fiveGramContainment - left.fiveGramContainment,
    )
    .slice(0, 10);
}

function documentText(document: OriginalityDocument) {
  return [
    document.prompt,
    stimulusText(document.stimulus),
    ...(document.choices?.map((choice) => choice.content) ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function stimulusText(stimulus: QuestionStimulus | null | undefined) {
  if (!stimulus) return "";
  if (stimulus.type === "table") {
    return [
      stimulus.caption,
      ...stimulus.columns,
      ...stimulus.rows.flat(),
    ].join(" ");
  }
  return [
    stimulus.accessibleDescription,
    stimulus.data.title,
    stimulus.data.xAxisLabel,
    stimulus.data.yAxisLabel,
    ...stimulus.data.bars.flatMap((bar) => [bar.label, String(bar.value)]),
  ].join(" ");
}

function tokenize(value: string) {
  return (
    value
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .match(/[\p{L}\p{N}]+(?:[./'-][\p{L}\p{N}]+)*/gu) ?? []
  );
}

function numberInvariant(tokens: string[]) {
  return tokens.map((token) => (/\d/u.test(token) ? "#" : token));
}

function ngrams(tokens: string[], size: number) {
  const values = new Set<string>();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    values.add(tokens.slice(index, index + size).join(" "));
  }
  return values;
}

function containment(left: Set<string>, right: Set<string>) {
  const denominator = Math.min(left.size, right.size);
  if (denominator === 0) return 0;
  let matches = 0;
  for (const value of left) {
    if (right.has(value)) matches += 1;
  }
  return matches / denominator;
}
