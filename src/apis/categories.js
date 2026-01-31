// src/apis/categories.js
import http from "./http";

// Public Get – GET {{baseUrl}}/api/categories
export const getCategories = async () => {
  const { data } = await http.get("/api/categories");
  return data; // expect: array of categories
};

// Admin Add – POST {{baseUrl}}/api/categories (Token via interceptor)
export const createCategory = async (payload) => {
  const { data } = await http.post("/api/categories", payload);
  return data;
};

// Admin Update – PUT {{baseUrl}}/api/categories/:idOrSlug (Token)
export const updateCategory = async (idOrSlug, payload) => {
  const { data } = await http.put(`/api/categories/${idOrSlug}`, payload);
  return data;
};

// Admin Delete – DELETE {{baseUrl}}/api/categories/:idOrSlug (Token)
export const deleteCategory = async (idOrSlug) => {
  const { data } = await http.delete(`/api/categories/${idOrSlug}`);
  return data;
};
