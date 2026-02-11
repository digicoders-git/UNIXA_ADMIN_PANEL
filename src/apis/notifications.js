import http from "./http";

export const getNotifications = async () => {
  const response = await http.get("/api/notifications");
  return response.data;
};

export const sendNotification = async (data) => {
  const response = await http.post("/api/notifications/send", data);
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await http.delete(`/api/notifications/${id}`);
  return response.data;
};

export const getAdminNotifications = async () => {
    const response = await http.get("/api/notifications/admin/unread");
    return response.data;
};

export const markAdminRead = async () => {
    const response = await http.put("/api/notifications/admin/mark-read");
    return response.data;
};
