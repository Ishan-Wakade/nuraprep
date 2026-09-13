export function getAnswerChoiceDisplayLabel(index: number): string {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new Error("Answer-choice indexes must be non-negative integers.");
  }

  let remaining = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26) - 1;
  } while (remaining >= 0);

  return label;
}
