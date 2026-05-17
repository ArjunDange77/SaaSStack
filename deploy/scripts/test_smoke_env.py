"""Tests for deploy smoke helpers."""

from smoke_env import env_nonempty


def test_env_nonempty_uses_default_when_empty():
    import os

    os.environ["TEST_SMOKE_VAR"] = ""
    assert env_nonempty("TEST_SMOKE_VAR", "fallback") == "fallback"
    del os.environ["TEST_SMOKE_VAR"]


def test_env_nonempty_uses_value_when_set():
    import os

    os.environ["TEST_SMOKE_VAR"] = "  resident  "
    assert env_nonempty("TEST_SMOKE_VAR", "fallback") == "resident"
    del os.environ["TEST_SMOKE_VAR"]
