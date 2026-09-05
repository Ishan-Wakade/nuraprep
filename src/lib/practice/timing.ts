export function getSessionTimerSeconds({
  startedAtMilliseconds,
  timeLimitSeconds,
  nowMilliseconds,
}: {
  startedAtMilliseconds: number;
  timeLimitSeconds: number | null;
  nowMilliseconds: number;
}) {
  if (timeLimitSeconds === null) {
    return Math.max(
      0,
      Math.floor((nowMilliseconds - startedAtMilliseconds) / 1_000),
    );
  }

  return Math.max(
    0,
    Math.ceil(
      (startedAtMilliseconds + timeLimitSeconds * 1_000 - nowMilliseconds) /
        1_000,
    ),
  );
}
