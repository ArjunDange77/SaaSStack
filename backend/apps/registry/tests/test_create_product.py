import pytest
from django.core.management import call_command


def test_create_product_dry_run(capsys):
    call_command("create_product", "hosteltest", "--dry-run")
    captured = capsys.readouterr()
    assert "Would write" in captured.out
    assert "hosteltest" in captured.out
