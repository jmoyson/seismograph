#!/bin/sh
cd /app/apps/api && npx prisma db push --skip-generate
exec node /app/apps/api/dist/src/main.js
