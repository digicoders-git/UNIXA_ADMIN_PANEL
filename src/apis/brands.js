import http from './http';

export const listBrands = async () => {
  const { data } = await http.get('/api/brands');
  return data.brands || [];
};

export const createBrand = async (payload) => {
  const { data } = await http.post('/api/brands', payload);
  return data;
};

export const updateBrand = async (id, payload) => {
  const { data } = await http.put(`/api/brands/${id}`, payload);
  return data;
};

export const deleteBrand = async (id) => {
  const { data } = await http.delete(`/api/brands/${id}`);
  return data;
};
