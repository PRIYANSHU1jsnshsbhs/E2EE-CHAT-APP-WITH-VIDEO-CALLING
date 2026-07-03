import { httpClient } from "../config/AxiosHelper";
import { encryptMessage, decryptMessage, getUserPublicKey } from "../config/cryptoHelper";

const ROOMS_API_PATH = "/api/v1/rooms";
const PARTICIPANTS_API_PATH = "/api/v1/participants";

// Encrypt and send message to a room
export const sendEncryptedMessage = async (roomId, messageText, roomParticipants) => {
  try {
    const senderPublicKey = getUserPublicKey();
    
    // Build encrypted message payload
    const encryptedPayload = {
      roomId,
      sender: currentUser,
      senderPublicKey,
      encryptedContent: null, // Will be filled after encryption
      timestamp: new Date().toISOString(),
    };

    // Encrypt message for each participant
    const encryptedMessages = {};
    
    for (const [participantId, participantPubKey] of Object.entries(roomParticipants)) {
      if (participantId !== currentUser) { // Don't encrypt for self (use direct encryption)
        const encrypted = await encryptMessage(messageText, participantPubKey);
        encryptedMessages[participantId] = encrypted;
      }
    }

    encryptedPayload.encryptedMessages = encryptedMessages;
    
    // Also include self-encrypted version
    const selfEncrypted = await encryptMessage(messageText, senderPublicKey);
    encryptedPayload.selfEncrypted = selfEncrypted;

    const response = await httpClient.post(`${ROOMS_API_PATH}/encrypted-message`, encryptedPayload);
    return response.data;
  } catch (error) {
    console.error("Error sending encrypted message:", error);
    throw error;
  }
};

// Decrypt received message
export const decryptReceivedMessage = async (encryptedContent, privateKeyBase64) => {
  try {
    const decrypted = await decryptMessage(encryptedContent, privateKeyBase64);
    return decrypted;
  } catch (error) {
    console.error("Error decrypting message:", error);
    return null;
  }
};

// Fetch participants for a room
export const getRoomParticipants = async (roomId) => {
  try {
    const response = await httpClient.get(`${ROOMS_API_PATH}/${roomId}/participants`);
    return response.data;
  } catch (error) {
    console.error("Error fetching room participants:", error);
    return {};
  }
};

// Register user's public key in a room
export const registerPublicKeyInRoom = async (roomId, publicKey) => {
  try {
    const response = await httpClient.post(`${ROOMS_API_PATH}/${roomId}/participants`, {
      userId: currentUser,
      publicKey,
    });
    return response.data;
  } catch (error) {
    console.error("Error registering public key:", error);
    throw error;
  }
};
