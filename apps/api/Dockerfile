FROM node:20-alpine AS builder
RUN npm install -g pnpm

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN cd apps/api && npx prisma generate
RUN pnpm --filter api build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/packages/shared ./packages/shared

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
