# Authentication and account-security design

Status: reviewed design with core Better Auth tables, encrypted OAuth-token configuration, database session endpoint, environment fail-closed checks, role-grant constraints, and account-audit boundaries implemented. Google sign-in UI and production authentication remain disabled until credentials and authorization tests are complete. Better Auth's direct deletion endpoint is intentionally disabled until the application-owned transactional deletion workflow and its foreign-key tests are implemented.

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

## Google configuration

Request only `openid`, `email`, and `profile`. Require Google's verified-email claim, use Google's stable provider subject as the external identifier, and configure exact callback URLs separately for local, staging, and production environments. Google requires an exact redirect-URI match and recommends `state`; its OpenID Connect documentation also describes `nonce` for replay protection. Those checks remain library-owned rather than being reimplemented in application code.

Account linking fails closed. An existing verified email does not silently merge with a new provider identity. Because version 1 supports only Google, users cannot unlink their sole sign-in method. Adding another provider later requires a separate threat-model update.

## Authorization rules

- All practice, progress, score, report, tutor, and account queries are scoped by the authenticated local user ID in the SQL predicate.
- Every Server Action repeats authentication and ownership checks immediately before mutation.
- `/review` data and actions require an active `REVIEWER` or `ADMIN` grant retrieved from PostgreSQL.
- Only `ADMIN` can create or revoke reviewer grants, and the target, actor, reason, and timestamp are audited.
- Production startup fails if Google credentials, the auth secret, or the production base URL are absent, or if either development bypass is enabled.
- Authentication errors disclose no account-existence or provider-token details.

## Account export and deletion

Export produces a user-scoped archive of profile, practice sessions, attempts, reports, tutor interactions, estimates, and study plans. It excludes internal reviewer notes about other users and all credentials.

Deletion requires a fresh session plus a typed confirmation. The transaction revokes every session first, detaches the Google account, deletes directly identifying auth/profile data, and deletes learner-owned practice data according to explicit foreign-key rules. Aggregate calibration records may be retained only after irreversible de-identification and only when the learner previously consented to outcome use. Failed or partial deletion is surfaced for retry and audit; the UI never reports success before the transaction completes.

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
| Orphaned personal data after deletion | One documented transaction, FK tests, export/deletion integration tests                     |

## Verification plan

The implementation is not complete until automated tests cover:

- production startup rejection for missing secrets or enabled bypasses;
- successful and denied Google callback fixtures without contacting Google in CI;
- invalid state, expired session, revoked session, and unverified-email rejection;
- learner isolation across reads and every Server Action;
- learner denial from reviewer routes and mutations;
- reviewer grant/revocation with fresh-session enforcement and audit evidence;
- logout on one device and revoke-all behavior;
- export scope and credential exclusion;
- full account deletion, rollback on injected failure, and post-deletion access denial; and
- secure cookie attributes in a production-mode integration test.

## Primary references

- [Next.js 16 authentication guide](https://nextjs.org/docs/app/guides/authentication)
- [Better Auth installation](https://better-auth.com/docs/installation)
- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
- [Better Auth session management](https://better-auth.com/docs/concepts/session-management)
- [Better Auth user and account lifecycle](https://better-auth.com/docs/concepts/users-accounts)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google OpenID Connect API reference](https://developers.google.com/identity/openid-connect/reference)
