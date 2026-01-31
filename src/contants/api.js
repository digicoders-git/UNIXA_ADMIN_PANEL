// src/constants/api.js

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_PREFIX = import.meta.env.VITE_API_URL || "api";

const apiRoutes = {
  employees: `${BASE_URL}/${API_PREFIX}/employees`,
};

export default apiRoutes;
