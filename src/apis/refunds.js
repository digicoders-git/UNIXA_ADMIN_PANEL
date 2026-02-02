import http from "./http";

export const getRefunds = async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    const response = await http.get(`/api/refunds?${query}`);
    return response.data;
};

export const updateRefundStatus = async (id, data) => {
    const response = await http.put(`/api/refunds/${id}`, data);
    return response.data;
};

export const deleteRefundRequest = async (id) => {
    const response = await http.delete(`/api/refunds/${id}`);
    return response.data;
};
