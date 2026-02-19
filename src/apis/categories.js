// src/apis/categories.js
import http from "./http";

// Public Get
export const getCategories = async () => {
  const { data } = await http.get("/api/categories?all=true");
  return data;
};

// Admin Add
export const createCategory = async (payload) => {
  const { data } = await http.post("/categories", payload);
  return data;
};

// Admin Update
export const updateCategory = async (idOrSlug, payload) => {
  const { data } = await http.put(`/categories/${idOrSlug}`, payload);
  return data;
};

// Admin Delete
export const deleteCategory = async (idOrSlug) => {
  const { data } = await http.delete(`/categories/${idOrSlug}`);
  return data;
};
