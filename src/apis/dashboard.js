// src/apis/dashboard.js
import http from "./http";

// GET /api/dashboard/overview  (admin overview)
export const getDashboardOverview = async () => {
  const { data } = await http.get("/api/dashboard/overview");
  return data; // वही object जो तुमने sample में भेजा है
};
