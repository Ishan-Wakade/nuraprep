import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/app/sign-out-button";
import { buildLearnerDataExport } from "@/data/account";
import { getBillingOverview, type BillingOverview } from "@/data/billing";
import { requireLearner } from "@/lib/auth/learner";
import { getCurrentSession } from "@/lib/auth/session";
import { getServerEnvironment } from "@/lib/env/server";

import { AccountDeletionForm } from "./account-deletion-form";
import { SessionControls } from "./session-controls";

export const metadata: Metadata = {
  title: "Account and data",
  robots: { index: false, follow: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkout?: string | string[];
    billing?: string | string[];
  }>;
}) {
  const identity = await requireLearner();
  const environment = getServerEnvironment();
  const [data, currentSession, billing, params] = await Promise.all([
    buildLearnerDataExport(identity),
    getCurrentSession(),
    getBillingOverview(identity.authUserId, environment),
    searchParams,
  ]);
  const attemptCount = data.practiceItems.filter(
    (item) => item.attemptId !== null,
  ).length;
  const currentSessionId = currentSession?.session.id ?? null;
  const otherSessionCount = data.accountSessions.filter(
    (session) => session.id !== currentSessionId,
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

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14"
      >
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

        <BillingSection
          billing={billing}
          authenticated={identity.mode === "authenticated"}
          checkoutResult={
            typeof params.checkout === "string" ? params.checkout : undefined
          }
          billingError={
            typeof params.billing === "string" ? params.billing : undefined
          }
        />

        {identity.mode === "authenticated" ? (
          <section className="mt-6 rounded-2xl border border-[#d5ddd7] bg-[#fffdf8] p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
                  Session security
                </p>
                <h2 className="mt-2 font-serif text-2xl">Signed-in devices</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#587073]">
                  Review active sessions and revoke every session except this
                  one if you no longer recognize a device.
                </p>
              </div>
              <span className="rounded-full bg-[#e0eee9] px-3 py-1 text-xs font-bold text-[#116b65]">
                {data.accountSessions.length} active
              </span>
            </div>

            <ul className="mt-5 grid gap-3" aria-label="Active sessions">
              {data.accountSessions.map((session) => {
                const isCurrent = session.id === currentSessionId;
                return (
                  <li
                    key={session.id}
                    className="rounded-xl border border-[#dde3df] bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#29494c]">
                        {summarizeDevice(session.userAgent)}
                      </p>
                      {isCurrent ? (
                        <span className="rounded-full bg-[#116b65] px-2.5 py-1 text-[11px] font-bold text-white">
                          Current session
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#52676a]">
                      Started {formatSessionDate(session.createdAt)} · Last
                      active {formatSessionDate(session.updatedAt)}
                      {session.ipAddress ? ` · IP ${session.ipAddress}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>

            <SessionControls otherSessionCount={otherSessionCount} />
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-[#e0c9a6] bg-[#fff8e9] p-6">
          <h2 className="font-serif text-2xl">Account deletion</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#665b49]">
            This permanently removes your profile, credentials, active sessions,
            practice history, answers, reports, tutor activity, score estimates,
            and study plans. Learner-authored evidence is also removed from
            reviewer improvement records. A non-identifying receipt retains only
            record counts and the completion time.
          </p>
          {identity.mode === "authenticated" ? (
            <AccountDeletionForm />
          ) : (
            <p className="mt-4 text-xs font-bold text-[#7d6849]">
              Local development identities do not create an account to delete.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function BillingSection({
  billing,
  authenticated,
  checkoutResult,
  billingError,
}: {
  billing: BillingOverview;
  authenticated: boolean;
  checkoutResult?: string;
  billingError?: string;
}) {
  const status = billing.subscriptionStatus
    ? billing.subscriptionStatus.toLowerCase().replaceAll("_", " ")
    : null;

  return (
    <section className="mt-6 rounded-2xl border border-[#d5ddd7] bg-[#fffdf8] p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-[#116b65] uppercase">
            Plan and billing
          </p>
          <h2 className="mt-2 font-serif text-2xl">
            {billing.plan === "PREMIUM_MATH" ? "Premium Math" : "Free plan"}
          </h2>
        </div>
        <span className="rounded-full bg-[#e0eee9] px-3 py-1 text-xs font-bold text-[#116b65]">
          {billing.plan === "PREMIUM_MATH" ? "Premium" : "Free"}
        </span>
      </div>

      {checkoutResult === "success" ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-[#b9d9cd] bg-[#e8f2ee] p-3 text-sm font-semibold text-[#116b65]"
        >
          Checkout finished. Access updates after the signed Stripe event is
          processed, which can take a few seconds.
        </p>
      ) : null}
      {checkoutResult === "canceled" ? (
        <p role="status" className="mt-4 text-sm text-[#587073]">
          Checkout was canceled. No plan change was made.
        </p>
      ) : null}
      {billingError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[#e4c4be] bg-[#fff1ef] p-3 text-sm font-semibold text-[#9a3f35]"
        >
          {billingError === "portal_unavailable"
            ? "Billing management is temporarily unavailable. Please try again."
            : "Secure checkout could not be started. Please try again."}
        </p>
      ) : null}

      {!billing.enabled ? (
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#587073]">
          Payments are not activated in this environment. NuraPrep remains on
          the free plan, and no payment method is requested or stored.
        </p>
      ) : !authenticated ? (
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#587073]">
          Sign in with an account before starting or managing a subscription.
          Local development identities cannot enter billing flows.
        </p>
      ) : (
        <>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#587073]">
            {status
              ? `Stripe reports this subscription as ${status}.`
              : "No paid subscription is connected to this account."}
            {billing.cancelAtPeriodEnd && billing.currentPeriodEnd
              ? ` Access is scheduled to end on ${billing.currentPeriodEnd.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}.`
              : ""}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {billing.canStartCheckout ? (
              <form action="/api/billing/checkout" method="post">
                <button
                  type="submit"
                  className="min-h-11 rounded-xl bg-[#116b65] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0d5753]"
                >
                  Start secure checkout
                </button>
              </form>
            ) : null}
            {billing.canManageBilling ? (
              <form action="/api/billing/portal" method="post">
                <button
                  type="submit"
                  className="min-h-11 rounded-xl border border-[#aebdb6] bg-white px-4 py-2.5 text-sm font-bold text-[#15383a] transition hover:border-[#116b65]"
                >
                  Manage billing
                </button>
              </form>
            ) : null}
          </div>
          <p className="mt-3 text-xs leading-5 text-[#66777a]">
            Checkout and subscription management are hosted by Stripe. NuraPrep
            stores subscription status and identifiers, never raw card details.
          </p>
        </>
      )}
    </section>
  );
}

function summarizeDevice(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  if (/iPhone/i.test(userAgent)) return "iPhone browser";
  if (/iPad/i.test(userAgent)) return "iPad browser";
  if (/Android/i.test(userAgent)) return "Android browser";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "Mac browser";
  if (/Windows/i.test(userAgent)) return "Windows browser";
  if (/Linux/i.test(userAgent)) return "Linux browser";
  return "Web browser";
}

function formatSessionDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#d5ddd7] bg-[#fffdf8] p-5 shadow-sm">
      <p className="text-3xl font-bold text-[#116b65]">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#52676a]">{label}</p>
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-[#52676a] uppercase">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-[#29494c]">{value}</dd>
    </div>
  );
}
