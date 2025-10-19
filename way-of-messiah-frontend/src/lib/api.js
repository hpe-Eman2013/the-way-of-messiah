// src/lib/api.js
import axios from "axios";

// If your backend is mounted at /api, set VITE_API_URL to include it, e.g.:
// VITE_API_URL=https://your-backend.com/api
export const API_BASE = (
  import.meta.env.VITE_API_URL ?? "http://localhost:10000/api"
).replace(/\/$/, "");

export const CAL_BASE = (
  import.meta.env.VITE_CAL_URL ?? `${API_BASE}/calendar`
).replace(/\/$/, "");

// Axios instance for general API calls (auth, admin, etc.)
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send cookies for admin auth if you use them
});

// Optional convenience wrapper for CRUD on /events (if you use it elsewhere)
export const eventsApi = {
  async list(params = {}) {
    const { from, to } = params;
    const path = from && to ? `/events?from=${from}&to=${to}` : `/events`;
    const { data } = await api.get(path);
    return data;
  },
  async create(payload) {
    const { data } = await api.post(`/events`, payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/events/${id}`, payload);
    return data;
  },
  async remove(id) {
    const { data } = await api.delete(`/events/${id}`);
    return data;
  },
};
