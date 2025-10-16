import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { eventsApi } from "../../lib/api";
import AdminHeader from "../../components/AdminHeader";

export default function AdminEventsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await eventsApi.listEvents({
          page,
          limit: 20,
          search,
          category,
        });
        setItems(data.items || []);
        setPages(data.pages || 1);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, search, category]);

  const onDelete = async (id) => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    try {
      await eventsApi.deleteEvent(id);
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <AdminHeader />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">Admin · Events</h1>
          <Link
            to="/admin/events/new"
            className="inline-flex items-center px-3 py-2 rounded-lg bg-black text-white hover:bg-black/80"
          >
            Add Event
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mb-4">
          <div className="flex gap-2 items-center w-full md:w-auto">
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search…"
              className="w-full md:w-72 border rounded px-3 py-2"
            />
            <select
              value={category}
              onChange={(e) => {
                setPage(1);
                setCategory(e.target.value);
              }}
              className="border rounded px-3 py-2"
            >
              <option value="">All</option>
              <option value="Feast">Feast</option>
              <option value="Sabbath">Sabbath</option>
              <option value="Gathering">Gathering</option>
              <option value="Teaching">Teaching</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {loading && <p>Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">End</th>
                  <th className="p-3">Published</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id ?? e._id} className="border-t">
                    <td className="p-3 font-medium">{e.title}</td>
                    <td className="p-3">{e.category || "-"}</td>
                    <td className="p-3">
                      {e.startDate
                        ? dayjs(e.startDate).format("YYYY-MM-DD")
                        : "-"}
                    </td>
                    <td className="p-3">
                      {e.endDate ? dayjs(e.endDate).format("YYYY-MM-DD") : "-"}
                    </td>
                    <td className="p-3">{e.isPublished ? "Yes" : "No"}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() =>
                            navigate(`/admin/events/${e.id ?? e._id}`)
                          }
                          className="px-3 py-1 rounded border"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(e.id ?? e._id)}
                          className="px-3 py-1 rounded border text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            className="border rounded px-3 py-1 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span className="text-sm">
            Page {page} / {pages}
          </span>
          <button
            className="border rounded px-3 py-1 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
