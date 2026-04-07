from urllib.parse import parse_qs, urlparse
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.auth import verify_oauth_state_token
from app.routers.auth import auth_callback, login


@pytest.mark.asyncio
async def test_login_returns_signed_oauth_state() -> None:
    response = await login()
    auth_url = response.data["auth_url"]
    state_values = parse_qs(urlparse(auth_url).query).get("state")

    assert state_values
    assert verify_oauth_state_token(state_values[0]) is True


@pytest.mark.asyncio
async def test_auth_callback_rejects_invalid_state_before_token_exchange() -> None:
    db = MagicMock()

    with patch(
        "app.routers.auth.OSMAuth.exchange_code_for_token", new_callable=AsyncMock
    ) as exchange_code_for_token:
        with pytest.raises(HTTPException) as exc_info:
            await auth_callback(code="sample-code", state="invalid-state", db=db)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Invalid or expired OAuth state"
    exchange_code_for_token.assert_not_called()
