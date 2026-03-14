// src/utils/tokenDebug.js
export const debugToken = () => {
  const token = localStorage.getItem("admin-token");
  const adminData = localStorage.getItem("admin-data");
  
  console.log("=== TOKEN DEBUG ===");
  console.log("Token exists:", !!token);
  console.log("Token value:", token ? token.substring(0, 20) + "..." : "null");
  console.log("Admin data exists:", !!adminData);
  console.log("Admin data:", adminData ? JSON.parse(adminData) : "null");
  console.log("==================");
  
  return { token, adminData };
};

export const clearAllAuth = () => {
  localStorage.removeItem("admin-token");
  localStorage.removeItem("admin-data");
  console.log("✅ All auth data cleared");
};
