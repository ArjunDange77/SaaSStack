import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { apiErrorMessage } from "@/api/client";
import { BookingSeatMap } from "@/components/pg/booking-seatmap/BookingSeatMap";
import { SeatMapSkeleton } from "@/components/pg/booking-seatmap/SeatMapSkeleton";
import { BookingRoomRow } from "@/components/pg/BookingRoomRow";
import { BookingStepIndicator } from "@/components/pg/BookingStepIndicator";
import { RoomCard, type RoomCardData } from "@/components/pg/RoomCard";
import { RoomCardSkeleton } from "@/components/pg/RoomCardSkeleton";
import { seatmapRoomToCardData } from "@/lib/seatmapStatus";
import {
  mapApiErrorsToFields,
  normalizeIndiaPhone,
  type PublicBookingFieldErrors,
  validatePublicBookingForm,
} from "@/lib/publicBookingValidation";
import type { PublicSeatmapPayload, PublicSeatmapRoom } from "@/types/publicSeatmap";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const VIEW_KEY = "public-booking-view";

type Step = "rooms" | "form" | "done";
type ViewMode = "seatmap" | "list";

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

function initialViewMode(): ViewMode {
  try {
    const stored = sessionStorage.getItem(VIEW_KEY);
    if (stored === "list" || stored === "seatmap") return stored;
  } catch {
    /* ignore */
  }
  return "seatmap";
}

function ViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="booking-view-toggle" role="group" aria-label="Room list view">
      <button
        type="button"
        className={viewMode === "seatmap" ? "active" : ""}
        onClick={() => onChange("seatmap")}
      >
        Map view
      </button>
      <button
        type="button"
        className={viewMode === "list" ? "active" : ""}
        onClick={() => onChange("list")}
      >
        List view
      </button>
    </div>
  );
}

export function PublicBookingPage() {
  const { tenantSlug = "pg-demo" } = useParams();
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [seatmapData, setSeatmapData] = useState<PublicSeatmapPayload | null>(null);
  const [loadingSeatmap, setLoadingSeatmap] = useState(true);
  const [rooms, setRooms] = useState<RoomCardData[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [step, setStep] = useState<Step>("rooms");
  const [selectedSeatmapRoom, setSelectedSeatmapRoom] = useState<PublicSeatmapRoom | null>(null);
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

  const loadSeatmap = useCallback(async () => {
    setError("");
    setLoadingSeatmap(true);
    try {
      const { data } = await axios.get<PublicSeatmapPayload>(
        `${API_BASE}/api/pg/public/${tenantSlug}/rooms/seatmap/`
      );
      setSeatmapData(data);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not load seat map."));
    } finally {
      setLoadingSeatmap(false);
    }
  }, [tenantSlug]);

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
    if (step === "rooms" && viewMode === "seatmap") {
      loadSeatmap();
    }
  }, [step, viewMode, loadSeatmap]);

  useEffect(() => {
    if (step === "rooms" && viewMode === "list") {
      loadRooms();
    }
  }, [step, viewMode, loadRooms]);

  const setView = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      sessionStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const resetBooking = () => {
    setStep("rooms");
    setSelectedSeatmapRoom(null);
    setSelectedRoom(null);
    setFullName("");
    setPhone("");
    setDuration("");
    setRemarks("");
    setWebsite("");
    setBookingId(null);
    setError("");
    setFieldErrors({});
    if (viewMode === "seatmap") loadSeatmap();
    else loadRooms();
  };

  const goToForm = (room: RoomCardData | null) => {
    setSelectedRoom(room);
    setStep("form");
    setError("");
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

  const tenantName = seatmapData?.tenant.name ?? tenantSlug;

  if (step === "done") {
    return (
      <div className="public-booking booking-wrap">
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

  if (step === "rooms" && viewMode === "seatmap") {
    return (
      <div className="public-booking public-booking-seatmap-page">
        <ViewToggle viewMode={viewMode} onChange={setView} />
        {loadingSeatmap && <SeatMapSkeleton />}
        {!loadingSeatmap && seatmapData && (
          <BookingSeatMap
            data={seatmapData}
            selectedRoom={selectedSeatmapRoom}
            onSelectRoom={setSelectedSeatmapRoom}
            onConfirmSelection={() => {
              if (selectedSeatmapRoom) {
                goToForm(seatmapRoomToCardData(selectedSeatmapRoom));
              }
            }}
            onChooseLater={() => goToForm(null)}
          />
        )}
        {error && <p className="error seatmap-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="public-booking booking-wrap">
      {step === "rooms" && <ViewToggle viewMode={viewMode} onChange={setView} />}
      {step !== "rooms" && (
        <>
          <header className="public-booking-header">
            <h1>Book a stay</h1>
            <p className="muted">{tenantName}</p>
          </header>
          <BookingStepIndicator current={step} />
        </>
      )}

      {step === "rooms" && (
        <>
          <header className="public-booking-header">
            <h1>Book a stay</h1>
            <p className="muted">{tenantName}</p>
          </header>
          <BookingStepIndicator current={step} />
          {loadingRooms ? (
            <div className="room-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <RoomCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              <div className="booking-room-list">
                {rooms.map((room) => (
                  <BookingRoomRow
                    key={room.id}
                    room={room}
                    selected={selectedRoom?.id === room.id}
                    onSelect={() => setSelectedRoom(room)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="continue-btn"
                disabled={!selectedRoom}
                onClick={() => selectedRoom && goToForm(selectedRoom)}
              >
                Continue
              </button>
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
                className="skip-btn ui-btn ui-btn-ghost"
                onClick={() => goToForm(null)}
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
