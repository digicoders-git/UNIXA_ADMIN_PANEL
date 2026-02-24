// src/apis/dashboard.js
import http from "./http";

// GET /api/dashboard/overview  (admin overview)
export const getDashboardOverview = async () => {
  const { data } = await http.get("/api/dashboard/overview");
  return data;
};

// GET /manager-dashboard/stats (stats endpoint)
export const getDashboardStats = async () => {
  const { data } = await http.get("/manager-dashboard/stats");
  return data;
};
