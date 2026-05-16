import { useState, useRef, useEffect } from "react";
import { IconBell } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import type { PgDashboardStats } from "@/hooks/useResource";

interface Props {
  stats?: PgDashboardStats;
}

export function NotificationBell({ stats }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count =
    (stats?.pending_bookings ?? 0) +
    (stats?.rent_overdue ?? 0) +
    (stats?.open_complaints ?? 0);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="notification-bell" ref={ref}>
      <button
        type="button"
        className="secondary notification-bell-btn"
        aria-expanded={open}
        aria-label={`Notifications${count ? `, ${count} items` : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <IconBell size={18} stroke={1.75} aria-hidden />
        {count > 0 && <span className="notification-bell-count">{count}</span>}
      </button>
      {open && (
        <div className="notification-dropdown" role="menu">
          {count === 0 ? (
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
