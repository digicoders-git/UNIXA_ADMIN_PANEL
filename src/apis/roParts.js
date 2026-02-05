// src/apis/roParts.js
import http from "./http";

export const listRoParts = async () => {
  const { data } = await http.get("/api/ro-parts?all=true");
  return data.roParts || [];
};

export const createRoPart = async (formData) => {
  const { data } = await http.post("/api/ro-parts", formData);
  return data;
};

export const updateRoPart = async (id, formData) => {
  const { data } = await http.put(`/api/ro-parts/${id}`, formData);
  return data;
};

export const deleteRoPart = async (id) => {
  const { data } = await http.delete(`/api/ro-parts/${id}`);
  return data;
};
