import { useState, useRef, useEffect } from "react";
import { IconBell } from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";
import type { PgDashboardStats } from "@/hooks/useResource";

interface Props {
  stats?: PgDashboardStats;
  /** School Bus: unread outbound count */
  sbCount?: number;
  sbMode?: boolean;
}

export function NotificationBell({ stats, sbCount = 0, sbMode = false }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pgCount =
    (stats?.pending_bookings ?? 0) +
    (stats?.rent_overdue ?? 0) +
    (stats?.open_complaints ?? 0);
  const count = sbMode ? sbCount : pgCount;

  useEffect(() => {
    if (sbMode) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sbMode]);

  const onBellClick = () => {
    if (sbMode) {
      navigate("/sb/notifications");
      return;
    }
    setOpen((o) => !o);
  };

  return (
    <div className="notification-bell" ref={ref}>
      <button
        type="button"
        className="secondary notification-bell-btn"
        aria-expanded={sbMode ? undefined : open}
        aria-label={`Notifications${count ? `, ${count} items` : ""}`}
        onClick={onBellClick}
      >
        <IconBell size={18} stroke={1.75} aria-hidden />
        {count > 0 && <span className="notification-bell-count">{count}</span>}
      </button>
      {!sbMode && open && (
        <div className="notification-dropdown" role="menu">
          {pgCount === 0 ? (
            <p className="muted">No alerts right now.</p>
          ) : (
            <ul>
              {(stats?.pending_bookings ?? 0) > 0 && (
                <li>
                  <Link to="/r/pg-booking-requests?status=pending" onClick={() => setOpen(false)}>
                    {stats!.pending_bookings} pending booking
                    {stats!.pending_bookings === 1 ? "" : "s"}
                  </Link>
                </li>
              )}
              {(stats?.rent_overdue ?? 0) > 0 && (
                <li>
                  <Link to="/r/pg-rent-records?overdue=true" onClick={() => setOpen(false)}>
                    {stats!.rent_overdue} overdue rent
                  </Link>
                </li>
              )}
              {(stats?.open_complaints ?? 0) > 0 && (
                <li>
                  <Link to="/r/pg-complaints?status=open" onClick={() => setOpen(false)}>
                    {stats!.open_complaints} open complaint
                    {stats!.open_complaints === 1 ? "" : "s"}
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
