import http from "./http";

export const getDashboardSummary = async () => {
  const { data } = await http.get("/api/dashboard/summary");
  return data;
};

export const getDashboardOverview = async () => {
  const { data } = await http.get("/api/dashboard/overview");
  return data;
};
