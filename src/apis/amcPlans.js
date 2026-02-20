import http from "./http";

export const listAmcPlans = async (activeOnly = false) => {
    const query = activeOnly ? "?activeOnly=true" : "";
    const { data } = await http.get(`/api/amc-plans${query}`);
    return data.success ? data.plans : [];
};

export const createAmcPlan = async (payload) => {
    const { data } = await http.post("/api/amc-plans", payload);
    return data;
};

export const updateAmcPlan = async (id, payload) => {
    const { data } = await http.put(`/api/amc-plans/${id}`, payload);
    return data;
};

export const deleteAmcPlan = async (id) => {
    const { data } = await http.delete(`/api/amc-plans/${id}`);
    return data;
};

export const assignProductsToAmc = async (amcId, productIds) => {
    const { data } = await http.post(`/api/amc-plans/${amcId}/assign-products`, { productIds });
    return data;
};

export const getAmcProducts = async (amcId) => {
    const { data } = await http.get(`/api/amc-plans/${amcId}/products`);
    return data;
};
