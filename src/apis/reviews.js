import http from "./http";

export const getAdminReviews = async () => {
  const { data } = await http.get("/api/reviews/admin/all");
  return data;
};

export const approveReview = async (id, showInSlider = false) => {
  const { data } = await http.put(`/api/reviews/admin/approve/${id}`, { showInSlider });
  return data;
};

export const deleteReview = async (id) => {
  const { data } = await http.delete(`/api/reviews/admin/${id}`);
  return data;
};
