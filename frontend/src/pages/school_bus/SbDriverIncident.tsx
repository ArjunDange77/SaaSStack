import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "@/api/client";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useSbDriverToday } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const SEVERITIES = ["low", "medium", "high"];
const CATEGORIES = ["delay", "safety", "mechanical", "other"];

function labelize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function SbDriverIncident() {
  const navigate = useNavigate();
  const { data } = useSbDriverToday();
  const [severity, setSeverity] = useState("medium");
  const [category, setCategory] = useState("delay");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useDocumentTitle("Report incident");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data?.trip_id) return;
    setSubmitting(true);
    setError("");
    try {
      const body = new FormData();
      body.append("trip", String(data.trip_id));
      body.append("severity", severity);
      body.append("category", category);
      body.append("description", description);
      if (photo) body.append("photo", photo);
      await api.post("/sb/driver/incidents/", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/sb/driver");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not submit incident."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sb-driver-page sb-driver-page--incident">
      <Breadcrumbs
        crumbs={[
          { label: "Today", to: "/sb/driver" },
          { label: "Report incident" },
        ]}
      />
      <h1>Report incident</h1>
      {!data?.trip_id ? (
        <p className="muted">Load today&apos;s trip first.</p>
      ) : (
        <form className="portal-card sb-incident-card" onSubmit={onSubmit}>
          <div className="sb-incident-field">
            <span className="sb-incident-label">Severity</span>
            <SegmentedControl
              options={SEVERITIES.map(labelize)}
              value={labelize(severity)}
              onChange={(v) => setSeverity(v.toLowerCase())}
            />
          </div>
          <div className="sb-incident-field">
            <span className="sb-incident-label">Category</span>
            <SegmentedControl
              options={CATEGORIES.map(labelize)}
              value={labelize(category)}
              onChange={(v) => setCategory(v.toLowerCase())}
            />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="photo">Photo (optional)</label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <div className="sb-incident-submit-sticky">
            <button
              type="submit"
              className="sb-driver-btn sb-driver-btn-primary"
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </form>
      )}
      <p>
        <Link to="/sb/driver">← Back to today</Link>
      </p>
    </div>
  );
}
