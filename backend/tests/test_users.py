from types import SimpleNamespace
from unittest.mock import MagicMock, call

import pytest

from app.db import CheckIn
from app.routers.users import delete_account


@pytest.mark.asyncio
async def test_delete_account_only_removes_user_owned_records() -> None:
    db = MagicMock()
    checkins_query = MagicMock()
    checkins_filter = MagicMock()
    current_user = SimpleNamespace(id=123)

    db.query.return_value = checkins_query
    checkins_query.filter.return_value = checkins_filter

    response = await delete_account(db=db, current_user=current_user)

    assert response.success is True
    assert db.query.call_args_list == [call(CheckIn)]
    checkins_query.filter.assert_called_once()
    checkins_filter.delete.assert_called_once_with()
    db.delete.assert_called_once_with(current_user)
    db.commit.assert_called_once_with()
