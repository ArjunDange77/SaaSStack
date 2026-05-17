"""Tests for deploy smoke helpers."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from smoke_env import env_nonempty
from smoke_test import smoke_credential


def test_smoke_credential_defaults_when_empty():
    os.environ["SMOKE_RESIDENT_USER"] = ""
    os.environ["SMOKE_RESIDENT_PASSWORD"] = "   "
    assert smoke_credential("SMOKE_RESIDENT_USER", "resident") == "resident"
    assert smoke_credential("SMOKE_RESIDENT_PASSWORD", "admin") == "admin"
    del os.environ["SMOKE_RESIDENT_USER"]
    del os.environ["SMOKE_RESIDENT_PASSWORD"]


def test_env_nonempty_uses_default_when_empty():
    os.environ["TEST_SMOKE_VAR"] = ""
    assert env_nonempty("TEST_SMOKE_VAR", "fallback") == "fallback"
    del os.environ["TEST_SMOKE_VAR"]


def test_env_nonempty_uses_value_when_set():
    os.environ["TEST_SMOKE_VAR"] = "  resident  "
    assert env_nonempty("TEST_SMOKE_VAR", "fallback") == "resident"
    del os.environ["TEST_SMOKE_VAR"]
