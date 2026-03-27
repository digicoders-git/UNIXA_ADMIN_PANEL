import http from "./http";

export const getRentalPlans = async () => {
  const { data } = await http.get("/api/rental-plans");
  return data.plans;
};

export const getRentalTracking = async (params = {}) => {
  const { data } = await http.get("/api/rental-tracking", { params });
  return data;
};

export const updateRentalTracking = async (id, body) => {
  const { data } = await http.put(`/api/rental-tracking/${id}`, body);
  return data;
};

export const getRentalPlan = async (id) => {
  const { data } = await http.get(`/api/rental-plans/${id}`);
  return data.plan;
};

export const createRentalPlan = async (formData) => {
  const { data } = await http.post("/api/rental-plans", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const updateRentalPlan = async (id, formData) => {
  const { data } = await http.put(`/api/rental-plans/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const deleteRentalPlan = async (id) => {
  const { data } = await http.delete(`/api/rental-plans/${id}`);
  return data;
};
