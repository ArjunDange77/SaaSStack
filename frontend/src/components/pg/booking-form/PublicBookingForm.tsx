import { groupFieldsBySection, sectionLabel } from "@/config/publicBookingFormFields";
import type { PublicBookingFieldErrors } from "@/lib/publicBookingValidation";
import type {
  DurationScrollState,
  PublicBookingFormFieldMeta,
  PublicBookingFormValues,
} from "@/types/publicBookingForm";
import { BookingFieldWidget } from "./BookingFieldWidget";

interface Props {
  fields: PublicBookingFormFieldMeta[];
  values: PublicBookingFormValues;
  durationScroll: DurationScrollState;
  fieldErrors: PublicBookingFieldErrors;
  onFieldChange: (name: string, value: string) => void;
  onDurationQtyChange: (qty: number) => void;
  onDurationUnitChange: (unit: DurationScrollState["unit"]) => void;
}

export function PublicBookingForm({
  fields,
  values,
  durationScroll,
  fieldErrors,
  onFieldChange,
  onDurationQtyChange,
  onDurationUnitChange,
}: Props) {
  const groups = groupFieldsBySection(fields);

  return (
    <div className="public-booking-form-sections">
      {groups.map(({ section, fields: sectionFields }) => (
        <section key={section} className="form-section" aria-labelledby={`section-${section}`}>
          <h2 id={`section-${section}`} className="section-label">
            {sectionLabel(section)}
          </h2>
          <div className="form-section-fields">
            {section === "personal" && sectionFields.some((f) => f.colspan === 1) ? (
              <>
                <div className="field-row">
                  {sectionFields
                    .filter((f) => f.colspan === 1)
                    .map((field) => (
                      <BookingFieldWidget
                        key={field.name}
                        field={field}
                        value={values[field.name] ?? ""}
                        error={fieldErrors[field.name as keyof PublicBookingFieldErrors]}
                        onChange={onFieldChange}
                      />
                    ))}
                </div>
                {sectionFields
                  .filter((f) => f.colspan !== 1)
                  .map((field) => (
                    <BookingFieldWidget
                      key={field.name}
                      field={field}
                      value={values[field.name] ?? ""}
                      error={fieldErrors[field.name as keyof PublicBookingFieldErrors]}
                      durationScroll={durationScroll}
                      onChange={onFieldChange}
                      onDurationQtyChange={onDurationQtyChange}
                      onDurationUnitChange={onDurationUnitChange}
                    />
                  ))}
              </>
            ) : (
              sectionFields.map((field) => (
                <BookingFieldWidget
                  key={field.name}
                  field={field}
                  value={values[field.name] ?? ""}
                  error={fieldErrors[field.name as keyof PublicBookingFieldErrors]}
                  durationScroll={durationScroll}
                  onChange={onFieldChange}
                  onDurationQtyChange={onDurationQtyChange}
                  onDurationUnitChange={onDurationUnitChange}
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
