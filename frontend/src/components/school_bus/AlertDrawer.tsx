import { useState } from "react";

export interface AlertItem {
  id: number | string;
  title: string;
  body: string;
  variant?: "default" | "incident";
}

export function AlertDrawer({ alerts }: { alerts: AlertItem[] }) {
  const [expanded, setExpanded] = useState(false);
  if (alerts.length === 0) return null;

  const first = alerts[0];
  const rest = alerts.slice(1);

  return (
    <section className="sb-alert-drawer">
      <div
        className={`sb-alert-drawer-inline sb-alert-drawer-inline--${first.variant ?? "default"}`}
      >
        <strong>{first.title}</strong>
        <p>{first.body}</p>
      </div>
      {rest.length > 0 && (
        <>
          {!expanded ? (
            <button type="button" className="sb-alert-drawer-more" onClick={() => setExpanded(true)}>
              +{rest.length} more alert{rest.length === 1 ? "" : "s"}
            </button>
          ) : (
            <div className="sb-alert-drawer-rest">
              {rest.map((a) => (
                <div
                  key={a.id}
                  className={`sb-alert-drawer-inline sb-alert-drawer-inline--${a.variant ?? "default"}`}
                >
                  <strong>{a.title}</strong>
                  <p>{a.body}</p>
                </div>
              ))}
              <button type="button" className="sb-alert-drawer-more" onClick={() => setExpanded(false)}>
                Show less
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
