export type TripStatusKey =
  | "completed"
  | "pickup_in_progress"
  | "in_progress"
  | "delayed"
  | "scheduled"
  | "cancelled"
  | "incident"
  | string;

const STATUS_CLASS: Record<string, string> = {
  completed: "status-completed",
  pickup_in_progress: "status-in-progress",
  in_progress: "status-in-progress",
  delayed: "status-delayed",
  scheduled: "status-scheduled",
  cancelled: "status-cancelled",
  incident: "status-delayed",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  pickup_in_progress: "Pickup in progress",
  in_progress: "In progress",
  delayed: "Delayed",
  scheduled: "Scheduled",
  cancelled: "Cancelled",
  incident: "Incident",
  present: "Present",
  absent: "Absent",
  not_marked: "Not marked",
  paid: "Paid",
  unpaid: "Unpaid",
  partial: "Partial",
  sent: "Sent",
  pending: "Pending",
  failed: "Failed",
  demo: "Demo",
};

export function statusBadgeClass(status: string): string {
  const key = status in STATUS_CLASS ? status : status.replace(/-/g, "_");
  return STATUS_CLASS[key] ?? "status-scheduled";
}

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}

interface Props {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: Props) {
  const cls = statusBadgeClass(status);
  const text = label ?? statusLabel(status);
  return (
    <span className={`status-badge ${cls}`}>
      <span className="status-dot" aria-hidden />
      {text}
    </span>
  );
}
