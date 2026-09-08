# Authentication and account-security design

Status: reviewed design with core Better Auth tables, encrypted OAuth-token configuration, database sessions, shared authentication and application rate limiting, session lifecycle/export audit events, sign-in and sign-out surfaces, account-scoped learner profiles, fresh-session-gated portable export, signed-in-device visibility, transactional session revocation, transactional learner erasure, environment fail-closed checks, explicit proxy trust, database-enforced reviewer grants, role-grant constraints, and account-audit boundaries implemented. Browser tests exercise signed sessions, revocation without exposing tokens, audit creation, concurrent rate-limit enforcement, reviewer denial/approval, export credential exclusion, stale-session denial, complete learner erasure, and privileged-account refusal without contacting Google. The production Google callback remains disabled until real credentials and provider-response fixtures are available. Better Auth's broad direct deletion endpoint remains disabled because NuraPrep owns its narrower data-erasure transaction.

NuraPrep will use Google OpenID Connect through Better Auth with its Drizzle/PostgreSQL adapter. The application will keep database-backed, revocable sessions and will not request access to Google APIs beyond the identity scopes needed for sign-in. Development identities remain available only behind explicit local switches that already fail closed when `APP_ENV=production`.

This choice follows the installed Next.js 16 guidance to use an authentication library, perform secure authorization close to each data access, and treat Server Actions as public endpoints. Better Auth is preferred over beginning a new Auth.js integration because current Auth.js documentation points new projects toward Better Auth, while Better Auth documents maintained Next.js 16, Google, Drizzle, session-revocation, and account-deletion flows.

## Trust boundaries

1. Google authenticates the person and returns a signed OpenID Connect identity through the authorization-code flow.
2. Better Auth owns protocol state, PKCE where supported, callback validation, provider-account linkage, session issuance, and cookie handling.
3. PostgreSQL is the source of truth for the local user, linked provider account, active session, role grant, and learner profile.
4. NuraPrep's data-access functions revalidate the database session and role before reading learner-private data or performing any mutation.
5. Client components receive only display-safe account fields. Provider tokens, session tokens, role-grant evidence, and deletion internals remain server-only.

Route-shell or Proxy checks may improve navigation, but they are never an authorization boundary. Layouts can be reused during partial rendering, and a hidden button does not protect its Server Action.

## Data model direction

The authentication foundation includes:

- `auth_users`: local identifier, display name, normalized email, verified-email state, optional image URL, and timestamps;
- `auth_accounts`: provider identifier, provider subject, owning user, minimal provider-token fields required by the library, and a unique provider/subject boundary;
- `auth_sessions`: unique credential token, user, expiry, creation/update timestamps, and optional coarse device metadata;
- `auth_verifications`: short-lived verification state required by the library;
- `auth_rate_limits`: a short-lived, shared request bucket used to enforce atomic limits across application replicas;
- `application_rate_limits`: hashed principal/scope keys, fixed-window counts, and short expirations for authenticated high-impact operations;
- `auth_role_grants`: user, `LEARNER`/`REVIEWER`/`ADMIN` role, granting principal, reason, and immutable timestamps; and
- `account_audit_events`: append-only sign-in, sign-out, revocation, role, export, and deletion events with no raw credential values.

`learner_profiles` will reference the local auth user rather than trusting a caller-provided email or Google subject. Existing development data will receive an explicit development principal. Reviewer access is granted from a database role record; possession of a particular email address alone never creates reviewer privileges.

## Session policy

- Use database sessions so logout, account deletion, and administrative response can revoke access immediately.
- Use a high-entropy secret of at least 32 characters and support controlled secret rotation per environment.
- Set the session cookie `HttpOnly`, `Secure` outside local HTTP development, `SameSite=Lax`, host-only, and scoped to `/`.
- Keep the cookie cache disabled initially so every protected data operation observes revocation. Reconsider only after measuring database latency.
- Use a seven-day absolute session lifetime, a 24-hour rolling update interval, and require a session created within 15 minutes for role changes, export, or account deletion.
- Store no email, role, access token, or learner progress in browser-readable storage.
- Do not request or retain a Google refresh token because NuraPrep does not call Google APIs after sign-in.

The account page shows coarse device type, session timestamps, and IP address only to the owning authenticated user. The revoke-other-devices action obtains the current session server-side, deletes every sibling session in one database transaction, preserves the current session, and appends the number revoked to the account audit log. Raw session tokens never enter page props or the portable export.

