"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { deleteStripeCustomerForAccountErasure } from "@/data/billing";
import { getDatabase, getDatabasePool } from "@/db/client";
import { authRoleGrants, authUsers } from "@/db/schema";
import { isFreshSession } from "@/lib/auth/fresh-session";
import { getCurrentSession } from "@/lib/auth/session";
import { getStripeClient } from "@/lib/billing/stripe";
import { getServerEnvironment } from "@/lib/env/server";
import {
  APPLICATION_RATE_LIMITS,
  consumeApplicationRateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";

export type AssistedErasureState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function pseudonymizePrivilegedAccount(
  targetUserId: string,
  _previousState: AssistedErasureState,
  formData: FormData,
): Promise<AssistedErasureState> {
  void _previousState;

  const confirmationEmail = String(
    formData.get("confirmationEmail") ?? "",
  ).trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!targetUserId || reason.length < 20 || reason.length > 500) {
    return {
      status: "error",
      message: "Provide the target account and a 20–500 character reason.",
    };
  }

  const current = await getCurrentSession();
  if (!current || !isFreshSession(current.session.createdAt)) {
    return {
      status: "error",
      message: "Sign out and sign in again before using this control.",
    };
  }
  if (current.user.id === targetUserId) {
    return {
      status: "error",
      message: "An administrator cannot pseudonymize their own account.",
    };
  }

  const database = getDatabase();
  const [adminGrant, target] = await Promise.all([
    database
      .select({ id: authRoleGrants.id })
      .from(authRoleGrants)
      .where(
        and(
          eq(authRoleGrants.userId, current.user.id),
          eq(authRoleGrants.role, "ADMIN"),
          isNull(authRoleGrants.revokedAt),
        ),
      )
      .limit(1),
    database
      .select({ id: authUsers.id, email: authUsers.email })
      .from(authUsers)
      .where(eq(authUsers.id, targetUserId))
      .limit(1),
  ]);
  if (!adminGrant[0]) {
    return {
      status: "error",
      message: "Active administrator access required.",
    };
  }
  if (!target[0] || target[0].email !== confirmationEmail) {
    return {
      status: "error",
      message: "Type the target account email exactly to confirm.",
    };
  }

  const [privilegedHistory] = await database
    .select({ id: authRoleGrants.id })
    .from(authRoleGrants)
    .where(
      and(
        eq(authRoleGrants.userId, targetUserId),
        inArray(authRoleGrants.role, ["REVIEWER", "ADMIN"]),
      ),
    )
    .limit(1);
  if (!privilegedHistory) {
    return {
      status: "error",
      message: "Use ordinary self-service erasure for a learner-only account.",
    };
  }

  const rateLimit = await consumeApplicationRateLimit(
    current.user.id,
    APPLICATION_RATE_LIMITS.accountSecurityMutation,
  );
  if (!rateLimit.allowed) {
    return { status: "error", message: rateLimitMessage(rateLimit) };
  }

  let externalBillingRemoved = false;
  try {
    const environment = getServerEnvironment();
    externalBillingRemoved = await deleteStripeCustomerForAccountErasure(
      targetUserId,
      environment.BILLING_ENABLED ? getStripeClient() : null,
    );
    await getDatabasePool().query(
      "SELECT erase_nuraprep_account($1, $2, $3) AS receipt_id",
      [targetUserId, current.user.id, reason],
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("ACCOUNT_NOT_FOUND")) {
      return {
        status: "error",
        message: "The target account no longer exists.",
      };
    }
    if (
      error instanceof Error &&
      error.message.includes("ACTIVE_ADMIN_REQUIRED_FOR_PRIVILEGED_ERASURE")
    ) {
      return {
        status: "error",
        message: "Active administrator access required.",
      };
    }
    if (
      error instanceof Error &&
      error.message.includes("BILLING_PROVIDER_REQUIRED_FOR_ERASURE")
    ) {
      return {
        status: "error",
        message:
          "Billing must be reconnected before this account can be safely pseudonymized.",
      };
    }
    return {
      status: "error",
      message: externalBillingRemoved
        ? "Billing was canceled, but local pseudonymization did not complete. Retry or investigate before taking another action."
        : "The account was not pseudonymized. No local account data was changed.",
    };
  }

  revalidatePath("/review/accounts");
  return {
    status: "success",
    message:
      "Identity and learner data removed. Immutable review attribution now resolves only to a disabled pseudonymous tombstone.",
  };
}
