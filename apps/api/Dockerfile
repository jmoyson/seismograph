FROM node:20-alpine
RUN npm install -g pnpm

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
# apps/api has `"postinstall": "prisma generate"` which fires during the
# pnpm install below. Prisma 7 reads prisma.config.ts and the schema file
# RELATIVE to the package directory, so both must be present in the build
# context BEFORE the install step — otherwise the postinstall fails with
# "Could not find Prisma Schema". Keep these COPY lines above `pnpm install`.
COPY apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter api build

EXPOSE 3000
CMD ["sh", "apps/api/start.sh"]
