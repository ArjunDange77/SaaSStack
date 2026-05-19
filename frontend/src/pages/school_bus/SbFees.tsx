import { Link } from "react-router-dom";
import { apiErrorMessage } from "@/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSbOperatorFees } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function waUrl(phone: string, student: string, amount: string) {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(`Fee reminder for ${student}: ₹${amount}`);
  return `https://wa.me/${digits}?text=${text}`;
}

function FeeGroup({
  title,
  rows,
  showRemind,
}: {
  title: string;
  rows: { id: number; student_name: string; month: string; amount: string; days_overdue: number; parent_phone: string }[];
  showRemind?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="sb-fee-group">
      <h2>{title}</h2>
      <ul className="sb-fee-list">
        {rows.map((r) => (
          <li key={r.id} className="sb-fee-row">
            <div>
              <strong>{r.student_name}</strong>
              <span className="muted">
                ₹{r.amount} · {r.month}
                {r.days_overdue > 0 ? ` · ${r.days_overdue}d overdue` : ""}
              </span>
            </div>
            {showRemind && r.parent_phone && (
              <a
                className="sb-driver-btn sb-driver-btn-sm"
                href={waUrl(r.parent_phone, r.student_name, r.amount)}
                target="_blank"
                rel="noreferrer"
              >
                Send reminder
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SbFees() {
  const { data, isLoading, error } = useSbOperatorFees();
  useDocumentTitle("School Bus — Fees");

  if (isLoading) return <p className="muted">Loading fees…</p>;
  if (error) return <p className="error">{apiErrorMessage(error, "Could not load fees.")}</p>;
  if (!data) return null;

  return (
    <div className="sb-dashboard">
      <PageHeader title="Fees" subtitle="Collection overview" />
      <div className="sb-fee-summary">
        <span>Collected ₹{data.summary.collected}</span>
        <span>Pending ₹{data.summary.pending}</span>
        <span>{data.summary.collection_pct}% collected</span>
      </div>
      <FeeGroup title="Overdue" rows={data.overdue} showRemind />
      <FeeGroup title="Due this month" rows={data.due_this_month} showRemind />
      <FeeGroup title="Paid" rows={data.paid} />
      <p className="muted sb-quick-links">
        <Link to="/sb/dashboard">← Command center</Link>
      </p>
    </div>
  );
}
