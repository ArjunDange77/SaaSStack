import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { PortalCardSkeleton } from "@/components/pg/PortalCardSkeleton";

interface PortalData {
  profile: {
    id: number;
    full_name: string;
    phone: string;
    email: string;
    onboarding_status: string;
    active_status: string;
  };
  assignment: {
    id: number;
    room_number: string;
    floor: string;
    assigned_date: string;
  } | null;
  documents: { id: number; document_type: string; verification_status: string }[];
  latest_rent: {
    id: number;
    amount: string;
    due_date: string;
    paid_status: string;
  } | null;
  open_complaints: { id: number; title: string; status: string; priority: string }[];
  recent_activity: { verb: string; message: string; created_at: string }[];
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function ResidentPortal() {
  const { logout } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["resident-me"],
    queryFn: async () => {
      const { data: body } = await api.get<PortalData>("/pg/resident/me/");
      return body;
    },
  });

  if (isLoading) {
    return (
      <div className="portal-page">
        <header className="portal-header">
          <div>
            <h1>My PG</h1>
            <p className="muted">Loading…</p>
          </div>
        </header>
        <PortalCardSkeleton />
        <PortalCardSkeleton />
        <PortalCardSkeleton />
        <PortalCardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="portal-page">
        <p className="error">Could not load your profile. Please try again or sign out.</p>
        <button type="button" onClick={logout}>Sign out</button>
      </div>
    );
  }

  const greeting = firstName(data.profile.full_name);

  return (
    <div className="portal-page">
      <header className="portal-header">
        <div>
          <h1>My PG</h1>
          <p className="portal-greeting">Hi, {greeting}</p>
        </div>
        <button type="button" className="secondary" onClick={logout}>Sign out</button>
      </header>

      <section className="portal-card">
        <h2>My room</h2>
        {data.assignment ? (
          <p>
            Room <strong>{data.assignment.room_number}</strong> · Floor {data.assignment.floor}
            <br />
            <span className="muted">Since {data.assignment.assigned_date}</span>
          </p>
        ) : (
          <p className="muted">You don&apos;t have a room assigned yet. Contact the office if you need help.</p>
        )}
      </section>

      <section className="portal-card">
        <h2>My rent</h2>
        {data.latest_rent ? (
          <p>
            ₹{data.latest_rent.amount} due {data.latest_rent.due_date} ·{" "}
            <span className={`badge badge-${data.latest_rent.paid_status === "paid" ? "success" : "warning"}`}>
              {data.latest_rent.paid_status}
            </span>
          </p>
        ) : (
          <p className="muted">You&apos;re all caught up on rent — no records to show right now.</p>
        )}
      </section>

      <section className="portal-card">
        <h2>My documents</h2>
        {data.documents.length === 0 ? (
          <p className="muted">No documents uploaded yet.</p>
        ) : (
          <ul className="portal-list">
            {data.documents.map((d) => (
              <li key={d.id}>
                {d.document_type} · {d.verification_status}
              </li>
            ))}
          </ul>
        )}
        <Link to="/r/pg-documents" className="portal-link">View my documents</Link>
      </section>

      <section className="portal-card">
        <h2>My complaints</h2>
        {data.open_complaints.length === 0 ? (
          <p className="muted">No open issues — tap below if something needs fixing.</p>
        ) : (
          <ul className="portal-list">
            {data.open_complaints.map((c) => (
              <li key={c.id}>
                <strong>{c.title}</strong> · {c.status}
              </li>
            ))}
          </ul>
        )}
        <Link to="/r/pg-complaints" className="portal-link">Raise or track a complaint</Link>
      </section>

      {data.recent_activity.length > 0 && (
        <section className="portal-card">
          <h2>What&apos;s new</h2>
          <ul className="portal-list muted">
            {data.recent_activity.map((a, i) => (
              <li key={`${a.created_at}-${i}`}>{a.message || a.verb}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
