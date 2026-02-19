import http from "./http";

// Get all employees
export const getEmployees = async () => {
  const { data } = await http.get("/api/employees");
  return data;
};

// Get my assets
export const getMyAssets = async (employeeId) => {
  const { data } = await http.get(`/api/employee-assets/my-assets/${employeeId}`);
  return data;
};

// Re-assign asset
export const reassignAsset = async (assetId, payload) => {
  const { data } = await http.post(`/api/employee-assets/${assetId}/reassign`, payload);
  return data;
};

// Create new employee
export const createEmployee = async (employeeData) => {
  const { data } = await http.post("/api/employees", employeeData);
  return data;
};

// Update employee
export const updateEmployee = async (id, employeeData) => {
  const { data } = await http.put(`/api/employees/${id}`, employeeData);
  return data;
};

// Delete employee
export const deleteEmployee = async (id) => {
  const { data } = await http.delete(`/api/employees/${id}`);
  return data;
};
