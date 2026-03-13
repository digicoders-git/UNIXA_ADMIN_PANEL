import http from "./http";

export const getConversations = async () => {
    const response = await http.get("/api/sms/conversations");
    return response.data;
};

export const getHistory = async (phoneNumber) => {
    const response = await http.get(`/api/sms/history/${phoneNumber}`);
    return response.data;
};

export const replyToSMS = async (data) => {
    const response = await http.post("/api/sms/reply", data);
    return response.data;
};

export const simulateIncoming = async (data) => {
    const response = await http.post("/api/sms/simulate-incoming", data);
    return response.data;
};
