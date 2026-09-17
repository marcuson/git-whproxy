FROM node:24.21.0-alpine AS dependencies

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=git-whproxy-pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile --ignore-scripts --store-dir=/pnpm/store

FROM node:24.21.0-alpine AS runtime

RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

COPY --from=dependencies --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app package.json LICENSE ./
COPY --chown=app:app src/ ./src/
USER app

EXPOSE 3000

CMD ["node", "src/server.js"]
