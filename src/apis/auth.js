import http from "./http";

export const adminLogin = async ({ adminId, password }) => {
  const { data } = await http.post("/api/admin/login", {
    adminId,
    password,
  });

  return data; 
};
