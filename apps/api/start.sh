#!/bin/sh
cd /app/apps/api && npx prisma db push
exec node /app/apps/api/dist/src/main.js
