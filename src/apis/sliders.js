// src/apis/sliders.js
import http from "./http";

// GET /api/sliders  (public list)
export const listSliders = async () => {
  const { data } = await http.get("/api/sliders");
  // backend: { sliders: [...] } या direct array
  return Array.isArray(data) ? data : data.sliders || [];
};

// POST /api/sliders  (admin create, multipart/form-data)
export const createSlider = async (formData) => {
  const { data } = await http.post("/api/sliders", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

// PUT /api/sliders/:sliderId  (admin update, multipart/form-data)
export const updateSlider = async (sliderId, formData) => {
  const { data } = await http.put(`/api/sliders/${sliderId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

// DELETE /api/sliders/:sliderId  (admin delete)
export const deleteSlider = async (sliderId) => {
  const { data } = await http.delete(`/api/sliders/${sliderId}`);
  return data;
};
