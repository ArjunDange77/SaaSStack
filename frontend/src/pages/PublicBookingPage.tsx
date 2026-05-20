import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { apiErrorMessage } from "@/api/client";
import { BookingFormRoomSummary } from "@/components/pg/booking-form/BookingFormRoomSummary";
import { BookingFormSummary } from "@/components/pg/booking-form/BookingFormSummary";
import { PublicBookingForm } from "@/components/pg/booking-form/PublicBookingForm";
import { BookingListActionBar } from "@/components/pg/BookingListActionBar";
import { BookingSeatMap } from "@/components/pg/booking-seatmap/BookingSeatMap";
import { SeatMapSkeleton } from "@/components/pg/booking-seatmap/SeatMapSkeleton";
import { BookingRoomRow } from "@/components/pg/BookingRoomRow";
import { BookingStepIndicator } from "@/components/pg/BookingStepIndicator";
import { RoomCardSkeleton } from "@/components/pg/RoomCardSkeleton";
import type { RoomCardData } from "@/components/pg/RoomCard";
import {
  normalizeFormSchema,
  PUBLIC_BOOKING_FORM_FIELDS,
} from "@/config/publicBookingFormFields";
import { usePublicBookingForm } from "@/hooks/usePublicBookingForm";
import { seatmapRoomToCardData } from "@/lib/seatmapStatus";
import { mapApiErrorsToFields, normalizeIndiaPhone } from "@/lib/publicBookingValidation";
import type { PublicBookingFormFieldMeta } from "@/types/publicBookingForm";
import type { PublicSeatmapPayload, PublicSeatmapRoom } from "@/types/publicSeatmap";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const VIEW_KEY = "public-booking-view";

type Step = "rooms" | "form" | "done";
type ViewMode = "seatmap" | "list";

function initialViewMode(): ViewMode {
  try {
    const stored = sessionStorage.getItem(VIEW_KEY);
    if (stored === "list" || stored === "seatmap") return stored;
  } catch {
    /* ignore */
  }
  return "seatmap";
}

function scrollRoomsTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
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
  const [formFields, setFormFields] = useState<PublicBookingFormFieldMeta[]>(
    PUBLIC_BOOKING_FORM_FIELDS
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const bookingForm = usePublicBookingForm(formFields);

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

  const loadFormSchema = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${API_BASE}/api/pg/public/${tenantSlug}/booking-form/`
      );
      const schema = normalizeFormSchema(data);
      setFormFields(schema.fields);
    } catch {
      setFormFields(PUBLIC_BOOKING_FORM_FIELDS);
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

  useEffect(() => {
    if (step === "form") {
      loadFormSchema();
    }
  }, [step, loadFormSchema]);

  const setView = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      sessionStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* ignore */
    }
    scrollRoomsTop();
  };

  const resetBooking = () => {
    setStep("rooms");
    setSelectedSeatmapRoom(null);
    setSelectedRoom(null);
    bookingForm.reset();
    setBookingId(null);
    setError("");
    scrollRoomsTop();
    if (viewMode === "seatmap") loadSeatmap();
    else loadRooms();
  };

  const goToForm = (room: RoomCardData | null) => {
    setSelectedRoom(room);
    setStep("form");
    setError("");
    scrollRoomsTop();
  };

  const backToRooms = () => {
    setStep("rooms");
    setError("");
    bookingForm.setFieldErrors({});
    scrollRoomsTop();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientErrors = bookingForm.validate();
    if (Object.keys(clientErrors).length > 0) {
      setError("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    setError("");
    bookingForm.setFieldErrors({});
    try {
      const { data } = await axios.post<{ id: number }>(
        `${API_BASE}/api/pg/public/${tenantSlug}/booking-requests/`,
        bookingForm.buildPayload(selectedRoom?.id ?? null)
      );
      setBookingId(data.id);
      setStep("done");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const mapped = mapApiErrorsToFields(err.response.data);
        if (Object.keys(mapped).length > 0) {
          bookingForm.setFieldErrors(mapped);
          setError(apiErrorMessage(err, "Could not submit booking."));
          return;
        }
      }
      setError(apiErrorMessage(err, "Could not submit booking."));
    } finally {
      setSubmitting(false);
    }
  };

  const tenantName = seatmapData?.tenant.name ?? tenantSlug;
  const listHasSelection = viewMode === "list" && selectedRoom != null;
  const displayName = (bookingForm.values.full_name ?? "").trim();
  const displayPhone = normalizeIndiaPhone(bookingForm.values.phone ?? "");

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
            Thank you, {displayName}. We&apos;ll contact you on{" "}
            <strong>{displayPhone}</strong> within 24 hours.
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

  if (step === "rooms") {
    return (
      <div
        className={`public-booking-rooms-page${
          viewMode === "seatmap" ? " public-booking-seatmap-page" : " public-booking booking-wrap"
        }${listHasSelection ? " has-list-action-bar" : ""}`}
      >
        <header className="booking-rooms-header">
          <ViewToggle viewMode={viewMode} onChange={setView} />
          {viewMode === "list" && (
            <>
              <header className="public-booking-header">
                <h1>Book a stay</h1>
                <p className="muted">{tenantName}</p>
              </header>
              <BookingStepIndicator current={step} />
            </>
          )}
        </header>

        <div className="booking-rooms-body">
          {viewMode === "seatmap" ? (
            <>
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
            </>
          ) : (
            <>
              {loadingRooms ? (
                <div className="room-grid">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <RoomCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <>
                  <p className="muted booking-list-hint">
                    Tap a room to select. Double-tap to continue.
                  </p>
                  <div className="booking-room-list">
                    {rooms.map((room) => (
                      <BookingRoomRow
                        key={room.id}
                        room={room}
                        selected={selectedRoom?.id === room.id}
                        onSelect={() => setSelectedRoom(room)}
                        onConfirm={() => goToForm(room)}
                      />
                    ))}
                  </div>
                  {rooms.length === 0 && (
                    <div className="booking-empty">
                      <p>No beds available right now.</p>
                      <p className="muted">
                        You can still send a general request — we&apos;ll match you when a room
                        opens.
                      </p>
                      <button
                        type="button"
                        className="skip-btn ui-btn ui-btn-ghost"
                        onClick={() => goToForm(null)}
                      >
                        I&apos;ll choose a room later
                      </button>
                    </div>
                  )}
                  {rooms.length > 0 && !selectedRoom && (
                    <button
                      type="button"
                      className="skip-btn ui-btn ui-btn-ghost"
                      onClick={() => goToForm(null)}
                    >
                      I&apos;ll choose a room later
                    </button>
                  )}
                </>
              )}
              {error && <p className="error">{error}</p>}
            </>
          )}
        </div>

        {listHasSelection && selectedRoom && (
          <BookingListActionBar
            room={selectedRoom}
            onContinue={() => goToForm(selectedRoom)}
            onChooseLater={() => goToForm(null)}
            onClear={() => setSelectedRoom(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="public-booking-form-page">
      <header className="public-booking-form-header">
        <h1>Book a stay</h1>
        <p className="public-booking-form-subtitle">{tenantName}</p>
      </header>

      <BookingStepIndicator current="form" variant="mock" />

      <form onSubmit={submit} className="public-booking-form" noValidate>
        {selectedRoom && (
          <BookingFormRoomSummary room={selectedRoom} onChangeRoom={backToRooms} />
        )}

        <label className="hp-field" aria-hidden="true">
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={bookingForm.website}
            onChange={(e) => bookingForm.setWebsite(e.target.value)}
          />
        </label>

        <PublicBookingForm
          fields={formFields}
          values={bookingForm.values}
          durationScroll={bookingForm.durationScroll}
          fieldErrors={bookingForm.fieldErrors}
          onFieldChange={bookingForm.setFieldValue}
          onDurationQtyChange={bookingForm.setDurationQty}
          onDurationUnitChange={bookingForm.setDurationUnit}
        />

        <BookingFormSummary room={selectedRoom} durationScroll={bookingForm.durationScroll} />

        {error && <p className="error public-booking-form-error">{error}</p>}

        <div className="actions">
          <button type="button" className="btn-back" onClick={backToRooms}>
            Back
          </button>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit booking request"}
          </button>
        </div>
        <p className="trust-line">We&apos;ll contact you within 24 hours. No payment required now.</p>
      </form>
    </div>
  );
}
