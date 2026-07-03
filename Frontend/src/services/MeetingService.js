import { httpClient } from "../config/AxiosHelper.js";

const MEETINGS_API_PATH = "/api/v1/meetings/token";

export const createMeetingTokenAPI = async (meetingDetails) => {
  // Fixed: use the app's shared Axios helper instead of a non-existent utils client.
  const response = await httpClient.post(MEETINGS_API_PATH, meetingDetails);
  return response.data;
};
