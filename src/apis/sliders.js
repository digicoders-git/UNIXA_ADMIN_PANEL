// src/apis/sliders.js
import http from "./http";

// GET /sliders  (public list)
export const listSliders = async () => {
  const { data } = await http.get("/api/sliders");
  return Array.isArray(data) ? data : data.sliders || [];
};

// POST /sliders  (admin create, multipart/form-data)
export const createSlider = async (formData) => {
  const { data } = await http.post("/sliders", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

// PUT /sliders/:sliderId  (admin update, multipart/form-data)
export const updateSlider = async (sliderId, formData) => {
  const { data } = await http.put(`/sliders/${sliderId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

// DELETE /sliders/:sliderId  (admin delete)
export const deleteSlider = async (sliderId) => {
  const { data } = await http.delete(`/sliders/${sliderId}`);
  return data;
};
