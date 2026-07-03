/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import { getOrCreateUserKeys } from "../config/cryptoHelper";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  // This is the small piece of state that represents the active chat session.
  const [roomId, setRoomId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [liveKitUrl, setLiveKitUrl] = useState(null);
  const [participantToken, setParticipantToken] = useState(null);
  const [userKeys, setUserKeys] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [participants, setParticipants] = useState({});

  useEffect(() => {
    async function loadUserKeys() {
      try {
        const keys = await getOrCreateUserKeys();
        setUserKeys(keys);
        setPublicKey(keys.publicKey);
      } catch (error) {
        console.error("Failed to load user keys:", error);
      }
    }
    loadUserKeys();
  }, []);

  // Update participants when room ID changes
  useEffect(() => {
    if (!roomId) {
      setParticipants({});
    }
  }, [roomId]);
  
  
  // Shared chat session state for the active browser tab.
  const chatContextValue = {
    roomId,
    setRoomId,
    currentUser,
    setCurrentUser,
    connected,
    setConnected,
    liveKitUrl,
    setLiveKitUrl,
    participantToken,
    setParticipantToken,
    userKeys,
    publicKey,
    setPublicKey,
    participants,
    setParticipants,
  };

  return <ChatContext.Provider value={chatContextValue}>{children}</ChatContext.Provider>;
};

// Custom hook so components can read chat session state without importing useContext directly.
const useChatContext = () => useContext(ChatContext);

export default useChatContext;
