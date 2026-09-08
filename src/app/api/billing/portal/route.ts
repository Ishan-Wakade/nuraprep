import { createPortalUrl } from "@/data/billing";
import { auth } from "@/lib/auth/server";
import { hasTrustedMutationOrigin } from "@/lib/billing/request-security";
import { getStripeClient } from "@/lib/billing/stripe";
import { getServerEnvironment } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const environment = getServerEnvironment();
  if (!environment.BILLING_ENABLED) {
    return Response.json({ error: "Billing is not enabled." }, { status: 404 });
  }
  if (!hasTrustedMutationOrigin(request, environment.NEXT_PUBLIC_APP_URL)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.redirect(
      `${environment.NEXT_PUBLIC_APP_URL}/sign-in?returnTo=/account`,
      303,
    );
  }

  try {
    const portalUrl = await createPortalUrl(
      session.user.id,
      getStripeClient(),
      environment,
    );
    if (!portalUrl) {
      return Response.redirect(
        `${environment.NEXT_PUBLIC_APP_URL}/account`,
        303,
      );
    }
    return Response.redirect(portalUrl, 303);
  } catch {
    return Response.redirect(
      `${environment.NEXT_PUBLIC_APP_URL}/account?billing=portal_unavailable`,
      303,
    );
  }
}
