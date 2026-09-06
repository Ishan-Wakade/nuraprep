import { buildLearnerDataExport } from "@/data/account";
import { requireLearner } from "@/lib/auth/learner";
import { isFreshSession } from "@/lib/auth/fresh-session";
import { getCurrentSession } from "@/lib/auth/session";

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

  const exportData = await buildLearnerDataExport(identity);
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
