// src/apis/orders.js
import http from "./http";

// GET /api/orders  (admin list)
export const listOrders = async () => {
  const { data } = await http.get("/api/orders");
  // backend: { orders: [...] } ya direct array
  return Array.isArray(data) ? data : data.orders || [];
};

// PATCH /api/orders/:orderId/status  (admin update status)
export const updateOrderStatus = async (orderId, status) => {
  const { data } = await http.put(`/api/orders/${orderId}/status`, {
    status,
  });
  return data;
};

// Create a new offline order
export const createOfflineOrder = async (orderData) => {
  const { data } = await http.post("/api/orders", { ...orderData, source: "offline" });
  return data;
};

// DELETE /api/orders/:orderId
export const deleteOrder = async (orderId) => {
    const { data } = await http.delete(`/api/orders/${orderId}`);
    return data;
};

// PATCH /api/orders/:orderId (update details)
export const updateOrderDetails = async (orderId, details) => {
    const { data } = await http.patch(`/api/orders/${orderId}`, details);
    return data;
};
