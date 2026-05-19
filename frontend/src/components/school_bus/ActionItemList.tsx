export interface ActionItem {
  type: "fee" | "absent" | "incident";
  id: number;
  title: string;
  subtitle: string;
  phone: string;
}

function waReminderUrl(phone: string, title: string) {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(`Reminder: ${title}`);
  return `https://wa.me/${digits}?text=${text}`;
}

export function ActionItemList({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return <p className="muted sb-empty-actions">Nothing needs your attention.</p>;
  }
  return (
    <div className="sb-action-list" role="list">
      {items.map((item) => (
        <div key={`${item.type}-${item.id}`} className="sb-action-list-item" role="listitem">
          <div>
            <strong>{item.title}</strong>
            <div className="muted">{item.subtitle}</div>
          </div>
          <div className="sb-action-buttons">
            {item.phone && item.type === "fee" && (
              <a
                className="sb-driver-btn sb-driver-btn-sm"
                href={waReminderUrl(item.phone, item.title)}
                target="_blank"
                rel="noreferrer"
              >
                Send reminder
              </a>
            )}
            {item.phone && item.type === "absent" && (
              <a className="sb-driver-btn sb-driver-btn-sm" href={`tel:${item.phone}`}>
                Call parent
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
