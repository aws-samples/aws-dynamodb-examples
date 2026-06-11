FROM node:22.16.0-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm prune --omit=dev

FROM node:22.16.0-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN chown -R node:node /app
USER node
COPY --from=build --chown=node:node /app /app
EXPOSE 8080
CMD ["node", "src/server.mjs"]
