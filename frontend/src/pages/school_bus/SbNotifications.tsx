import { Link } from "react-router-dom";
import { apiErrorMessage } from "@/api/client";
import { NotificationLogTable } from "@/components/school_bus/NotificationLogTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSbOperatorNotifications } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function SbNotifications() {
  const { data, isLoading, error } = useSbOperatorNotifications();
  useDocumentTitle("School Bus — Notifications");

  if (isLoading) return <p className="muted">Loading notifications…</p>;
  if (error) return <p className="error">{apiErrorMessage(error, "Could not load notifications.")}</p>;

  return (
    <div className="sb-dashboard">
      <PageHeader title="Notifications" subtitle="Outbound messages (demo wa.me links)" />
      <NotificationLogTable rows={data ?? []} />
      <p className="muted sb-quick-links">
        <Link to="/sb/dashboard">← Command center</Link>
      </p>
    </div>
  );
}
