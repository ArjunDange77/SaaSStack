"""Public booking form metadata for API-driven UI."""

PUBLIC_BOOKING_SCHEMA_VERSION = "1.0"

# UI overrides keyed by serializer field name.
PUBLIC_BOOKING_FIELD_UI = {
    "full_name": {
        "label": "Full name",
        "section": "personal",
        "widget": "text",
        "required": True,
        "colspan": 1,
        "order": 10,
        "placeholder": "e.g. Rahul Sharma",
    },
    "email": {
        "label": "Email",
        "section": "personal",
        "widget": "email",
        "required": False,
        "colspan": 1,
        "order": 20,
        "placeholder": "you@example.com",
        "optional_label": True,
    },
    "phone": {
        "label": "Phone",
        "section": "personal",
        "widget": "phone_in",
        "required": True,
        "colspan": 2,
        "order": 30,
        "placeholder": "10-digit mobile",
    },
    "duration": {
        "label": "Duration",
        "section": "stay",
        "widget": "duration_scroll",
        "required": True,
        "colspan": 2,
        "order": 40,
    },
    "remarks": {
        "label": "Remarks",
        "section": "additional",
        "widget": "textarea",
        "required": False,
        "colspan": 2,
        "order": 50,
        "placeholder": "Any special requests or questions?",
        "optional_label": True,
    },
}

# Fields exposed on the public form (excludes honeypot / internal).
PUBLIC_BOOKING_FORM_FIELD_NAMES = [
    "full_name",
    "email",
    "phone",
    "duration",
    "remarks",
]


def build_public_booking_form_schema():
    """Return form field metadata aligned with PublicBookingSerializer."""
    fields = []
    for name in PUBLIC_BOOKING_FORM_FIELD_NAMES:
        ui = PUBLIC_BOOKING_FIELD_UI.get(name, {})
        fields.append(
            {
                "name": name,
                "label": ui.get("label", name.replace("_", " ").title()),
                "section": ui.get("section", "personal"),
                "widget": ui.get("widget", "text"),
                "required": ui.get("required", False),
                "colspan": ui.get("colspan", 2),
                "order": ui.get("order", 99),
                "placeholder": ui.get("placeholder", ""),
                "help_text": ui.get("help_text", ""),
                "optional_label": ui.get("optional_label", False),
            }
        )
    fields.sort(key=lambda f: f["order"])
    return {
        "schema_version": PUBLIC_BOOKING_SCHEMA_VERSION,
        "fields": fields,
    }
