export const FRESH_SESSION_WINDOW_MILLISECONDS = 15 * 60 * 1_000;

export function isFreshSession(createdAt: Date, now = new Date()): boolean {
  const age = now.getTime() - createdAt.getTime();
  return age >= 0 && age <= FRESH_SESSION_WINDOW_MILLISECONDS;
}
