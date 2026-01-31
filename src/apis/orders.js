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
