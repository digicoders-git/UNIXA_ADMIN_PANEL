// src/apis/transactions.js
import http from "./http";

// GET /api/transactions/all (admin list)
export const getAllTransactions = async () => {
  const { data } = await http.get("/api/transactions/all");
  return data.transactions || [];
};

// POST /api/transactions/create
export const createTransaction = async (transactionData) => {
    const { data } = await http.post("/api/transactions/create", transactionData);
    return data;
};