PostgreSQL records `SESSION_CREATED` and `SESSION_REVOKED` from the session table itself, so direct library and application writes have the same transaction-bound audit behavior. A completed portable export records `DATA_EXPORT_DOWNLOADED`; failed freshness checks do not. Account erasure suppresses new lifecycle events only inside its transaction because it removes the account's audit history and writes a separate non-identifying receipt.

Better Auth rate limiting is enabled in every environment and stored in PostgreSQL so multiple containers cannot each grant a separate in-memory allowance. The general auth limit is 120 requests per 60 seconds, while social sign-in is limited to five starts per 60 seconds for one client/path key. Better Auth atomically consumes a bucket and prunes records older than the longest configured window. The bucket key may contain a client IP but is not linked to a user and has minute-scale retention.

Production accepts client IPs only from `X-Forwarded-For` chains interpreted with an explicit `TRUSTED_PROXY_CIDRS` allowlist. The AWS target fixes the ALB to append mode, disables client-port inclusion, restricts ECS ingress to the ALB security group, and supplies only the two ALB subnet CIDRs as trusted proxies. Better Auth then walks the chain from right to left and rejects malformed hops. Production startup fails if the proxy list is empty or malformed; broad values such as `0.0.0.0/0` are operationally prohibited. Forwarded host/protocol trust remains off because the canonical base URL is configured directly.

Self-hosted image builds and all running tasks share one base64-encoded 32-byte `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`. The key enters Docker only through a BuildKit secret mount and enters ECS through Secrets Manager. This supports multiple tasks and rolling deployments without exposing the key as a Docker build argument. Rotating it is a coordinated build-and-runtime release, not an ordinary environment toggle.

Application actions have a second, identity-based limiter because IP limits alone are weak after sign-in and in shared networks. One PostgreSQL upsert atomically consumes a fixed-window allowance across every application replica. The stored key is a SHA-256 digest of a domain separator, action scope, and internal principal; raw user IDs, email addresses, and IP addresses are not stored in this table. Expired rows older than one day are pruned in bounded batches during later requests. A database failure rejects the protected operation instead of silently bypassing the control.

| Protected operation                  | Allowance per account or reviewer |
| ------------------------------------ | --------------------------------- |
| Start any learner session            | 30 per hour                       |
| Submit answers                       | 300 per hour                      |
| Report question problems             | 10 per hour                       |
| Reveal reviewed tutor steps          | 60 per hour                       |
| Generate readiness estimates         | 12 per hour                       |
| Download portable account exports    | 5 per hour                        |
| Create Checkout or Portal sessions   | 10 combined per hour              |
| Queue provider-bound generation work | 20 per reviewer per hour          |
| Revoke sessions or request erasure   | 20 combined per hour              |

These are abuse ceilings, not learner targets or product quotas. The full 38-question timed flow remains comfortably below the answer allowance. Browser tests issue concurrent export requests and prove that the database admits exactly the configured maximum rather than granting one allowance per process.

## Google configuration

Request only `openid`, `email`, and `profile`. Require Google's verified-email claim, use Google's stable provider subject as the external identifier, and configure exact callback URLs separately for local, staging, and production environments. Google requires an exact redirect-URI match and recommends `state`; its OpenID Connect documentation also describes `nonce` for replay protection. Those checks remain library-owned rather than being reimplemented in application code.

Account linking fails closed. An existing verified email does not silently merge with a new provider identity. Because version 1 supports only Google, users cannot unlink their sole sign-in method. Adding another provider later requires a separate threat-model update.

## Authorization rules

- All practice, progress, score, report, tutor, and account queries are scoped by the authenticated local user ID in the SQL predicate.
- Every Server Action repeats authentication and ownership checks immediately before mutation.
- `/review` data and actions require an active `REVIEWER` or `ADMIN` grant retrieved from PostgreSQL.
- Only `ADMIN` can create or revoke reviewer grants, and the target, actor, reason, and timestamp are audited.
- Production startup fails if Google credentials, auth and Server Action secrets, trusted proxy CIDRs, or the production base URL are absent, or if either development bypass is enabled.
- Authentication errors disclose no account-existence or provider-token details.

## Account export and deletion

