import http from "./http";

export const getAllUsers = async () => {
    const response = await http.get("/api/users");
    return response.data;
};
