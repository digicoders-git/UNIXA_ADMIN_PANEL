// src/apis/products.js
import http from "./http";

// Public: list products – GET /api/products
export const listProducts = async () => {
  const { data } = await http.get("/api/products");
  // could be array ya { products: [...] }
  return Array.isArray(data) ? data : data.products || [];
};

// Admin: create product – POST /api/products (multipart/form-data)
export const createProduct = async (formData) => {
  const { data } = await http.post("/api/products", formData);
  return data;
};

// Admin: update product – PUT /api/products/:idOrSlug (multipart/form-data)
export const updateProduct = async (idOrSlug, formData) => {
  const { data } = await http.put(`/api/products/${idOrSlug}`, formData);
  return data;
};

// Admin: delete product – DELETE /api/products/:idOrSlug
export const deleteProduct = async (idOrSlug) => {
  const { data } = await http.delete(`/api/products/${idOrSlug}`);
  return data;
};
