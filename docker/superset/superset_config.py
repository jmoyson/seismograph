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

# The SeismoGlobe plugin loads three-globe's Earth and night-sky textures from
# unpkg.com at runtime. Superset's default Talisman CSP only allows scarf.sh
# and document360 in img-src, so the textures get blocked and the globe renders
# black. Override TALISMAN_CONFIG to whitelist unpkg.com — we copy the rest of
# Superset's defaults so we don't accidentally loosen anything else.
TALISMAN_CONFIG = {
    "content_security_policy": {
        "base-uri": ["'self'"],
        "default-src": ["'self'"],
        "img-src": [
            "'self'",
            "blob:",
            "data:",
            "https://apachesuperset.gateway.scarf.sh",
            "https://static.scarf.sh/",
            "https://ows.terrestris.de",
            "https://cdn.document360.io",
            "https://unpkg.com",
        ],
        "worker-src": ["'self'", "blob:"],
        "connect-src": [
            "'self'",
            "https://api.mapbox.com",
            "https://events.mapbox.com",
        ],
        "object-src": "'none'",
        "style-src": ["'self'", "'unsafe-inline'"],
        "script-src": ["'self'", "'strict-dynamic'"],
    },
    "content_security_policy_nonce_in": ["script-src"],
    "force_https": False,
    "session_cookie_secure": False,
}