Export produces a versioned, user-scoped JSON archive of profile, non-token session metadata, practice sessions, attempts, reports, report-status history, tutor interactions, estimates, and study plans. It excludes provider credentials, session tokens, answer keys, and internal reviewer identities or notes. The response is rebuilt at request time, requires a fresh authenticated session outside local development, is marked `no-store` and `nosniff`, and records an audit event only after the archive is built successfully.

The export also excludes transient abuse-control rows. They contain no raw principal and expire automatically; after erasure their digest is no longer linkable through NuraPrep account tables.

Deletion requires a session created within the last 15 minutes plus an exact typed `DELETE` confirmation. The application calls one PostgreSQL erasure procedure that locks the account; removes learner-derived improvement evidence; deletes report history, practice and tutor history, score estimates, and study plans in dependency order; removes the learner profile, account audit events, role grants, provider credentials, sessions, and email-linked verification records; then deletes the auth user. No calibration record is retained in version 1. The procedure writes a receipt containing only per-table deletion counts, a schema version, and completion time; it stores no user ID, email, provider subject, token, answer, or report text.

If an account has a Stripe Customer mapping, the application must first delete that Customer through the configured server-side provider. This removes payment methods and immediately cancels active subscriptions before the local transaction runs. A missing billing provider fails closed rather than leaving an external billable identity behind. Local customer and subscription projections then cascade from the deleted auth user; the non-identifying webhook receipt ledger has no user foreign key or payload. See [Billing and entitlement design](BILLING.md).

Deletion-aware trigger behavior is narrow and transaction-local. Append-only records still reject ordinary updates and deletes. Only the erasure procedure sets the local deletion context that permits removal from the specific learner-owned audit tables, and that context ends with the transaction. Database smoke tests inject a failure at the final receipt insert after preceding deletes have executed and verify that the user, profile, role grant, and audit event all return. The UI reports completion only after the receipt exists.

Accounts with any reviewer or administrator grant history are refused by self-service deletion, including after a grant is revoked. Their IDs can be embedded in immutable content-review records that are not learner-owned. An administrator-assisted pseudonymization and retention procedure must be reviewed before production; silently deleting or orphaning those records would undermine content-safety auditability.

## Threats and controls

| Threat                                | Primary controls                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Login CSRF or callback injection      | Library-managed state/PKCE, exact callback allowlist, same-site secure cookie               |
| Replayed or forged identity token     | Provider issuer/audience/signature validation and nonce support                             |
| Session theft                         | High-entropy server-issued token, HTTPS, `HttpOnly`, short fresh-session window, revocation |
| Horizontal learner-data access        | Database session validation plus user-ID predicates at the data layer                       |
| Reviewer privilege escalation         | Explicit database grants, deny-by-default roles, fresh admin session, immutable audit       |
| Unsafe account linking                | Stable provider subject and no email-only implicit merge                                    |
| Development bypass in production      | Environment validation rejects production startup                                           |
| Forged forwarded client address       | ALB-only origin ingress, append mode, and exact trusted-proxy CIDRs                         |
| Incompatible Server Action encryption | One protected build/runtime key shared across every self-hosted task                        |
| Authenticated action flooding         | Atomic per-principal database limits shared by all application replicas                     |
| Orphaned personal data after deletion | One documented transaction, FK tests, export/deletion integration tests                     |

## Verification plan

The implementation is not complete until automated tests cover:

- production startup rejection for missing secrets or enabled bypasses;
- successful and denied Google callback fixtures without contacting Google in CI;
- invalid state, expired session, revoked session, and unverified-email rejection;
- learner isolation across reads and every Server Action;
- learner denial from reviewer routes and mutations;
- reviewer grant/revocation with fresh-session enforcement and audit evidence;
- logout on one device and revoke-other-devices behavior;
- export scope and credential exclusion;
- administrator-assisted erasure and pseudonymization for privileged accounts; and
- secure cookie attributes in a production-mode integration test.

## Primary references

- [Next.js 16 authentication guide](https://nextjs.org/docs/app/guides/authentication)
- [Better Auth installation](https://better-auth.com/docs/installation)
- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
- [Better Auth session management](https://better-auth.com/docs/concepts/session-management)
- [Better Auth user and account lifecycle](https://better-auth.com/docs/concepts/users-accounts)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google OpenID Connect API reference](https://developers.google.com/identity/openid-connect/reference)
