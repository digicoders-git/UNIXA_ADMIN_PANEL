
import http from "./http";

export const getCustomers = async (search = "") => {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const response = await http.get(`/api/customers${query}`);
  return response.data;
};

export const getCustomerById = async (id) => {
  const response = await http.get(`/api/customers/${id}`);
  return response.data;
};

export const createCustomer = async (data) => {
  const response = await http.post("/api/customers", data);
  return response.data;
};

export const updateCustomer = async (id, data) => {
  const response = await http.put(`/api/customers/${id}`, data);
  return response.data;
};

export const deleteCustomer = async (id) => {
  const response = await http.delete(`/api/customers/${id}`);
  return response.data;
};

export const addServiceToCustomer = async (id, data) => {
  const response = await http.post(`/api/customers/${id}/services`, data);
  return response.data;
};

export const addComplaintToCustomer = async (id, data) => {
  const response = await http.post(`/api/customers/${id}/complaints`, data);
  return response.data;
};

export const getAMCDashboard = async (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  const response = await http.get(`/api/customers/amc/dashboard?${query}`);
  return response.data;
};

export const createAMC = async (data) => {
  const response = await http.post("/api/customers/amc/new", data);
  return response.data;
};

export const renewAMC = async (id, data) => {
  const response = await http.post(`/api/customers/${id}/amc/renew`, data);
  return response.data;
};
