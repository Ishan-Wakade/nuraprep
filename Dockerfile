# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:24-trixie-slim@sha256:6950b66b4c0cb0151ce89fa75074673850763d096b044f422c6729b588dd4956
ARG RUNTIME_IMAGE=gcr.io/distroless/nodejs24-debian13:nonroot@sha256:bb6b03d81066993293a10feda7250e8e1cc034035fe9b61cfceededa7c8bf04d

FROM ${NODE_IMAGE} AS base
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

FROM base AS runner-files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN ln -s /tmp/nuraprep-next-cache ./.next/cache

FROM ${RUNTIME_IMAGE} AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app

COPY --from=runner-files --chown=65532:65532 /app ./

USER 65532:65532
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["server.js"]

FROM runner AS lambda-app
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.1@sha256:1e5ab4d9242167500ed8a7bed8a79b448228aaa51cf382fb51fe4bf8a5f9a811 /lambda-adapter /opt/extensions/lambda-adapter
COPY --from=lambda-app-bootstrap-builder --chown=65532:65532 /app/dist/lambda-app/bootstrap.cjs ./bootstrap.cjs
ENV AWS_LWA_PORT=3000
ENV AWS_LWA_READINESS_CHECK_PATH=/icon.svg
ENV AWS_LWA_READINESS_CHECK_MIN_UNHEALTHY_STATUS=400
ENV AWS_LWA_ENABLE_COMPRESSION=true
ENV AWS_LWA_ERROR_STATUS_CODES=500-504
ENV NURAPREP_BOOTSTRAP_ENTRYPOINT=true
CMD ["bootstrap.cjs"]
