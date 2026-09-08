import { createCheckoutUrl, getBillingOverview } from "@/data/billing";
import { auth } from "@/lib/auth/server";
import { hasTrustedMutationOrigin } from "@/lib/billing/request-security";
import { getStripeClient } from "@/lib/billing/stripe";
import { getServerEnvironment } from "@/lib/env/server";
import {
  APPLICATION_RATE_LIMITS,
  consumeApplicationRateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";

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

  const rateLimit = await consumeApplicationRateLimit(
    session.user.id,
    APPLICATION_RATE_LIMITS.billingSession,
  );
  if (!rateLimit.allowed) {
    return Response.json(
      { error: rateLimitMessage(rateLimit) },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const overview = await getBillingOverview(session.user.id, environment);
  if (!overview.canStartCheckout) {
    return Response.redirect(`${environment.NEXT_PUBLIC_APP_URL}/account`, 303);
  }

  try {
    const checkoutUrl = await createCheckoutUrl(
      {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      getStripeClient(),
      environment,
    );
    return Response.redirect(checkoutUrl, 303);
  } catch {
    return Response.redirect(
      `${environment.NEXT_PUBLIC_APP_URL}/account?billing=checkout_unavailable`,
      303,
    );
  }
}
