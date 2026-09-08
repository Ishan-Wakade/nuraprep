export function hasTrustedMutationOrigin(
  request: Pick<Request, "headers">,
  applicationUrl: string,
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(applicationUrl).origin;
  } catch {
    return false;
  }
}
