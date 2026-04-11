#!/bin/bash
set -euo pipefail

echo "[superset-init] Initializing Superset..."

: "${DATABASE_HOST:?DATABASE_HOST is required}"
: "${DATABASE_PORT:?DATABASE_PORT is required}"
: "${DATABASE_USER:?DATABASE_USER is required}"
: "${DATABASE_PASSWORD:?DATABASE_PASSWORD is required}"
: "${DATABASE_DB:?DATABASE_DB is required}"
: "${SUPERSET_SECRET_KEY:?SUPERSET_SECRET_KEY is required}"

export PGPASSWORD="$DATABASE_PASSWORD"

# Create Superset metadata DB if it does not exist.
if ! psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d postgres \
    -tc "SELECT 1 FROM pg_database WHERE datname = 'superset_meta'" | grep -q 1; then
  echo "[superset-init] Creating superset_meta database..."
  psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d postgres \
    -c "CREATE DATABASE superset_meta"
fi

echo "[superset-init] Running superset db upgrade..."
superset db upgrade

echo "[superset-init] Ensuring admin user..."
superset fab create-admin \
  --username "${SUPERSET_ADMIN_USERNAME:-admin}" \
  --firstname Admin \
  --lastname User \
  --email "${SUPERSET_ADMIN_EMAIL:-admin@seismograph.local}" \
  --password "${SUPERSET_ADMIN_PASSWORD:-admin}" || true

echo "[superset-init] Running superset init..."
superset init

echo "[superset-init] Registering the Seismograph database connection..."
python3 <<'PY'
import os
from superset.app import create_app

app = create_app()
with app.app_context():
    from superset.extensions import db as sa_db
    from superset.models.core import Database

    uri = (
        f"postgresql://{os.environ['DATABASE_USER']}:{os.environ['DATABASE_PASSWORD']}"
        f"@{os.environ['DATABASE_HOST']}:{os.environ['DATABASE_PORT']}"
        f"/{os.environ['DATABASE_DB']}"
    )
    existing = sa_db.session.query(Database).filter_by(database_name="Seismograph").first()
    if existing is None:
        database = Database(
            database_name="Seismograph",
            sqlalchemy_uri=uri,
            expose_in_sqllab=True,
        )
        sa_db.session.add(database)
        sa_db.session.commit()
        print("[superset-init] Seismograph database connection created.")
    else:
        print("[superset-init] Seismograph database connection already exists.")
PY

echo "[superset-init] Starting Superset on 0.0.0.0:8088..."
exec superset run -h 0.0.0.0 -p 8088 --with-threads
