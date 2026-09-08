import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/app/sign-out-button";
import { requireReviewer } from "@/lib/auth/reviewer";

export const metadata: Metadata = {
  title: "Question review",
  robots: { index: false, follow: false },
};

export default async function ReviewLayout({
  children,
}: {
  children: ReactNode;
}) {
  const reviewer = await requireReviewer();

  return (
    <div className="min-h-screen bg-[#f3f5f2] text-[#123136]">
      <header className="border-b border-[#d8ded9] bg-[#fffdf8]">
        <div className="mx-auto flex min-h-18 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-5">
            <Link className="brand" href="/" aria-label="NuraPrep home">
              <span className="brand-mark" aria-hidden="true">
                N
              </span>
              <span>NuraPrep</span>
            </Link>
            <span className="hidden h-7 w-px bg-[#d8ded9] sm:block" />
            <span className="text-sm font-semibold text-[#486064]">
              Content review
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#5f7376]">
            <span className="hidden sm:inline">{reviewer.name}</span>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 font-bold tracking-wide text-amber-800 uppercase">
              {reviewer.mode === "development"
                ? "Local dev access"
                : "Authorized reviewer"}
            </span>
            {reviewer.mode === "authenticated" ? <SignOutButton /> : null}
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] md:grid-cols-[220px_1fr]">
        <aside className="border-b border-[#d8ded9] bg-[#eef2ee] px-5 py-4 md:min-h-[calc(100vh-73px)] md:border-r md:border-b-0 md:px-4 md:py-7">
          <nav
            aria-label="Reviewer navigation"
            className="flex flex-wrap gap-2 md:flex-col"
          >
            <Link
              href="/review"
              className="rounded-lg border border-[#cad6d1] bg-white px-4 py-3 text-sm font-semibold text-[#116b65] hover:border-[#116b65]"
            >
              Question queue
            </Link>
            <Link
              href="/review/feedback"
              className="rounded-lg border border-[#cad6d1] bg-white px-4 py-3 text-sm font-semibold text-[#116b65] hover:border-[#116b65]"
            >
              Feedback patterns
            </Link>
            <Link
              href="/review/sources"
              className="rounded-lg border border-[#cad6d1] bg-white px-4 py-3 text-sm font-semibold text-[#116b65] hover:border-[#116b65]"
            >
              Source register
            </Link>
            <Link
              href="/review/generation"
              className="rounded-lg border border-[#cad6d1] bg-white px-4 py-3 text-sm font-semibold text-[#116b65] hover:border-[#116b65]"
            >
              Generation
            </Link>
            <Link
              href="/review/validators"
              className="rounded-lg border border-[#cad6d1] bg-white px-4 py-3 text-sm font-semibold text-[#116b65] hover:border-[#116b65]"
            >
              Validator rules
            </Link>
            {reviewer.role === "ADMIN" ? (
              <Link
                href="/review/accounts"
                className="rounded-lg border border-[#cad6d1] bg-white px-4 py-3 text-sm font-semibold text-[#116b65] hover:border-[#116b65]"
              >
                Account privacy
              </Link>
            ) : null}
          </nav>
          <div className="mt-7 hidden rounded-xl border border-[#d6ddd8] bg-white/60 p-4 text-xs leading-5 text-[#5f7376] md:block">
            Development access is intentionally unavailable when{" "}
            <code>APP_ENV=production</code>.
          </div>
        </aside>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 px-5 py-7 sm:px-8 lg:px-10 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
