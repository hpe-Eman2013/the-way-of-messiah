import axios from "axios";

// If your backend is mounted at /api, set VITE_API_URL to include it, e.g.:
// VITE_API_URL=https://your-backend.com/api
export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send cookies for admin auth
  headers: { "Content-Type": "application/json" },
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