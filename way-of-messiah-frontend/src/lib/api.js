import axios from "axios";

// If your backend is mounted at /api, set VITE_API_URL to include it, e.g.:
// VITE_API_URL=https://your-backend.com/api
// src/lib/apiBase.js (make this once)
export const API_BASE = (
  import.meta.env.VITE_API_URL ?? "http://localhost:10000/api"
).replace(/\/$/, "");
export const CAL_BASE = (
  import.meta.env.VITE_CAL_URL ?? "http://localhost:10000/api/calendar"
).replace(/\/$/, "");


export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send cookies for admin auth
  headers: { "Content-Type": "application/json" },
});
// 🔐 Attach JWT from localStorage automatically for protected routes (POST/PUT/DELETE)
api.interceptors.request.use((config) => {
  // support legacy key 'adminToken' then prefer 'jwt'
  const legacy = localStorage.getItem("adminToken");
  if (legacy && !localStorage.getItem("jwt")) {
    localStorage.setItem("jwt", legacy);
    localStorage.removeItem("adminToken");
  }
  const t = localStorage.getItem("jwt");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const eventsApi = {
  async listEvents(q = {}) {
    const params = {};
    if (q.page) params.page = q.page;
    if (q.limit) params.limit = q.limit;
    if (q.search) params.search = q.search;
    if (q.category) params.category = q.category;
    const { data } = await api.get(`/events`, { params });
    return data;
  },
  async getEvent(id) {
    const { data } = await api.get(`/events/${id}`);
    return data;
  },
  async createEvent(payload) {
    const { data } = await api.post(`/events`, payload);
    return data;
  },
  async updateEvent(id, payload) {
    const { data } = await api.put(`/events/${id}`, payload);
    return data;
  },
  async deleteEvent(id) {
    const { data } = await api.delete(`/events/${id}`);
    return data;
  },
};
