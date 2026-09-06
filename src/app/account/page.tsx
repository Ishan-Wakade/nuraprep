import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/app/sign-out-button";
import { buildLearnerDataExport } from "@/data/account";
import { requireLearner } from "@/lib/auth/learner";

export const metadata: Metadata = {
  title: "Account and data",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const identity = await requireLearner();
  const data = await buildLearnerDataExport(identity);
  const attemptCount = data.practiceItems.filter(
    (item) => item.attemptId !== null,
  ).length;

  return (
    <div className="min-h-screen bg-[#f4f1e9] text-[#15383a]">
      <header className="border-b border-[#d7ddd7] bg-[#fffdf8]">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-bold tracking-tight"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[10px_10px_10px_3px] bg-[#116b65] font-serif text-lg text-white italic">
              N
            </span>
            NuraPrep
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/practice" className="font-bold text-[#116b65]">
              Practice home
            </Link>
            {identity.mode === "authenticated" ? <SignOutButton /> : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
          Account and privacy
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-[-0.035em] sm:text-5xl">
          Your NuraPrep data
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#587073]">
          Review what is connected to this account and download a portable copy
          without credentials, provider tokens, session tokens, answer keys, or
          private reviewer notes.
        </p>

        <section
          className="mt-8 grid gap-4 sm:grid-cols-3"
          aria-label="Account summary"
        >
          <SummaryCard
            label="Practice sessions"
            value={data.practiceSessions.length}
          />
          <SummaryCard label="Recorded answers" value={attemptCount} />
          <SummaryCard
            label="Question reports"
            value={data.questionReports.length}
          />
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-[#d5ddd7] bg-[#fffdf8] p-6 shadow-sm">
            <h2 className="font-serif text-2xl">Profile</h2>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <DataPoint label="Name" value={identity.displayName} />
              <DataPoint
                label="Email"
                value={identity.email ?? "Not stored for local access"}
              />
              <DataPoint
                label="Access mode"
                value={
                  identity.mode === "authenticated"
                    ? "Database-backed account"
                    : "Local development identity"
                }
              />
              <DataPoint
                label="Active sessions"
                value={String(data.accountSessions.length)}
              />
            </dl>
          </section>

          <section className="rounded-2xl bg-[#15383a] p-6 text-white shadow-sm">
            <p className="text-xs font-bold tracking-[0.12em] text-[#acd7cc] uppercase">
              Portable export
            </p>
            <h2 className="mt-2 font-serif text-2xl">Download your history</h2>
            <p className="mt-3 text-xs leading-5 text-[#d3e4df]">
              Authenticated accounts must have signed in within the last 15
              minutes. The server rebuilds and scopes the file when you request
              it.
            </p>
            <a
              href="/api/account/export"
              download
              className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-[#f3c66d] px-4 py-2.5 text-sm font-bold text-[#15383a] transition hover:bg-[#f7d58f]"
            >
              Download JSON export
            </a>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-[#e0c9a6] bg-[#fff8e9] p-6">
          <h2 className="font-serif text-2xl">Account deletion</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#665b49]">
            Deletion is not exposed yet. NuraPrep will not offer a button until
            session revocation, learner-owned records, audit retention, and
            rollback behavior are covered by one verified transaction. This is
            intentionally an honest disabled state, not a nonfunctional control.
          </p>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#d5ddd7] bg-[#fffdf8] p-5 shadow-sm">
      <p className="text-3xl font-bold text-[#116b65]">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#66797b]">{label}</p>
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-[#6c7d7f] uppercase">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-[#29494c]">{value}</dd>
    </div>
  );
}
