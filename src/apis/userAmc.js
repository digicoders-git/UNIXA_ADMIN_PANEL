import http from "./http";

export const getAllUserAmcs = async () => {
  const { data } = await http.get("/api/my-amcs/admin/all");
  return data.amcs || [];
};

export const getUserAmcById = async (amcId) => {
  const { data } = await http.get(`/api/my-amcs/${amcId}`);
  return data.amc;
};

export const getCustomerCompleteHistory = async (customerId) => {
  const { data } = await http.get(`/api/customers/${customerId}/complete-history`);
  return data;
};

export const renewAmc = async (amcId, data) => {
  const response = await http.post(`/api/my-amcs/admin/renew/${amcId}`, data);
  return response.data;
};

export const createManualAmc = async (data) => {
  const response = await http.post(`/api/my-amcs/admin/create-manual`, data);
  return response.data;
};
