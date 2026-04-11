"""Superset configuration for Seismograph.

Superset stores its own metadata (users, dashboards, saved charts) in a
dedicated `superset_meta` database that lives on the same Postgres instance
as the seismograph application data. The init script creates that database
if it does not exist.
"""

import os


def _required(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Environment variable {name} is required")
    return value


DB_USER = _required("DATABASE_USER")
DB_PASSWORD = _required("DATABASE_PASSWORD")
DB_HOST = os.environ.get("DATABASE_HOST", "postgres")
DB_PORT = int(os.environ.get("DATABASE_PORT", "5432"))

# Metadata DB — Superset's own bookkeeping, isolated from seismograph data.
SQLALCHEMY_DATABASE_URI = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/superset_meta"
)

SECRET_KEY = _required("SUPERSET_SECRET_KEY")

# Redis cache — shared with BullMQ but on a different DB index to avoid key collisions.
CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_HOST": os.environ.get("REDIS_HOST", "redis"),
    "CACHE_REDIS_PORT": int(os.environ.get("REDIS_PORT", "6379")),
    "CACHE_REDIS_DB": 1,
}

FEATURE_FLAGS = {
    "EMBEDDABLE_CHARTS": True,
    "DASHBOARD_RBAC": True,
}

ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": ["*"],
    "origins": ["*"],
}
