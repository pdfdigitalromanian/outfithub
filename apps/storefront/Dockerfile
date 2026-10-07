# Production image for the Next.js storefront (Coolify or any Docker host).
# Build:  docker build -t outfithub-storefront --build-arg MEDUSA_BACKEND_URL=... --build-arg NEXT_PUBLIC_... apps/storefront
# Run:    docker run --env-file .env -p 3000:3000 outfithub-storefront
# NEXT_PUBLIC_* values and the /admin redirect are baked in at build time; the backend must be reachable during the build.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG MEDUSA_BACKEND_URL
ARG ADMIN_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_DEFAULT_REGION
ARG NEXT_PUBLIC_IMAGE_HOST
ARG NEXT_PUBLIC_STRIPE_KEY
ARG NEXT_PUBLIC_NOINDEX
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
