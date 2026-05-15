import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { apiErrorMessage } from "@/api/client";
import { BookingStepIndicator } from "@/components/pg/BookingStepIndicator";
import { RoomCard, type RoomCardData } from "@/components/pg/RoomCard";
import { RoomCardSkeleton } from "@/components/pg/RoomCardSkeleton";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type Step = "rooms" | "form" | "done";

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
  const [error, setError] = useState("");
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
    setBookingId(null);
    setError("");
    loadRooms();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPhone = phone.trim();
    if (trimmedPhone.length < 10) {
      setError("Please enter a valid phone number (at least 10 digits).");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data } = await axios.post<{ id: number }>(
        `${API_BASE}/api/pg/public/${tenantSlug}/booking-requests/`,
        {
          full_name: fullName.trim(),
          phone: trimmedPhone,
          duration,
          remarks,
          preferred_room: selectedRoom?.id ?? null,
        }
      );
      setBookingId(data.id);
      setStep("done");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not submit booking."));
    } finally {
      setSubmitting(false);
    }
  };

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
            <strong>{phone.trim()}</strong> within 24 hours.
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
                className="secondary booking-skip-room"
                onClick={() => {
                  setSelectedRoom(null);
                  setStep("form");
                }}
              >
                Continue without selecting a room
              </button>
            </>
          )}
          {error && <p className="error">{error}</p>}
        </>
      )}

      {step === "form" && (
        <form onSubmit={submit} className="booking-form">
          {selectedRoom && (
            <div className="booking-selected-room">
              <p className="muted">Selected room</p>
              <RoomCard room={selectedRoom} as="div" />
            </div>
          )}
          <label>
            Full name
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            Phone
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              minLength={10}
            />
          </label>
          <label>
            Duration
            <input
              placeholder="e.g. 3 months"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
          <label>
            Remarks
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="toolbar">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setStep("rooms");
                setError("");
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
