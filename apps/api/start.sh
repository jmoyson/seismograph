#!/bin/sh
set -e
cd /app/apps/api
npx prisma db push
# nest-cli.json sets `sourceRoot: src`, so `nest build` outputs `dist/main.js`
# (NOT `dist/src/main.js`). Keep this path in sync with what nest emits.
exec node /app/apps/api/dist/main.js
