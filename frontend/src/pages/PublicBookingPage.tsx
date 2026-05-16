import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { apiErrorMessage } from "@/api/client";
import { BookingStepIndicator } from "@/components/pg/BookingStepIndicator";
import { RoomCard, type RoomCardData } from "@/components/pg/RoomCard";
import { RoomCardSkeleton } from "@/components/pg/RoomCardSkeleton";
import {
  mapApiErrorsToFields,
  normalizeIndiaPhone,
  type PublicBookingFieldErrors,
  validatePublicBookingForm,
} from "@/lib/publicBookingValidation";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type Step = "rooms" | "form" | "done";

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={required ? "field-required" : undefined}>
      {children}
    </label>
  );
}

export function PublicBookingPage() {
  const { tenantSlug = "pg-demo" } = useParams();
  const [rooms, setRooms] = useState<RoomCardData[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [step, setStep] = useState<Step>("rooms");
  const [selectedRoom, setSelectedRoom] = useState<RoomCardData | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [duration, setDuration] = useState("");
  const [remarks, setRemarks] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<PublicBookingFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const loadRooms = useCallback(async () => {
    setError("");
    setLoadingRooms(true);
    try {
      const { data } = await axios.get<RoomCardData[]>(
        `${API_BASE}/api/pg/public/${tenantSlug}/rooms/available/`
      );
      setRooms(data);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not load rooms."));
    } finally {
      setLoadingRooms(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const resetBooking = () => {
    setStep("rooms");
    setSelectedRoom(null);
    setFullName("");
    setPhone("");
    setDuration("");
    setRemarks("");
    setWebsite("");
    setBookingId(null);
    setError("");
    setFieldErrors({});
    loadRooms();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientErrors = validatePublicBookingForm({
      fullName,
      phone,
      duration,
      remarks,
      website,
    });
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      const { data } = await axios.post<{ id: number }>(
        `${API_BASE}/api/pg/public/${tenantSlug}/booking-requests/`,
        {
          full_name: fullName.trim(),
          phone: normalizeIndiaPhone(phone),
          duration: duration.trim(),
          remarks: remarks.trim(),
          preferred_room: selectedRoom?.id ?? null,
          website,
        }
      );
      setBookingId(data.id);
      setStep("done");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const mapped = mapApiErrorsToFields(err.response.data);
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
          setError(apiErrorMessage(err, "Could not submit booking."));
          return;
        }
      }
      setError(apiErrorMessage(err, "Could not submit booking."));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof PublicBookingFieldErrors) =>
    fieldErrors[field] ? "field-invalid" : undefined;

  if (step === "done") {
    return (
      <div className="public-booking">
        <BookingStepIndicator current="done" />
        <div className="booking-success">
          <div className="booking-success-icon" aria-hidden>
            ✓
          </div>
          <h1>Request received</h1>
          <p className="booking-success-lead">
            Thank you, {fullName.trim()}. We&apos;ll contact you on{" "}
            <strong>{normalizeIndiaPhone(phone)}</strong> within 24 hours.
          </p>
          {bookingId != null && (
            <p className="muted booking-ref">Reference #{bookingId}</p>
          )}
          <p className="muted">
            Our team will confirm availability and next steps for your stay.
          </p>
          <button type="button" className="secondary" onClick={resetBooking}>
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-booking">
      <header className="public-booking-header">
        <h1>Book a stay</h1>
        <p className="muted">Property: {tenantSlug}</p>
      </header>
      <BookingStepIndicator current={step} />

      {step === "rooms" && (
        <>
          {loadingRooms ? (
            <div className="room-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <RoomCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              <div className="room-grid">
                {rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onClick={() => {
                      setSelectedRoom(room);
                      setStep("form");
                    }}
                  />
                ))}
              </div>
              {rooms.length === 0 && (
                <div className="booking-empty">
                  <p>No beds available right now.</p>
                  <p className="muted">
                    You can still send a general request — we&apos;ll match you when a room opens.
                  </p>
                </div>
              )}
              <button
                type="button"
                className="booking-skip-room ghost"
                onClick={() => {
                  setSelectedRoom(null);
                  setStep("form");
                }}
              >
                I&apos;ll choose a room later
              </button>
            </>
          )}
          {error && <p className="error">{error}</p>}
        </>
      )}

      {step === "form" && (
        <form onSubmit={submit} className="booking-form" noValidate>
          {selectedRoom && (
            <div className="booking-selected-room">
              <p className="muted">Selected room</p>
              <RoomCard room={selectedRoom} as="div" />
            </div>
          )}
          <label className="hp-field" aria-hidden="true">
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
          <div className="field-block">
            <FieldLabel htmlFor="booking-full-name" required>
              Full name
            </FieldLabel>
            <input
              id="booking-full-name"
              required
              className={inputClass("full_name")}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, full_name: undefined }));
              }}
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.full_name)}
            />
            {fieldErrors.full_name && (
              <p className="field-error-msg" role="alert">
                {fieldErrors.full_name}
              </p>
            )}
          </div>
          <div className="field-block">
            <FieldLabel htmlFor="booking-phone" required>
              Phone
            </FieldLabel>
            <input
              id="booking-phone"
              required
              type="tel"
              inputMode="numeric"
              className={inputClass("phone")}
              value={phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(digits);
                setFieldErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              autoComplete="tel"
              maxLength={10}
              placeholder="10-digit mobile"
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            {fieldErrors.phone && (
              <p className="field-error-msg" role="alert">
                {fieldErrors.phone}
              </p>
            )}
          </div>
          <div className="field-block">
            <FieldLabel htmlFor="booking-duration" required>
              Duration
            </FieldLabel>
            <input
              id="booking-duration"
              required
              className={inputClass("duration")}
              placeholder="e.g. 3 months"
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value);
                setFieldErrors((prev) => ({ ...prev, duration: undefined }));
              }}
              minLength={2}
              maxLength={120}
              aria-invalid={Boolean(fieldErrors.duration)}
            />
            {fieldErrors.duration && (
              <p className="field-error-msg" role="alert">
                {fieldErrors.duration}
              </p>
            )}
          </div>
          <div className="field-block">
            <FieldLabel htmlFor="booking-remarks">Remarks (optional)</FieldLabel>
            <textarea
              id="booking-remarks"
              className={inputClass("remarks")}
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                setFieldErrors((prev) => ({ ...prev, remarks: undefined }));
              }}
              rows={3}
              maxLength={500}
              aria-invalid={Boolean(fieldErrors.remarks)}
            />
            {fieldErrors.remarks && (
              <p className="field-error-msg" role="alert">
                {fieldErrors.remarks}
              </p>
            )}
          </div>
          {error && <p className="error">{error}</p>}
          <div className="toolbar">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setStep("rooms");
                setError("");
                setFieldErrors({});
              }}
            >
              Back
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
