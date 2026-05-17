"""Validators for public PG booking and related flows."""

import re

from django.core.exceptions import ValidationError

INDIA_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")
REMARKS_MAX_LENGTH = 500
DURATION_QTY_MIN = 1
DURATION_QTY_MAX = 31

HONEYPOT_FIELD = "website"

STRUCTURED_DURATION_RE = re.compile(
    r"^(\d{1,2})\s+(day|days|week|weeks|month|months)$",
    re.IGNORECASE,
)


def normalize_india_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits


def _public_name_char_ok(ch: str) -> bool:
    return ch in " -'" or ch.isalpha()


def validate_public_full_name(value: str) -> str:
    name = (value or "").strip()
    if len(name) < 2:
        raise ValidationError("Enter your full name (at least 2 characters).")
    if len(name) > 200:
        raise ValidationError("Name is too long (max 200 characters).")
    if not all(_public_name_char_ok(c) for c in name):
        raise ValidationError("Use letters only. Hyphens and apostrophes are allowed.")
    if not any(c.isalpha() for c in name):
        raise ValidationError("Use letters only. Hyphens and apostrophes are allowed.")
    if name[0] in "-'" or name[-1] in "-'":
        raise ValidationError("Use letters only. Hyphens and apostrophes are allowed.")
    return name


def validate_public_phone(value: str) -> str:
    digits = normalize_india_phone(value)
    if not INDIA_MOBILE_RE.match(digits):
        raise ValidationError("Enter a valid 10-digit Indian mobile number (starts with 6–9).")
    return digits


def validate_public_duration(value: str) -> str:
    duration = (value or "").strip()
    if len(duration) < 2:
        raise ValidationError("Select or enter how long you plan to stay.")
    if len(duration) > 120:
        raise ValidationError("Duration is too long (max 120 characters).")

    match = STRUCTURED_DURATION_RE.match(duration)
    if match:
        qty = int(match.group(1))
        if qty < DURATION_QTY_MIN or qty > DURATION_QTY_MAX:
            raise ValidationError(
                f"Duration quantity must be between {DURATION_QTY_MIN} and {DURATION_QTY_MAX}."
            )
        return duration
    if re.match(r"^\d+\s+(day|days|week|weeks|month|months)$", duration, re.IGNORECASE):
        raise ValidationError("Enter a valid duration (e.g. 3 months).")

    if re.match(r"^[\W_]+$", duration, re.UNICODE):
        raise ValidationError("Enter a valid duration (e.g. 3 months).")
    return duration


def validate_public_remarks(value: str) -> str:
    remarks = (value or "").strip()
    if len(remarks) > REMARKS_MAX_LENGTH:
        raise ValidationError(f"Remarks are too long (max {REMARKS_MAX_LENGTH} characters).")
    return remarks


def validate_public_email(value: str) -> str:
    email = (value or "").strip()
    if not email:
        return ""
    if len(email) > 254:
        raise ValidationError("Email is too long.")
    from django.core.validators import validate_email

    try:
        validate_email(email)
    except ValidationError:
        raise ValidationError("Enter a valid email address.") from None
    return email


FIELD_VALIDATORS = {
    "full_name": validate_public_full_name,
    "phone": validate_public_phone,
    "email": validate_public_email,
    "duration": validate_public_duration,
    "remarks": validate_public_remarks,
}
