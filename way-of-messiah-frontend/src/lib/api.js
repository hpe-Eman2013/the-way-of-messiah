import axios from "axios";

export const API_BASE = (
  import.meta.env.VITE_API_URL ?? "http://localhost:10000/api"
).replace(/\/$/, "");

export const CAL_BASE = (
  import.meta.env.VITE_CAL_URL ?? `${API_BASE}/calendar`
).replace(/\/$/, "");

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export const eventsApi = {
  async list(params = {}) {
    const { from, to } = params;
    const url = from && to ? `/events?from=${from}&to=${to}` : `/events`;
    const { data } = await api.get(url);
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
