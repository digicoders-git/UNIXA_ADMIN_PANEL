// src/apis/enquiry.js
import http from "./http";

// GET /api/enquiry  (admin list)
export const listEnquiries = async () => {
  const { data } = await http.get("/api/enquiry");
  // backend: { enquiries: [...] } या direct array
  return Array.isArray(data) ? data : data.enquiries || [];
};

// PATCH /api/enquiry/:enquiryId  (admin update)
export const updateEnquiry = async (enquiryId, payload) => {
  const { data } = await http.put(`/api/enquiry/${enquiryId}`, payload);
  return data;
};
