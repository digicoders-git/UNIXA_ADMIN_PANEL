import http from "./http";

export const listServiceRequests = async () => {
  const { data } = await http.get("/api/customers/complaints/all");
  return Array.isArray(data) ? data : [];
};

export const updateServiceRequest = async (ticketId, payload) => {
  const { data } = await http.put(`/api/customers/complaints/${ticketId}`, payload);
  return data;
};
