"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDatabase, getDatabasePool } from "@/db/client";
import { accountAuditEvents, authRoleGrants, authSessions } from "@/db/schema";
import { deleteStripeCustomerForAccountErasure } from "@/data/billing";
import { isFreshSession } from "@/lib/auth/fresh-session";
import { getCurrentSession } from "@/lib/auth/session";
import { getStripeClient } from "@/lib/billing/stripe";
import { getServerEnvironment } from "@/lib/env/server";

export type AccountActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function revokeOtherSessions(
  _previousState: AccountActionState,
  _formData: FormData,
): Promise<AccountActionState> {
  void _previousState;
  void _formData;

  const current = await getCurrentSession();
  if (!current) {
    return {
      status: "error",
      message: "Your session is no longer active. Sign in again to continue.",
    };
  }

  const database = getDatabase();
  const revokedCount = await database.transaction(async (transaction) => {
    const revoked = await transaction
      .delete(authSessions)
      .where(
        and(
          eq(authSessions.userId, current.user.id),
          ne(authSessions.id, current.session.id),
        ),
      )
      .returning({ id: authSessions.id });

    await transaction.insert(accountAuditEvents).values({
      userId: current.user.id,
      eventType: "OTHER_SESSIONS_REVOKED",
      actorId: current.user.id,
      metadata: { revokedCount: revoked.length },
    });

    return revoked.length;
  });

  revalidatePath("/account");
  return {
    status: "success",
    message:
      revokedCount === 0
        ? "No other active sessions were found."
        : `${revokedCount} other ${revokedCount === 1 ? "session" : "sessions"} signed out.`,
  };
}

export async function deleteAccount(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  void _previousState;

  if (formData.get("confirmation") !== "DELETE") {
    return {
      status: "error",
      message: 'Type "DELETE" exactly to confirm permanent account erasure.',
    };
  }

  const current = await getCurrentSession();
  if (!current || !isFreshSession(current.session.createdAt)) {
    return {
      status: "error",
      message: "Sign out and sign in again before deleting your account.",
    };
  }

  const [privilegedGrant] = await getDatabase()
    .select({ id: authRoleGrants.id })
    .from(authRoleGrants)
    .where(
      and(
        eq(authRoleGrants.userId, current.user.id),
        inArray(authRoleGrants.role, ["REVIEWER", "ADMIN"]),
      ),
    )
    .limit(1);
  if (privilegedGrant) {
    return {
      status: "error",
      message:
        "Reviewer and administrator accounts require an administrator-assisted erasure so content audit history remains trustworthy.",
    };
  }

  let externalBillingRemoved = false;
  try {
    const environment = getServerEnvironment();
    externalBillingRemoved = await deleteStripeCustomerForAccountErasure(
      current.user.id,
      environment.BILLING_ENABLED ? getStripeClient() : null,
    );
    await getDatabasePool().query(
      "SELECT erase_nuraprep_account($1) AS receipt_id",
      [current.user.id],
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("PRIVILEGED_ACCOUNT_REQUIRES_ADMIN_ERASURE")
    ) {
      return {
        status: "error",
        message:
          "Reviewer and administrator accounts require an administrator-assisted erasure so content audit history remains trustworthy.",
      };
    }
    if (
      error instanceof Error &&
      error.message.includes("BILLING_PROVIDER_REQUIRED_FOR_ERASURE")
    ) {
      return {
        status: "error",
        message:
          "Billing must be reconnected before this account can be safely erased. No account data was deleted.",
      };
    }
    return {
      status: "error",
      message: externalBillingRemoved
        ? "Billing was canceled, but local account erasure did not complete. Your local data remains intact; please retry account deletion."
        : "Account deletion did not complete. Your local account data remains intact; please try again.",
    };
  }

  redirect("/sign-in?deleted=1");
}
