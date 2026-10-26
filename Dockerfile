FROM node:24-alpine AS deps
WORKDIR /src
RUN corepack enable && corepack prepare pnpm@11.28.8 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS builder
WORKDIR /src
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build
RUN pnpm prune --prod --ignore-scripts

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /src
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder /src/dist ./dist
COPY --from=builder /src/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
