import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";
import { sanitizeReturnTo } from "@/lib/auth/return-to";
import { getServerEnvironment } from "@/lib/env/server";

import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string | string[];
    deleted?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const requestedReturnTo =
    typeof params.returnTo === "string" ? params.returnTo : undefined;
  const returnTo = sanitizeReturnTo(requestedReturnTo);
  const [session, environment] = await Promise.all([
    getCurrentSession(),
    Promise.resolve(getServerEnvironment()),
  ]);

  if (session?.user) redirect(returnTo);

  const googleConfigured = Boolean(
    environment.GOOGLE_CLIENT_ID && environment.GOOGLE_CLIENT_SECRET,
  );
  const developmentAccess =
    environment.APP_ENV !== "production" &&
    (returnTo.startsWith("/review")
      ? environment.DEV_REVIEWER_ENABLED
      : environment.DEV_LEARNER_ENABLED);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="grid min-h-screen bg-[#f4f1e9] px-5 py-10 text-[#15383a] sm:place-items-center sm:px-8"
    >
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-bold tracking-tight"
        >
          <span className="grid h-9 w-9 place-items-center rounded-[11px_11px_11px_3px] bg-[#116b65] font-serif text-xl text-white italic">
            N
          </span>
          NuraPrep
        </Link>

        <section className="mt-8 rounded-3xl border border-[#d5ddd7] bg-[#fffdf8] p-6 shadow-[0_18px_55px_rgba(24,56,56,0.09)] sm:p-8">
          {params.deleted === "1" ? (
            <p
              role="status"
              className="mb-5 rounded-xl border border-[#b9d9cd] bg-[#e8f2ee] p-3 text-sm font-semibold text-[#116b65]"
            >
              Your account and learner history were permanently deleted.
            </p>
          ) : null}
          <p className="text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
            Your Math workspace
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-[-0.035em]">
            Welcome to NuraPrep.
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#587073]">
            Sign in to keep diagnostic results, practice history, adaptive
            priorities, and study plans connected to one account.
          </p>

          <div className="mt-7">
            {googleConfigured ? (
              <GoogleSignInButton returnTo={returnTo} />
            ) : (
              <div className="rounded-xl border border-[#d8ddd7] bg-[#f5f3ed] p-4">
                <p className="text-sm font-bold text-[#314f52]">
                  Google sign-in is not configured yet
                </p>
                <p className="mt-1 text-xs leading-5 text-[#52676a]">
                  The secure account foundation is installed, but this
                  environment has no Google OAuth credentials. No simulated
                  Google login is shown.
                </p>
              </div>
            )}
          </div>

          {developmentAccess ? (
            <div className="mt-5 border-t border-[#dce1dc] pt-5">
              <Link
                href={returnTo}
                className="flex min-h-11 items-center justify-center rounded-xl border border-[#a9c7bf] bg-[#e8f2ee] px-4 py-2.5 text-sm font-bold text-[#116b65] transition hover:border-[#6b9d91]"
              >
                Continue with local development access
              </Link>
              <p className="mt-2 text-center text-[11px] leading-4 text-[#52676a]">
                This bypass is unavailable when the application runs in
                production.
              </p>
            </div>
          ) : null}

          <p className="mt-6 text-xs leading-5 text-[#52676a]">
            NuraPrep is an independent study tool and is not affiliated with or
            endorsed by ATI. Readiness estimates are not official ATI scores.
          </p>
        </section>
      </div>
    </main>
  );
}
