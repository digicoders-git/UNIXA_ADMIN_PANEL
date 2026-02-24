import http from "./http";

export const getAllUserAmcs = async () => {
  const { data } = await http.get("/api/my-amcs/admin/all");
  return data.amcs || [];
};

export const getUserAmcById = async (amcId) => {
  const { data } = await http.get(`/api/my-amcs/${amcId}`);
  return data.amc;
};
