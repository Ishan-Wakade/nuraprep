# Deployment and container operations

## Current scope

NuraPrep has a verified application image and a local Compose topology. No AWS resource has been provisioned. The production target remains a deliberately small modular-monolith deployment: one stateless Next.js container, one PostgreSQL database, and one short-lived migration job. A separate generation worker can be added only when a real provider and queue host are approved.

The container uses Next.js 16 standalone output so the runtime image contains traced production dependencies rather than the full source tree and development toolchain. It runs as the unprivileged `nextjs` user and reports only `ok` or `unavailable` from `/api/health`; database errors and connection details are never returned.

## Local workflows

For the fastest edit-refresh loop, run only PostgreSQL in Docker and Next.js on the host:

```bash
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm dev
```

To verify the deployable container topology, including the one-shot migration job:

```bash
docker compose --profile application up --build
```

This local profile deliberately runs with `APP_ENV=development`, local-only credentials, and development identities. It is not a production configuration. It applies migrations but does not seed or publish content. If port 3000 is already occupied, choose both a host port and matching public origin:

```bash
APP_PORT=3001 APP_URL=http://localhost:3001 \
  docker compose --profile application up --build
```

Inspect service state and logs with:

```bash
docker compose --profile application ps
docker compose --profile application logs app migrate postgres
curl --fail http://localhost:3000/api/health
```

Stop the application and database without deleting the database volume:

```bash
docker compose --profile application down
```

Volume deletion is intentionally not part of the normal command because it destroys local data.

## Image build and release contract

The public application origin is the only build argument; it is not a secret:

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://staging.example.com \
  --target runner \
  --tag nuraprep:staging .
```

Runtime configuration must come from the deployment platform, never from an image layer. A production task requires:

- `APP_ENV=production`;
- the exact HTTPS `NEXT_PUBLIC_APP_URL` used at build time;
- a TLS-validated `DATABASE_URL`;
- a unique `BETTER_AUTH_SECRET` of at least 32 characters; and
- environment-specific Google client credentials.

The production environment validator refuses to start with development identity switches or missing authentication configuration. Stripe and AWS variables remain absent until those integrations are approved.

Build the temporary migration image from the same commit and run it once before shifting application traffic:

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://staging.example.com \
  --target builder \
  --tag nuraprep-migrate:staging .

docker run --rm \
  -e APP_ENV=production \
  -e NEXT_PUBLIC_APP_URL=https://staging.example.com \
  -e DATABASE_URL \
  -e DIRECT_URL \
  nuraprep-migrate:staging pnpm db:migrate
```

In a real deployment, secrets are injected by the orchestrator and are not written directly on a command line. The release process must stop if migration fails. Destructive rollback migrations are not automatic; application rollback must remain compatible with the migrated schema or use an explicitly reviewed forward fix.

## AWS target, pending approval

The first defensible AWS layout is:

1. ECR for immutable application and migration images;
2. ECS Fargate behind an Application Load Balancer for the web task;
3. a private RDS PostgreSQL instance with encryption, backups, deletion protection, and restricted security groups;
4. Secrets Manager for database, Better Auth, Google, and later Stripe credentials;
5. CloudWatch structured logs, health alarms, and retained security events;
6. S3 only for source artifacts whose storage rights were approved;
7. separate staging and production accounts or strongly separated networks and secrets; and
8. AWS Budgets plus service-level alarms before public traffic.

Do not create this infrastructure until expected monthly cost, region, domain, data-retention policy, backup/restore procedure, and teardown plan are reviewed. Deployment is not considered complete until a restore drill, least-privilege review, accessibility pass, load test, and incident exercise succeed in staging.
