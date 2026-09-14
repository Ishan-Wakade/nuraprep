# Scale-to-zero AWS portfolio deployment

This Terraform root is NuraPrep's lowest-idle-cost AWS option. It runs the existing standalone Next.js 16 container on Lambda through AWS's Lambda Web Adapter, exposes a generated HTTPS Function URL, and keeps Neon as PostgreSQL. It avoids provisioned concurrency and the always-on NAT Gateway, load balancer, Fargate, and RDS costs in the commercial target under `infra/terraform`.

The portfolio mirror is live at [its AWS-generated URL](https://mq6xnisbdyio5lcyhi6afmv7ti0lfomm.lambda-url.us-east-1.on.aws). It was deployed under AWS's Free account plan, which prevents charges while the plan remains active and closes the account when the plan or credits end. The architecture is nevertheless usage-priced: Lambda, ECR, CloudWatch, SSM API calls, and data transfer can consume credits or incur charges after an upgrade to a paid plan. The optional `$1` budget sends delayed alerts; it is not a hard cap. Vercel remains the primary career-fair deployment.

## Why this root exists

AWS Amplify Hosting currently documents managed SSR support only through Next.js 15, while NuraPrep uses Next.js 16. The AWS-maintained Lambda Web Adapter can run ordinary HTTP applications, including Next.js standalone output, without changing application routes. A Lambda Function URL has no separate endpoint charge and gives the mirror an AWS-generated public HTTPS origin.

## Security boundary

- Terraform never receives application secrets.
- Runtime configuration lives in one SSM Parameter Store `SecureString` created outside Terraform.
- The Lambda role can read only that exact parameter and write only its own log stream.
- Lambda Web Adapter probes a static asset for process readiness; the separate `/api/health` endpoint still verifies the database, so a paused free-tier Neon compute cannot deadlock Lambda startup.
- The bootstrap process accepts only the documented environment keys and refuses development identities, non-production mode, or broad proxy trust.
- Public invocation is deliberate; NuraPrep's Google OAuth and database-backed authorization still protect user and reviewer data.
- The Function URL resource creates AWS's two required public-policy statements; `lambda:InvokedViaFunctionUrl` prevents public invocation through other Lambda APIs.
- The final image is a digest-pinned distroless Node.js runtime, runs as unprivileged UID/GID 65532, and omits a shell and package manager.
- ECR tags are immutable, image scanning is enabled, only three images are retained, and Lambda consumes a digest-pinned URI. The September 14, 2026 release scan completed with no reported findings; recheck on every release because vulnerability data changes.

## Two-pass deployment

Do not paste credentials into Terraform variables or commit real `.tfvars` files.

1. Sign into AWS through IAM Identity Center or another MFA-protected operator identity and select one region.
2. Run `terraform init`, `terraform validate`, and `terraform test` in this directory.
3. Apply once with `deployment_enabled=false`. This creates only the private ECR repository and optional account budget.
4. Build the `lambda-app` Docker target for `linux/amd64` with `--provenance=false --sbom=false`, using a temporary HTTPS origin and the protected Server Action encryption key. Lambda requires a single-platform image manifest; the default Docker provenance attachment can otherwise create an unsupported manifest list. Push the image to the output ECR repository and record its digest.
5. Create `/nuraprep/portfolio/runtime` as an SSM `SecureString` with `pnpm aws:serverless:configure -- --env-file=<ignored-production-env-file> --app-url=<temporary-origin> --confirm-secure-parameter-write`. The helper loads values from the ignored file, forces safe AWS production settings, validates the allowlist, writes one encrypted standard parameter, and prints no secret values.
6. Apply with `deployment_enabled=true` and the digest-pinned image URI. Record the generated `application_url`.
7. Rebuild and repush with the generated URL as `NEXT_PUBLIC_APP_URL`, update the SecureString to that same URL, and apply with the new digest.
8. Add `<application_url>/api/auth/callback/google` to the Google OAuth client, then verify health, sign-in/out, practice, diagnostics, timed tests, reviewer denial for learners, logs, and the cost budget.

The two passes are required because AWS generates the Function URL only after the first Lambda exists, while Next.js and authentication need one exact canonical origin at build and runtime. The September 14, 2026 deployment completed this procedure with a single-platform, digest-pinned image; database-aware health and the complete Google OAuth redirect were verified live without writing secrets to Terraform state, image metadata, logs, or source control.
