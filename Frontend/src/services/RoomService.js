import { httpClient } from "../config/AxiosHelper";

const ROOMS_API_PATH = "/api/v1/rooms";
const DEFAULT_MESSAGE_PAGE_SIZE = 50;
const DEFAULT_MESSAGE_PAGE = 0;

export const createRoomAPI = async (roomDetails) => {
  const response = await httpClient.post(ROOMS_API_PATH, roomDetails, {
    headers: {
      "Content-Type": "application/plain",
    },
  });

  return response.data;
};

export const joinChatAPI = async (roomId) => {
  const response = await httpClient.get(`${ROOMS_API_PATH}/${roomId}`);
  return response.data;
};

export const getMessagesAPI = async (
  roomId,
  size = DEFAULT_MESSAGE_PAGE_SIZE,
  page = DEFAULT_MESSAGE_PAGE,
) => {
  const response = await httpClient.get(
    `${ROOMS_API_PATH}/${roomId}/messages?size=${size}&page=${page}`,
  );

  return response.data;
};

// Participant/PublicKey related functions
export const getRoomParticipants = async (roomId) => {
  const response = await httpClient.get(`${ROOMS_API_PATH}/${roomId}/participants`);
  return response.data;
};

export const registerPublicKeyInRoom = async (roomId, publicKey, currentUser) => {
  const response = await httpClient.post(`${ROOMS_API_PATH}/${roomId}/participants`, {
    userId: currentUser,
    publicKey,
  });
  return response.data;
};

// For backward compatibility - keep original functions
export const sendMessageAPI = async (roomId, content) => {
  const response = await httpClient.post(`${ROOMS_API_PATH}/${roomId}/messages`, {
    content,
    roomId,
  });
  return response.data;
};
