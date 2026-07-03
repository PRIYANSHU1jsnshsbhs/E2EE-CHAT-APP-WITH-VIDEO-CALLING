import { Client } from "@stomp/stompjs";
import { useEffect, useRef, useState } from "react";
import { MdSend } from "react-icons/md";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import SockJS from "sockjs-client";

import useChatContext from "../context/chatContext.jsx";
import { getMessagesAPI, getRoomParticipants, registerPublicKeyInRoom } from "../services/RoomService.js";
import { encryptMessage, decryptMessage } from "../config/cryptoHelper.js";

// Format timestamp as [HH:MM:SS AM/PM]
function formatTimestamp(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return "[" + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + "]";
}

function getMessageTime(message) {
  return message?.timestamp ?? message?.timeStamp ?? null;
}

const ChatPage = () => {
  const {
    roomId,
    currentUser,
    connected,
    setConnected,
    setRoomId,
    setCurrentUser,
    publicKey,
    participants,
    setParticipants,
  } = useChatContext();

  const navigate = useNavigate();
  const chatBoxRef = useRef(null);
  const stompClientRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const trimmedInput = input.trim();

  useEffect(() => {
    if (!connected) {
      navigate("/");
    }
  }, [connected, navigate]);

  // Load room participants (their public keys) when joining room
  useEffect(() => {
    async function loadParticipants() {
      if (!connected || !roomId || !publicKey) return;
      try {
        const roomParticipants = await getRoomParticipants(roomId);
        setParticipants(roomParticipants);
      } catch (error) {
        console.error("Error loading participants:", error);
      }
    }
    loadParticipants();
  }, [connected, roomId, publicKey]);

  // Register user's public key when joining room
  useEffect(() => {
    async function registerPublicKey() {
      if (!connected || !roomId || !publicKey || !currentUser) return;
      try {
        await registerPublicKeyInRoom(roomId, publicKey, currentUser);
      } catch (error) {
        console.error("Error registering public key:", error);
      }
    }
    registerPublicKey();
  }, [connected, roomId, publicKey, currentUser]);

  useEffect(() => {
    async function loadMessages() {
      if (!connected || !roomId) {
        setMessages([]);
        return;
      }
      try {
        const roomMessages = await getMessagesAPI(roomId);
        const decryptedMessages = await Promise.all(
          roomMessages.map(async (msg) => {
            // Skip plaintext-only messages (no encryption fields)
            if (!msg.selfEncrypted && !msg.encryptedMessages) {
              return msg;
            }

            const userData = JSON.parse(localStorage.getItem("userCryptoKeys"));
            if (!userData?.privateKey) {
              return { ...msg, content: "[encrypted — no local key]", isEncrypted: true };
            }

            // Sender reads their self-encrypted copy
            if (msg.sender === currentUser && msg.selfEncrypted) {
              try {
                const decrypted = await decryptMessage(msg.selfEncrypted, userData.privateKey);
                return { ...msg, content: decrypted, isEncrypted: true };
              } catch {
                // Key mismatch (e.g. old session) — show placeholder
                return { ...msg, content: "[encrypted — sent in a previous session]", isEncrypted: true };
              }
            }

            // Recipient reads their per-recipient copy
            if (msg.encryptedMessages?.[currentUser]) {
              try {
                const decrypted = await decryptMessage(msg.encryptedMessages[currentUser], userData.privateKey);
                return { ...msg, content: decrypted, isEncrypted: true };
              } catch {
                return { ...msg, content: "[encrypted — key mismatch]", isEncrypted: true };
              }
            }

            // Message exists but has no copy for this user (sent before they joined)
            return { ...msg, content: "[encrypted — not addressed to you]", isEncrypted: true };
          })
        );
        setMessages(decryptedMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
        toast.error("Could not load previous messages");
      }
    }
    void loadMessages();
  }, [connected, roomId, currentUser]);

  useEffect(() => {
    if (!connected || !roomId) return undefined;

    // In dev, "/chat" is proxied by Vite to localhost:8080.
    // In production, VITE_API_BASE_URL points to the deployed backend.
    const sockJsUrl = (import.meta.env.VITE_API_BASE_URL ?? "") + "/chat";

    const client = new Client({
      webSocketFactory: () => new SockJS(sockJsUrl),
      reconnectDelay: 5000,
      onConnect: () => {
        stompClientRef.current = client;
        toast.success("Connected to chat");

        client.subscribe(`/topic/encrypted/room/${roomId}`, (messageFrame) => {
          const newMessage = JSON.parse(messageFrame.body);
          decryptMessageForCurrentUser(newMessage);
        });
      },
      onStompError: (frame) => {
        console.error("STOMP error:", frame);
        toast.error("Chat connection failed");
      },
    });

    client.activate();

    return () => {
      stompClientRef.current = null;
      client.deactivate();
    };
  }, [connected, roomId]);

  async function decryptMessageForCurrentUser(encryptedMessage) {
    const userData = JSON.parse(localStorage.getItem("userCryptoKeys"));
    if (!userData?.privateKey) return;

    let decryptedContent = "[encrypted]";

    try {
      if (encryptedMessage.sender === currentUser && encryptedMessage.selfEncrypted) {
        decryptedContent = await decryptMessage(encryptedMessage.selfEncrypted, userData.privateKey);
      } else if (encryptedMessage.encryptedMessages?.[currentUser]) {
        decryptedContent = await decryptMessage(encryptedMessage.encryptedMessages[currentUser], userData.privateKey);
      } else {
        // No copy addressed to this user — silently ignore
        return;
      }
    } catch {
      decryptedContent = "[encrypted — could not decrypt]";
    }

    setMessages((prev) => [
      ...prev,
      { ...encryptedMessage, content: decryptedContent, isEncrypted: true },
    ]);
  }

  useEffect(() => {
    if (!chatBoxRef.current) return;
    chatBoxRef.current.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!connected || !roomId || !currentUser || !trimmedInput || !publicKey || !stompClientRef.current) return;

    let roomParticipants = participants;
    try {
      const fresh = await getRoomParticipants(roomId);
      roomParticipants = fresh;
      setParticipants(fresh);
    } catch (e) {
      console.warn("Could not refresh participants, using cached copy:", e);
    }

    const encryptedMessages = {};
    for (const [participantId, participantPubKey] of Object.entries(roomParticipants)) {
      if (participantId !== currentUser) {
        try {
          encryptedMessages[participantId] = await encryptMessage(trimmedInput, participantPubKey);
        } catch (error) {
          console.error(`Error encrypting for ${participantId}:`, error);
        }
      }
    }

    let selfEncrypted = "";
    try {
      selfEncrypted = await encryptMessage(trimmedInput, publicKey);
    } catch (error) {
      console.error("Error encrypting for self:", error);
    }

    stompClientRef.current.publish({
      destination: `/app/sendEncryptedMessage/${roomId}`,
      body: JSON.stringify({
        sender: currentUser,
        senderPublicKey: publicKey,
        encryptedMessages,
        selfEncrypted,
        roomId,
      }),
    });

    setInput("");
  }

  function handleLogout() {
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }
    setConnected(false);
    setRoomId("");
    setCurrentUser("");
    navigate("/");
  }

  return (
    <div
      className="flex flex-col h-screen bg-black text-green-400"
      style={{ fontFamily: "monospace" }}
    >
      {/* Top title bar */}
      <div className="border-b border-green-500/40 py-4 text-center">
        <h1 className="text-2xl font-bold text-green-400 tracking-widest" style={{ fontFamily: "Orbitron, monospace" }}>
          Terminal Chat Platform
        </h1>
      </div>

      {/* Room info bar */}
      <div className="flex items-center justify-between border-b border-green-500/40 px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-green-300 font-bold text-sm tracking-wide">
            Chat Room: <span className="text-green-400">{roomId}</span>
          </span>
          <span className="text-green-600 text-xs">│</span>
          <span className="text-green-600 text-xs">
            User: <span className="text-green-400">{currentUser}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/meeting")}
            className="border border-green-500/50 px-3 py-1 text-xs text-green-400 hover:bg-green-500/10 transition"
          >
            Join Meeting
          </button>
          <button
            onClick={handleLogout}
            className="border border-green-500 px-3 py-1 text-xs text-green-400 hover:bg-green-500/10 transition"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Chat messages area */}
      <div
        ref={chatBoxRef}
        className="flex-1 overflow-y-auto border border-green-500/30 m-4 p-4 bg-black"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#22c55e33 transparent" }}
      >
        {messages.length === 0 && (
          <p className="text-green-700 text-sm">_ No messages yet. Start the conversation.</p>
        )}

        {messages.map((message, index) => (
          <div key={`${message.sender}-${index}`} className="leading-6 text-sm break-words">
            <span className="text-green-600">
              {formatTimestamp(getMessageTime(message))}{" "}
            </span>
            <span className={message.sender === currentUser ? "text-green-300 font-bold" : "text-green-400 font-bold"}>
              {message.sender}
            </span>
            <span className="text-green-600">: </span>
            <span className="text-green-300">{message.content}</span>
            {message.isEncrypted && (
              <span className="ml-2 text-green-700 text-xs">🔒</span>
            )}
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="border-t border-green-500/40 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
            placeholder="Type a message..."
            className="flex-1 bg-black border border-green-500/40 px-4 py-3 text-green-300 placeholder:text-green-800 text-sm focus:outline-none focus:border-green-400"
            style={{ fontFamily: "monospace" }}
          />
          <button
            onClick={sendMessage}
            disabled={!trimmedInput}
            className="border border-green-500 px-6 py-3 text-green-400 text-sm font-bold hover:bg-green-500/10 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <MdSend size={16} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
