export type PublicBookingFieldWidget =
  | "text"
  | "email"
  | "phone_in"
  | "textarea"
  | "duration_scroll";

export type PublicBookingFormSection = "personal" | "stay" | "additional";

export interface PublicBookingFormFieldMeta {
  name: string;
  label: string;
  section: PublicBookingFormSection;
  widget: PublicBookingFieldWidget;
  required?: boolean;
  colspan?: 1 | 2;
  order: number;
  placeholder?: string;
  helpText?: string;
  optionalLabel?: boolean;
}

export interface PublicBookingFormSchema {
  schema_version: string;
  fields: PublicBookingFormFieldMeta[];
}

export type PublicBookingFormValues = Record<string, string>;

export interface DurationScrollState {
  qty: number;
  unit: "day" | "week" | "month";
}
