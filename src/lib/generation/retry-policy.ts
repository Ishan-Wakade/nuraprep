export const MAX_GENERATION_ATTEMPTS = 3;

export function canClaimGenerationAttempt(attemptCount: number) {
  return (
    Number.isSafeInteger(attemptCount) &&
    attemptCount >= 0 &&
    attemptCount < MAX_GENERATION_ATTEMPTS
  );
}

export function hasExhaustedGenerationAttempts(attemptCount: number) {
  return (
    Number.isSafeInteger(attemptCount) &&
    attemptCount >= MAX_GENERATION_ATTEMPTS
  );
}
