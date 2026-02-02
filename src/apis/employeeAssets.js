import http from "./http";

export const getAssets = async (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  const response = await http.get(`/api/employee-assets?${query}`);
  return response.data;
};

export const addAsset = async (data) => {
  const response = await http.post("/api/employee-assets", data);
  return response.data;
};

export const updateAsset = async (id, data) => {
  const response = await http.put(`/api/employee-assets/${id}`, data);
  return response.data;
};

export const deleteAsset = async (id) => {
  const response = await http.delete(`/api/employee-assets/${id}`);
  return response.data;
};

export const assignAsset = async (id, data) => {
  const response = await http.post(`/api/employee-assets/${id}/assign`, data);
  return response.data;
};

export const returnAsset = async (id, data) => {
  const response = await http.post(`/api/employee-assets/${id}/return`, data);
  return response.data;
};
