import { useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { apiErrorMessage } from "@/api/client";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

interface PublicRoom {
  id: number;
  room_number: string;
  floor: string;
  occupancy_limit: number;
  current_occupancy: number;
  room_status: string;
}

export function PublicBookingPage() {
  const { tenantSlug = "pg-demo" } = useParams();
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<"rooms" | "form" | "done">("rooms");
  const [selectedRoom, setSelectedRoom] = useState<number | "">("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [duration, setDuration] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRooms = async () => {
    setError("");
    try {
      const { data } = await axios.get<PublicRoom[]>(
        `${API_BASE}/api/pg/public/${tenantSlug}/rooms/available/`
      );
      setRooms(data);
      setLoaded(true);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not load rooms."));
    }
  };

  if (!loaded && step === "rooms") {
    return (
      <div className="public-booking">
        <h1>Book a room</h1>
        <p className="muted">Property: {tenantSlug}</p>
        <button type="button" onClick={loadRooms}>View available rooms</button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="public-booking">
        <h1>Request submitted</h1>
        <p>Thank you! The property team will contact you shortly.</p>
      </div>
    );
  }

  if (step === "rooms") {
    return (
      <div className="public-booking">
        <h1>Available rooms</h1>
        <p className="muted">Property: {tenantSlug}</p>
        <div className="room-grid">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className="room-card room-card-available"
              onClick={() => {
                setSelectedRoom(room.id);
                setStep("form");
              }}
            >
              <strong>Room {room.room_number}</strong>
              <span className="muted">Floor {room.floor}</span>
            </button>
          ))}
        </div>
        {rooms.length === 0 && <p className="muted">No rooms available right now.</p>}
        <button type="button" className="secondary" onClick={() => setStep("form")}>
          Book without selecting a room
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await axios.post(`${API_BASE}/api/pg/public/${tenantSlug}/booking-requests/`, {
        full_name: fullName,
        phone,
        duration,
        remarks,
        preferred_room: selectedRoom || null,
      });
      setStep("done");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not submit booking."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="public-booking">
      <h1>Booking request</h1>
      <form onSubmit={submit} className="booking-form">
        <label>
          Full name
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          Phone
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>
          Duration
          <input placeholder="e.g. 3 months" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </label>
        <label>
          Remarks
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="toolbar">
          <button type="button" className="secondary" onClick={() => setStep("rooms")}>
            Back
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </form>
    </div>
  );
}
