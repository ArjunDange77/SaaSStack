import { useCallback, useMemo, useState } from "react";
import { PUBLIC_BOOKING_FORM_FIELDS } from "@/config/publicBookingFormFields";
import {
  composeDuration,
  normalizeIndiaPhone,
  parseStructuredDuration,
  validateDurationPicker,
  validatePublicBookingForm,
  type PublicBookingFieldErrors,
} from "@/lib/publicBookingValidation";
import type {
  DurationScrollState,
  PublicBookingFormFieldMeta,
  PublicBookingFormValues,
} from "@/types/publicBookingForm";

const DEFAULT_DURATION: DurationScrollState = { qty: 3, unit: "month" };

function buildInitialValues(fields: PublicBookingFormFieldMeta[]): PublicBookingFormValues {
  const values: PublicBookingFormValues = {};
  for (const f of fields) {
    values[f.name] = "";
  }
  return values;
}

export function usePublicBookingForm(fields: PublicBookingFormFieldMeta[] = PUBLIC_BOOKING_FORM_FIELDS) {
  const [values, setValues] = useState<PublicBookingFormValues>(() => buildInitialValues(fields));
  const [durationScroll, setDurationScroll] = useState<DurationScrollState>(DEFAULT_DURATION);
  const [website, setWebsite] = useState("");
  const [fieldErrors, setFieldErrors] = useState<PublicBookingFieldErrors>({});

  const resolvedDuration = useMemo(
    () => composeDuration(durationScroll.qty, durationScroll.unit),
    [durationScroll]
  );

  const setFieldValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name as keyof PublicBookingFieldErrors]) return prev;
      const next = { ...prev };
      delete next[name as keyof PublicBookingFieldErrors];
      return next;
    });
  }, []);

  const setDurationQty = useCallback((qty: number) => {
    setDurationScroll((prev) => ({ ...prev, qty }));
    setFieldErrors((prev) => ({ ...prev, duration: undefined }));
  }, []);

  const setDurationUnit = useCallback((unit: DurationScrollState["unit"]) => {
    setDurationScroll((prev) => ({ ...prev, unit }));
    setFieldErrors((prev) => ({ ...prev, duration: undefined }));
  }, []);

  const reset = useCallback(() => {
    setValues(buildInitialValues(fields));
    setDurationScroll(DEFAULT_DURATION);
    setWebsite("");
    setFieldErrors({});
  }, [fields]);

  const validate = useCallback((): PublicBookingFieldErrors => {
    const durationErr = validateDurationPicker(durationScroll.qty, durationScroll.unit);
    const mergedValues = { ...values, duration: resolvedDuration };
    const errors = validatePublicBookingForm(mergedValues, fields, { website });
    if (durationErr) {
      errors.duration = durationErr;
    }
    setFieldErrors(errors);
    return errors;
  }, [durationScroll, fields, resolvedDuration, values, website]);

  const buildPayload = useCallback(
    (preferredRoomId: number | null) => {
      const payload: Record<string, unknown> = {
        full_name: (values.full_name ?? "").trim(),
        phone: normalizeIndiaPhone(values.phone ?? ""),
        duration: resolvedDuration,
        remarks: (values.remarks ?? "").trim(),
        preferred_room: preferredRoomId,
        website,
      };
      const email = (values.email ?? "").trim();
      if (email) {
        payload.email = email;
      }
      return payload;
    },
    [resolvedDuration, values, website]
  );

  const initFromDurationString = useCallback((duration: string) => {
    const parsed = parseStructuredDuration(duration);
    if (parsed) {
      setDurationScroll(parsed);
    }
  }, []);

  return {
    values,
    durationScroll,
    resolvedDuration,
    website,
    fieldErrors,
    setFieldValue,
    setDurationQty,
    setDurationUnit,
    setWebsite,
    setFieldErrors,
    reset,
    validate,
    buildPayload,
    initFromDurationString,
  };
}
