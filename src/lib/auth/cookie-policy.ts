import type { ServerEnvironment } from "@/lib/env/validation";

export function getAuthCookiePolicy(
  environment: Pick<ServerEnvironment, "APP_ENV">,
) {
  return {
    useSecureCookies: environment.APP_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}
