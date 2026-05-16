"""Validators for public PG booking and related flows."""

import re

from django.core.exceptions import ValidationError

INDIA_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")
REMARKS_MAX_LENGTH = 500

HONEYPOT_FIELD = "website"


def normalize_india_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits


def validate_public_full_name(value: str) -> str:
    name = (value or "").strip()
    if len(name) < 2:
        raise ValidationError("Enter your full name (at least 2 characters).")
    if len(name) > 200:
        raise ValidationError("Name is too long (max 200 characters).")
    if name.isdigit():
        raise ValidationError("Name cannot be only numbers.")
    return name


def validate_public_phone(value: str) -> str:
    digits = normalize_india_phone(value)
    if not INDIA_MOBILE_RE.match(digits):
        raise ValidationError("Enter a valid 10-digit Indian mobile number (starts with 6–9).")
    return digits


def validate_public_duration(value: str) -> str:
    duration = (value or "").strip()
    if len(duration) < 2:
        raise ValidationError("Enter how long you plan to stay (e.g. 3 months).")
    if len(duration) > 120:
        raise ValidationError("Duration is too long (max 120 characters).")
    return duration


def validate_public_remarks(value: str) -> str:
    remarks = (value or "").strip()
    if len(remarks) > REMARKS_MAX_LENGTH:
        raise ValidationError(f"Remarks are too long (max {REMARKS_MAX_LENGTH} characters).")
    return remarks
