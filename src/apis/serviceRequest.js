import http from "./http";

export const listServiceRequests = async () => {
  const { data } = await http.get("/api/admin/service-requests");
  return Array.isArray(data) ? data : [];
};

export const updateServiceRequest = async (ticketId, payload) => {
  const { data } = await http.put(`/api/admin/service-requests/${ticketId}`, payload);
  return data;
};
