import json
from pathlib import Path

import pytest

from apps.registry.constants import REGISTRY_SCHEMA_VERSION
from apps.registry.metadata import build_resource_metadata
from apps.demo.views import DemoItemViewSet

FIXTURE_PATH = Path(__file__).resolve().parents[3] / "tests" / "fixtures" / "metadata_demo_items_v1.json"


@pytest.fixture
def contract_fixture():
    with open(FIXTURE_PATH) as f:
        return json.load(f)


def test_metadata_includes_schema_version(contract_fixture):
    meta = build_resource_metadata(
        "demo-items",
        DemoItemViewSet,
        title="Demo catalog",
        description="Kernel validation resource (tenant-scoped).",
    )
    assert meta["schema_version"] == REGISTRY_SCHEMA_VERSION
    assert meta["schema_version"] == contract_fixture["schema_version"]


def test_metadata_required_top_level_keys(contract_fixture):
    meta = build_resource_metadata("demo-items", DemoItemViewSet, title="Demo catalog")
    for key in contract_fixture["required_top_level_keys"]:
        assert key in meta, f"missing contract key: {key}"


def test_metadata_paths_use_meta_prefix():
    meta = build_resource_metadata("demo-items", DemoItemViewSet)
    assert meta["list_path"] == "/api/meta/resources/demo-items/"
    assert meta["detail_path_template"] == "/api/meta/resources/demo-items/{id}/"


def test_metadata_includes_archive_action():
    meta = build_resource_metadata("demo-items", DemoItemViewSet)
    archive = next((a for a in meta["actions"] if a["name"] == "archive"), None)
    assert archive is not None
    assert archive["detail"] is True
    assert archive["url_path"] == "archive"
    assert "post" in archive["methods"]


def test_metadata_category_field_is_choice():
    meta = build_resource_metadata("demo-items", DemoItemViewSet)
    category = next(f for f in meta["fields"] if f["name"] == "category")
    assert category["type"] == "choice"
    assert "parts" in category["choices"]
