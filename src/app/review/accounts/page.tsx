import type { Metadata } from "next";

import { listPrivilegedAccounts } from "@/data/account-administration";
import { requireAdmin } from "@/lib/auth/reviewer";

import { AssistedErasureForm } from "./assisted-erasure-form";

export const metadata: Metadata = {
  title: "Account privacy",
};

export default async function AccountPrivacyPage() {
  const [admin, accounts] = await Promise.all([
    requireAdmin(),
    listPrivilegedAccounts(),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-bold tracking-[0.14em] text-[#116b65] uppercase">
        Administrator only
      </p>
      <h1 className="mt-2 font-serif text-4xl tracking-[-0.03em]">
        Privileged-account privacy
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5b7073]">
        Fulfill a verified erasure request without destroying the provenance of
        question review and publication decisions. This removes identity,
        credentials, sessions, billing linkage, and learner history; revokes
        every active role; and leaves only a disabled pseudonymous account
        tombstone connected to immutable content records.
      </p>

      <aside className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <strong>Irreversible control.</strong> Confirm the request outside this
        form, use a second administrator, and never paste identity documents or
        other unnecessary personal data into the reason. Pseudonymized audit
        records are intentionally retained; this is not full anonymization.
      </aside>

      <section className="mt-7 grid gap-4" aria-label="Privileged accounts">
        {accounts.map((account) => {
          const isCurrent = account.id === admin.id;
          return (
            <article
              key={account.id}
              className="rounded-2xl border border-[#d8ded9] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl">{account.name}</h2>
                  <p className="mt-1 text-sm text-[#52676a]">{account.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {account.roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full bg-[#e0eee9] px-2.5 py-1 text-[11px] font-bold text-[#116b65]"
                    >
                      {role}
                      {account.activeRoles.includes(role)
                        ? " · active"
                        : " · revoked"}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs text-[#66777a]">
                Created {account.createdAt.toLocaleDateString("en-US")} ·{" "}
                {account.isPseudonymized
                  ? "Pseudonymous tombstone"
                  : "Identifiable account"}
              </p>
              {account.isPseudonymized ? (
                <p className="mt-4 text-xs font-bold text-[#52676a]">
                  Already pseudonymized; no credentials or active role should
                  remain.
                </p>
              ) : isCurrent ? (
                <p className="mt-4 text-xs font-bold text-[#9b3d32]">
                  You cannot use this control on your own administrator account.
                </p>
              ) : (
                <AssistedErasureForm
                  targetUserId={account.id}
                  targetEmail={account.email}
                />
              )}
            </article>
          );
        })}
        {accounts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#bdcbc5] bg-white/60 p-8 text-center text-sm text-[#5b7073]">
            No privileged account history exists.
          </p>
        ) : null}
      </section>
    </div>
  );
}
