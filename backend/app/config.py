"""Centralized configuration and environment variable loading for FourMore backend.

This module ensures consistent environment variable loading across all contexts:
- Local development (with .env and .env.local in project root)
- Docker containers (with .env files copied into container)
- Testing environments

Environment variables are loaded once at import time, with .env.local
overriding values from .env.

IMPORTANT: This is the ONLY place where default values are defined.
Do not duplicate defaults in .env files or other modules. Just reference
config.VARIABLE_NAME from other modules.
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# Configure module logger
logger = logging.getLogger(__name__)

# Find and load .env files from project root
# find_dotenv() searches up the directory tree, so it works regardless of where
# the Python process is started from
env_file = find_dotenv(".env")
env_local_file = find_dotenv(".env.local")

if env_file:
    logger.debug(f"Loading .env from: {env_file}")
    load_dotenv(env_file)
else:
    logger.debug("No .env file found (using defaults from config.py)")

if env_local_file:
    logger.debug(f"Loading .env.local from: {env_local_file}")
    load_dotenv(env_local_file, override=True)
else:
    logger.debug("No .env.local file found (this is optional)")


def get_env(key: str, default: str | None = None, required: bool = False) -> str:
    """Get environment variable with optional validation.

    Args:
        key: Environment variable name
        default: Default value if not found
        required: If True, raise ValueError when variable is missing

    Returns:
        Environment variable value or default

    Raises:
        ValueError: If required=True and variable is not found
    """
    value = os.getenv(key, default)
    if required and value is None:
        raise ValueError(f"Required environment variable '{key}' is not set")
    return value


def get_env_list(key: str, default: str = "") -> list[str]:
    """Return a cleaned list from a comma-separated environment variable."""
    raw_value = get_env(key, default)
    if not raw_value:
        return []
    return [item.strip() for item in raw_value.split(",") if item.strip()]


# =============================================================================
# Application Configuration
# All defaults are defined here. Override by setting env vars in .env.local
# =============================================================================

# Database Configuration
DATABASE_URL = get_env(
    "DATABASE_URL",
    "postgresql://fourmore:fourmore_dev_password@localhost:5432/fourmore",
)

# Redis Configuration
REDIS_URL = get_env("REDIS_URL", "redis://localhost:6379")

# Application Environment
DEBUG = get_env("DEBUG", "false").lower() in ("true", "1", "yes")
ENVIRONMENT = get_env("ENVIRONMENT", "development")
LOG_LEVEL = get_env("LOG_LEVEL", "INFO").upper()

# JWT Configuration
JWT_SECRET_KEY = get_env(
    "JWT_SECRET_KEY",
    "dev_secret_key_CHANGE_IN_PRODUCTION_via_env_local",
)
JWT_ALGORITHM = get_env("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    get_env("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
)

# OpenStreetMap OAuth
# NOTE: These require real values in .env.local for OAuth to work
OSM_CLIENT_ID = get_env("OSM_CLIENT_ID", "")
OSM_CLIENT_SECRET = get_env("OSM_CLIENT_SECRET", "")
OSM_REDIRECT_URI = get_env(
    "OSM_REDIRECT_URI",
    "http://127.0.0.1:3000/auth/callback",
)
OSM_ALLOWED_USERNAMES = {name.lower() for name in get_env_list("OSM_ALLOWED_USERNAMES")}
OSM_ALLOWED_USER_IDS = set(get_env_list("OSM_ALLOWED_USER_IDS"))
