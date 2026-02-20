import http from "./http";

export const getCertificates = async () => {
  const { data } = await http.get("/api/certificates");
  return data;
};

export const addCertificate = async (certificateData) => {
  const { data } = await http.post("/api/certificates", certificateData);
  return data;
};

export const updateCertificate = async (id, certificateData) => {
  const { data } = await http.put(`/api/certificates/${id}`, certificateData);
  return data;
};

export const deleteCertificate = async (id) => {
  const { data } = await http.delete(`/api/certificates/${id}`);
  return data;
};
