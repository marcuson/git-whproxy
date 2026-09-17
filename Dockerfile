FROM node:22-alpine

RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

COPY . ./
RUN chown -R app:app /app
USER app

EXPOSE 3000

CMD ["node", "src/server.js"]