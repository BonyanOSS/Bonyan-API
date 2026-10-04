FROM node:24-alpine AS deps
WORKDIR /src
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /src
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build
RUN pnpm prune --prod

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /src
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder /src/dist ./dist
COPY --from=builder /src/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
