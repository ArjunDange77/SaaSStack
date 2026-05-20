import { useMemo, useState } from "react";
import { apiErrorMessage } from "@/api/client";
import { SbPageHeader } from "@/components/school_bus/SbPageHeader";
import { useSbFeeRemind, useSbOperatorFees } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { currentMonthYm } from "@/utils/datetime";

function remindKey(feeId: number) {
  return `sb-fee-remind-${feeId}-${new Date().toISOString().slice(0, 10)}`;
}

function FeeRemindButton({ feeId }: { feeId: number }) {
  const remind = useSbFeeRemind();
  const [sent, setSent] = useState(() => localStorage.getItem(remindKey(feeId)) === "1");

  if (sent) {
    return (
      <button type="button" className="secondary" disabled>
        Sent ✓
      </button>
    );
  }

  return (
    <button
      type="button"
      className="sb-driver-btn sb-driver-btn-sm"
      disabled={remind.isPending}
      onClick={() => {
        remind.mutate(feeId, {
          onSuccess: (data) => {
            localStorage.setItem(remindKey(feeId), "1");
            setSent(true);
            if (data.whatsapp_url) window.open(data.whatsapp_url, "_blank");
          },
        });
      }}
    >
      {remind.isPending ? "Sending…" : "Send reminder"}
    </button>
  );
}

function FeeGroup({
  title,
  rows,
  showRemind,
  selected,
  onToggle,
}: {
  title: string;
  rows: { id: number; student_name: string; month: string; amount: string; days_overdue: number }[];
  showRemind?: boolean;
  selected: Set<number>;
  onToggle: (id: number) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="sb-fee-group">
      <h2>{title}</h2>
      <ul className="sb-fee-list">
        {rows.map((r) => (
          <li key={r.id} className="sb-fee-row">
            {showRemind && (
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => onToggle(r.id)}
                aria-label={`Select ${r.student_name}`}
              />
            )}
            <div>
              <strong>{r.student_name}</strong>
              <span className="muted">
                ₹{Number(r.amount).toLocaleString("en-IN")} · {r.month}
              </span>
              {r.days_overdue > 0 && (
                <span className="overdue-badge">{r.days_overdue}d overdue</span>
              )}
            </div>
            {showRemind && <FeeRemindButton feeId={r.id} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SbFees() {
  const [month, setMonth] = useState(currentMonthYm());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { data, isLoading, error } = useSbOperatorFees(month);
  const bulkRemind = useSbFeeRemind();
  useDocumentTitle("School Bus — Fees");

  const months = useMemo(() => data?.trend?.map((t) => t.month) ?? [month], [data, month]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkSend = () => {
    for (const id of selected) {
      bulkRemind.mutate(id);
    }
    setSelected(new Set());
  };

  if (isLoading) return <p className="muted">Loading fees…</p>;
  if (error) return <p className="error">{apiErrorMessage(error, "Could not load fees.")}</p>;
  if (!data) return null;

  const pct = data.summary.collection_pct;

  return (
    <div className="sb-dashboard sb-fees-page">
      <SbPageHeader title="Fees" subtitle="Collection overview" />
      <div className="fee-summary-card">
        <div className="fee-summary-header">
          <span>{data.summary.month ?? month} collection</span>
          <span>{pct}% collected</span>
        </div>
        <div className="progress-bar-large">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="fee-summary-row">
          <span>Collected ₹{Number(data.summary.collected).toLocaleString("en-IN")}</span>
          <span>Pending ₹{Number(data.summary.pending).toLocaleString("en-IN")}</span>
        </div>
        {data.trend?.map((t) => (
          <div key={t.month} className="fee-trend-row">
            <span style={{ minWidth: "4rem" }}>{t.label.split(" ")[0]}</span>
            <div className="fee-trend-bar">
              <div className="fee-trend-fill" style={{ width: `${t.collection_pct}%` }} />
            </div>
            <span>
              {t.collection_pct}% ₹{Number(t.collected).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
      <div className="sb-month-tabs" role="tablist">
        {months.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={m === month}
            className={m === month ? "active" : ""}
            onClick={() => setMonth(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <FeeGroup
        title="Overdue"
        rows={data.overdue}
        showRemind
        selected={selected}
        onToggle={toggle}
      />
      <FeeGroup
        title="Due this month"
        rows={data.due_this_month}
        showRemind
        selected={selected}
        onToggle={toggle}
      />
      <FeeGroup title="Paid" rows={data.paid} selected={selected} onToggle={toggle} />
      {selected.size > 0 && (
        <div className="sb-bulk-bar">
          <span>{selected.size} selected</span>
          <button type="button" onClick={bulkSend} disabled={bulkRemind.isPending}>
            Send reminders to all selected
          </button>
          <button type="button" className="secondary" onClick={() => setSelected(new Set())}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
