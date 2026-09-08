# Billing and entitlement design

## Current status

The Stripe integration is implemented but disabled by default. It can be exercised in a Stripe sandbox without charging a real card or creating AWS resources. No product, price, customer, subscription, or webhook endpoint has been created in the owner's Stripe account by this repository.

No learner feature is paywalled yet. The data model and resolver distinguish `FREE` from `PREMIUM_MATH`, but a product decision must identify a fair premium feature set before access checks are added to learner services.

## Why hosted Stripe surfaces

NuraPrep creates Checkout Sessions and Customer Portal Sessions on the server, then redirects the authenticated learner to Stripe-hosted pages. Card numbers, security codes, and payment-method details never pass through NuraPrep's React components, route handlers, logs, or PostgreSQL database.

Live Stripe mode is rejected unless `APP_ENV=production`. This prevents a developer or test process from accepting a live secret even when the remaining billing identifiers are syntactically valid. Production can still run Stripe test mode for a controlled pre-launch drill; billing remains disabled unless every required value is present and `BILLING_ENABLED=true`.

The browser cannot choose a price. The server reads one configured recurring price ID and creates a quantity-one subscription. Existing customers are reused through a unique local user-to-customer mapping and a stable customer-creation idempotency key.

## Trust boundary and data model

- `billing_customers` maps one authenticated NuraPrep user to one Stripe Customer ID.
- `billing_subscriptions` is a replaceable local projection of the latest Stripe subscription state. It stores identifiers, status, cancellation intent, and period end, not payment details.
- `billing_webhook_events` is an append-only receipt ledger keyed by Stripe Event ID. It intentionally stores no full webhook payload.
- Premium Math access is granted only when the synchronized subscription belongs to the configured product and has status `ACTIVE` or `TRIALING`.
- `PAST_DUE`, `UNPAID`, `PAUSED`, `INCOMPLETE`, `INCOMPLETE_EXPIRED`, `CANCELED`, unknown statuses, and unrelated products fail closed to free access.

Stripe does not guarantee webhook delivery order. For every supported subscription event, NuraPrep retrieves the current Subscription from Stripe before updating its local projection. Exact repeated Event IDs are ignored transactionally. A processing failure returns a non-success status so Stripe can retry; an unsupported event is recorded as ignored and returns success.

The webhook accepts only a raw request body with a valid `Stripe-Signature`, and the event's live/test flag must match the configured mode. It rejects a declared or streamed body above the internal one-megabyte ceiling before signature verification can allocate unbounded memory. Checkout and portal endpoints require a database session plus an exact same-origin POST. Development identities are not allowed to enter billing.

Checkout and Portal creation share an atomic per-account allowance of ten requests per hour. This limits provider-side object and session churn across multiple app replicas. Stripe webhook delivery is not subject to this learner limit because signed provider retries must remain processable.

## Zero-upfront-cost sandbox setup

1. Create a Stripe sandbox and a recurring price for one Premium Math product. This does not activate live charges.
2. Install and authenticate the Stripe CLI, then forward signed sandbox events:

   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```

3. Copy only sandbox values into `.env.local`:

   ```dotenv
   BILLING_ENABLED=true
   STRIPE_MODE=test
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID=price_...
   STRIPE_PREMIUM_PRODUCT_ID=prod_...
   ```

4. Configure Google OAuth and sign in with a real local account. The local development identity cannot create billing objects.
5. Run `pnpm dev`, open `/account`, and use **Start secure checkout**.
6. Exercise purchase, renewal, failed payment, recovery, cancellation, and replay in the sandbox. Stripe test clocks can advance subscription time without waiting for a real billing period.

The application refuses partial Stripe configuration. Test mode requires an `sk_test_` key, and live mode requires an `sk_live_` key. Secrets remain server-only; hosted Checkout does not require a publishable key in the browser.

## Account export and erasure

The portable account export includes provider customer/subscription/product/price identifiers and synchronized status because they are account data. It excludes webhook payloads, secrets, payment methods, and card data.

Before local account erasure, NuraPrep deletes the corresponding Stripe Customer. Stripe documents that this permanently removes its card details and immediately cancels active subscriptions. Only after that succeeds does the existing transactional PostgreSQL erasure run. This cross-system sequence cannot be one atomic transaction: if Stripe succeeds and PostgreSQL later fails, the UI states that billing was canceled while local data remains and asks the learner to retry. If Stripe is disconnected while a local customer mapping exists, erasure fails closed instead of orphaning billable external data. Reviewer and administrator accounts remain subject to the separate administrator-assisted erasure gate.

## Production activation gate

Before `STRIPE_MODE=live` is approved:

- decide the free/premium feature boundary and subscription terms without deceptive urgency or hidden cancellation behavior;
- configure products, prices, portal cancellation behavior, tax handling, receipts, and support contact details;
- verify signed events for creation, update, renewal, payment failure/recovery, cancellation, duplicate delivery, and out-of-order delivery;
- verify account deletion in live-like test fixtures, including partial-failure recovery;
- add operational alerts for webhook failures and stale subscription projections;
- review privacy policy, terms, refund policy, tax obligations, and data-retention requirements; and
- record the expected transaction fees and infrastructure cost, then obtain explicit owner approval.

## Primary references

- [Stripe subscription Checkout](https://docs.stripe.com/payments/checkout/build-subscriptions)
- [Stripe webhook signatures and delivery behavior](https://docs.stripe.com/webhooks)
- [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Stripe-hosted customer portal](https://docs.stripe.com/api/customer_portal/sessions)
- [Stripe Billing sandbox testing and test clocks](https://docs.stripe.com/billing/testing)
- [Stripe customer deletion](https://docs.stripe.com/api/customers/delete)
