import http from "./http";

export const getStockOverview = async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    const response = await http.get(`/api/stock?${query}`);
    return response.data;
};

export const updateStock = async (data) => {
    const response = await http.post("/api/stock/update", data);
    return response.data;
};

export const getStockHistory = async (id) => {
    const response = await http.get(`/api/stock/history/${id}`);
    return response.data;
};
