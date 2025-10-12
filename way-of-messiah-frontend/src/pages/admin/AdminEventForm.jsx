import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { eventsApi } from "../../lib/api";

dayjs.extend(utc);

function toLocalInput(dt) {
  if (!dt) return "";
  // format: yyyy-MM-ddTHH:mm for input[type=datetime-local]
  return dayjs(dt).local().format("YYYY-MM-DDTHH:mm");
}

function toUtcISOString(localValue) {
  if (!localValue) return null;
  // interpret as local time, convert to UTC ISO string for backend storage
  const m = dayjs(localValue);
  if (!m.isValid()) return null;
  return m.utc().toDate(); // let fetch/JSON stringify as ISO
}

const defaults = {
  title: "",
  description: "",
  category: "Feast",
  startDate: "",
  endDate: "",
  time: "",
  location: "",
  address: "",
  city: "",
  state: "",
  country: "",
  link: "",
  isPublished: true,
  isFeatured: false,
};

export default function AdminEventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(defaults);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const e = await eventsApi.getEvent(id);
        setForm({
          ...defaults,
          ...e,
          startDate: toLocalInput(e.startDate),
          endDate: toLocalInput(e.endDate),
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const canSave = useMemo(() => {
    if (!form.title) return false;
    if (!form.startDate) return false;
    if (form.endDate && dayjs(form.endDate).isBefore(dayjs(form.startDate)))
      return false;
    return true;
  }, [form.title, form.startDate, form.endDate]);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || "",
        category: form.category,
        startDate: toUtcISOString(form.startDate),
        endDate: form.endDate ? toUtcISOString(form.endDate) : undefined,
        time: form.time?.trim() || "",
        location: form.location?.trim() || "",
        address: form.address?.trim() || "",
        city: form.city?.trim() || "",
        state: form.state?.trim() || "",
        country: form.country?.trim() || "",
        link: form.link?.trim() || "",
        isPublished: !!form.isPublished,
        isFeatured: !!form.isFeatured,
      };

      if (isEdit) await eventsApi.updateEvent(id, payload);
      else await eventsApi.createEvent(payload);

      navigate("/admin/events");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isEdit ? "Edit Event" : "Add Event"}
        </h1>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Title *</span>
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className="border rounded px-3 py-2"
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Category</span>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="Feast">Feast</option>
                <option value="Sabbath">Sabbath</option>
                <option value="Gathering">Gathering</option>
                <option value="Teaching">Teaching</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Start (local) *</span>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                className="border rounded px-3 py-2"
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">End (local)</span>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => update("endDate", e.target.value)}
                className="border rounded px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-sm font-medium">Description</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className="border rounded px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Time (display)</span>
              <input
                value={form.time}
                onChange={(e) => update("time", e.target.value)}
                className="border rounded px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Location</span>
              <input
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                className="border rounded px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Address</span>
              <input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className="border rounded px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">City</span>
              <input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="border rounded px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">State / Province</span>
              <input
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className="border rounded px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Country</span>
              <input
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                className="border rounded px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-sm font-medium">
                Link (Zoom / livestream / details)
              </span>
              <input
                value={form.link}
                onChange={(e) => update("link", e.target.value)}
                className="border rounded px-3 py-2"
              />
            </label>
          </div>

          <div className="flex gap-6">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.isPublished}
                onChange={(e) => update("isPublished", e.target.checked)}
              />
              <span>Published</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.isFeatured}
                onChange={(e) => update("isFeatured", e.target.checked)}
              />
              <span>Featured</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={!canSave || saving}
              className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg border"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
