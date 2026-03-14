// src/apis/http.js
import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000
});

// Attach token for every request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin-token"); // same key as AuthContext
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

// Handle 401 responses
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired, clear it
      localStorage.removeItem("admin-token");
      localStorage.removeItem("admin-data");
      // Redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default http;
