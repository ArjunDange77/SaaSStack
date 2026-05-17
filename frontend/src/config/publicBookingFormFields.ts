import type {
  PublicBookingFormFieldMeta,
  PublicBookingFormSchema,
} from "@/types/publicBookingForm";

/** Fallback when GET booking-form is unavailable. Keep in sync with backend form_schema.py */
export const PUBLIC_BOOKING_FORM_FIELDS: PublicBookingFormFieldMeta[] = [
  {
    name: "full_name",
    label: "Full name",
    section: "personal",
    widget: "text",
    required: true,
    colspan: 1,
    order: 10,
    placeholder: "e.g. Rahul Sharma",
  },
  {
    name: "email",
    label: "Email",
    section: "personal",
    widget: "email",
    required: false,
    colspan: 1,
    order: 20,
    placeholder: "you@example.com",
    optionalLabel: true,
  },
  {
    name: "phone",
    label: "Phone",
    section: "personal",
    widget: "phone_in",
    required: true,
    colspan: 2,
    order: 30,
    placeholder: "10-digit mobile",
  },
  {
    name: "duration",
    label: "Duration",
    section: "stay",
    widget: "duration_scroll",
    required: true,
    colspan: 2,
    order: 40,
  },
  {
    name: "remarks",
    label: "Remarks",
    section: "additional",
    widget: "textarea",
    required: false,
    colspan: 2,
    order: 50,
    placeholder: "Any special requests or questions?",
    optionalLabel: true,
  },
];

export const PUBLIC_BOOKING_FORM_SCHEMA_FALLBACK: PublicBookingFormSchema = {
  schema_version: "1.0",
  fields: PUBLIC_BOOKING_FORM_FIELDS,
};

const SECTION_LABELS: Record<string, string> = {
  personal: "Personal info",
  stay: "Stay duration",
  additional: "Additional",
};

export function sectionLabel(section: string): string {
  return SECTION_LABELS[section] ?? section;
}

export function normalizeFormSchema(data: unknown): PublicBookingFormSchema {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return PUBLIC_BOOKING_FORM_SCHEMA_FALLBACK;
  }
  const raw = data as Record<string, unknown>;
  const fieldsRaw = raw.fields;
  if (!Array.isArray(fieldsRaw) || fieldsRaw.length === 0) {
    return PUBLIC_BOOKING_FORM_SCHEMA_FALLBACK;
  }
  const fields: PublicBookingFormFieldMeta[] = [];
  for (const f of fieldsRaw) {
    if (!f || typeof f !== "object") continue;
    const item = f as Record<string, unknown>;
    const name = String(item.name ?? "");
    if (!name) continue;
    fields.push({
      name,
      label: String(item.label ?? name),
      section: (item.section as PublicBookingFormFieldMeta["section"]) ?? "personal",
      widget: (item.widget as PublicBookingFormFieldMeta["widget"]) ?? "text",
      required: Boolean(item.required),
      colspan: (item.colspan === 1 ? 1 : 2) as 1 | 2,
      order: Number(item.order) || 99,
      placeholder: item.placeholder ? String(item.placeholder) : undefined,
      helpText: item.help_text ? String(item.help_text) : undefined,
      optionalLabel: Boolean(item.optional_label),
    });
  }
  fields.sort((a, b) => a.order - b.order);
  if (fields.length === 0) {
    return PUBLIC_BOOKING_FORM_SCHEMA_FALLBACK;
  }
  return {
    schema_version: String(raw.schema_version ?? "1.0"),
    fields,
  };
}

export function groupFieldsBySection(
  fields: PublicBookingFormFieldMeta[]
): { section: PublicBookingFormFieldMeta["section"]; fields: PublicBookingFormFieldMeta[] }[] {
  const order: PublicBookingFormFieldMeta["section"][] = [
    "personal",
    "stay",
    "additional",
  ];
  return order
    .map((section) => ({
      section,
      fields: fields.filter((f) => f.section === section),
    }))
    .filter((g) => g.fields.length > 0);
}
