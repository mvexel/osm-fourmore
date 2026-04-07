from app.config import DEFAULT_JWT_SECRET_KEY, get_runtime_config_errors


def test_runtime_config_allows_development_defaults() -> None:
    errors = get_runtime_config_errors(
        environment="development",
        debug=True,
        jwt_secret_key=DEFAULT_JWT_SECRET_KEY,
        osm_client_id="",
        osm_client_secret="",
        osm_redirect_uri="",
    )

    assert errors == []


def test_runtime_config_rejects_unsafe_production_settings() -> None:
    errors = get_runtime_config_errors(
        environment="production",
        debug=True,
        jwt_secret_key=DEFAULT_JWT_SECRET_KEY,
        osm_client_id="",
        osm_client_secret="",
        osm_redirect_uri="",
    )

    assert errors == [
        "DEBUG must be disabled in production",
        "JWT_SECRET_KEY must be overridden in production",
        "OSM_CLIENT_ID must be set in production",
        "OSM_CLIENT_SECRET must be set in production",
        "OSM_REDIRECT_URI must be set in production",
    ]
