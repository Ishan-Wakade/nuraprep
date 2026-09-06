"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDatabase } from "@/db/client";
import { accountAuditEvents, authSessions } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth/session";

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
