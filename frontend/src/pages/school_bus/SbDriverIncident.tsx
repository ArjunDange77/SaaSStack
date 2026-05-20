import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "@/api/client";
import { useSbDriverToday } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

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
    if (!data) return;
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
    <div className="sb-driver-page">
      <p>
        <Link to="/sb/driver">← Today</Link>
      </p>
      <h1>Report incident</h1>
      {!data ? (
        <p className="muted">Load today&apos;s trip first.</p>
      ) : (
        <form className="sb-incident-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="severity">Severity</label>
            <select id="severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="delay, safety, …"
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
          <button type="submit" className="sb-driver-btn sb-driver-btn-primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </form>
      )}
    </div>
  );
}
