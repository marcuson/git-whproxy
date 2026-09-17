FROM node:22-alpine

RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

COPY . ./
RUN chown -R app:app /app
USER app

EXPOSE 3000

CMD ["node", "src/server.js"]