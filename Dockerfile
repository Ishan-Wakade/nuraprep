# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_SERVER_ACTIONS_KEY_VERSION=local
ENV APP_ENV=test
ENV BETTER_AUTH_SECRET=container-build-only-secret-not-used-at-runtime
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
# A staging/production build supplies the stable Server Action key through a
# BuildKit secret. Local and CI test builds may omit it and use Next.js's
# disposable generated key.
RUN --mount=type=secret,id=next_server_actions_encryption_key,required=false \
    test -n "$NEXT_SERVER_ACTIONS_KEY_VERSION"; \
    if [ -s /run/secrets/next_server_actions_encryption_key ]; then \
      export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(cat /run/secrets/next_server_actions_encryption_key)"; \
    fi; \
    pnpm build

FROM dependencies AS lambda-builder
COPY tsconfig.json ./
COPY src/lambda ./src/lambda
COPY src/lib/generation/retry-policy.ts ./src/lib/generation/retry-policy.ts
RUN pnpm build:lambda

FROM dependencies AS lambda-app-bootstrap-builder
COPY tsconfig.json ./
COPY src/lambda/serverless-app-bootstrap.ts ./src/lambda/serverless-app-bootstrap.ts
RUN pnpm build:lambda-app-bootstrap

FROM public.ecr.aws/lambda/nodejs:24 AS lambda-worker
COPY --from=lambda-builder /app/dist/lambda/index.cjs ${LAMBDA_TASK_ROOT}/index.cjs
CMD ["index.handler"]

FROM node:24-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]

FROM runner AS lambda-app
USER root
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.1@sha256:1e5ab4d9242167500ed8a7bed8a79b448228aaa51cf382fb51fe4bf8a5f9a811 /lambda-adapter /opt/extensions/lambda-adapter
COPY --from=lambda-app-bootstrap-builder --chown=nextjs:nodejs /app/dist/lambda-app/bootstrap.cjs ./bootstrap.cjs
RUN ln -s /tmp/nuraprep-next-cache ./.next/cache
ENV AWS_LWA_PORT=3000
ENV AWS_LWA_READINESS_CHECK_PATH=/api/health
ENV AWS_LWA_READINESS_CHECK_HEALTHY_STATUS=200-399
ENV AWS_LWA_ENABLE_COMPRESSION=true
ENV AWS_LWA_ERROR_STATUS_CODES=500-504
ENV NURAPREP_BOOTSTRAP_ENTRYPOINT=true
USER nextjs
CMD ["node", "bootstrap.cjs"]
