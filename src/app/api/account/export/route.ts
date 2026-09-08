import { buildLearnerDataExport } from "@/data/account";
import { getDatabase } from "@/db/client";
import { accountAuditEvents } from "@/db/schema";
import { requireLearner } from "@/lib/auth/learner";
import { isFreshSession } from "@/lib/auth/fresh-session";
import { getCurrentSession } from "@/lib/auth/session";
import {
  APPLICATION_RATE_LIMITS,
  consumeApplicationRateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";

export async function GET() {
  const identity = await requireLearner();

  if (identity.mode === "authenticated") {
    const session = await getCurrentSession();
    if (!session || !isFreshSession(session.session.createdAt)) {
      return Response.json(
        {
          error:
            "A recent sign-in is required before downloading account data.",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const rateLimit = await consumeApplicationRateLimit(
    identity.subject,
    APPLICATION_RATE_LIMITS.accountExport,
  );
  if (!rateLimit.allowed) {
    return Response.json(
      { error: rateLimitMessage(rateLimit) },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const exportData = await buildLearnerDataExport(identity);
  if (identity.authUserId) {
    await getDatabase()
      .insert(accountAuditEvents)
      .values({
        userId: identity.authUserId,
        eventType: "DATA_EXPORT_DOWNLOADED",
        actorId: identity.authUserId,
        metadata: { exportVersion: exportData.exportVersion },
      });
  }
  const date = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="nuraprep-data-${date}.json"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
