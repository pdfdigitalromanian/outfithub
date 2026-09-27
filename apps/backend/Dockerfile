# Production image for the Medusa backend (server or worker).
# Build:  docker build -t outfithub-backend apps/backend
# Run:    docker run --env-file .env -p 9000:9000 outfithub-backend
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx medusa build

FROM node:22-alpine
WORKDIR /app/.medusa/server
ENV NODE_ENV=production
COPY --from=build /app/.medusa/server ./
RUN npm install --omit=dev
EXPOSE 9000
# Runs pending migrations, then starts the server (MEDUSA_WORKER_MODE decides server/worker).
CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
