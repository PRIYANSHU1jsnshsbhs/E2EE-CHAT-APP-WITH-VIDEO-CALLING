import {
  LiveKitRoom,
  PreJoin,
  VideoConference,
  useConnectionState,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { ConnectionState as LiveKitConnectionState } from "livekit-client";

import { buildMeetingTokenRequest } from "../config/meetingHelper.js";
import useChatContext from "../context/chatContext.jsx";
import { createMeetingTokenAPI } from "../services/MeetingService.js";

function getConnectionDetails(response) {
  return {
    serverUrl: response?.serverUrl ?? response?.server_url,
    participantToken: response?.participantToken ?? response?.participant_token,
  };
}

function isPermissionDeniedError(error) {
  const message = `${error?.name ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return message.includes("notallowed") || message.includes("permission");
}

function MeetingStatusBanner() {
  const connectionState = useConnectionState();

  if (
    connectionState !== LiveKitConnectionState.Reconnecting &&
    connectionState !== LiveKitConnectionState.SignalReconnecting
  ) {
    return null;
  }

  return (
    <div
      className="absolute left-1/2 top-4 z-10 -translate-x-1/2 border border-green-500/40 bg-black/80 px-4 py-2 text-sm text-green-400"
      style={{ fontFamily: "monospace" }}
    >
      ⚠ Reconnecting to the meeting...
    </div>
  );
}

const MeetingPage = () => {
  const { roomId, currentUser, connected } = useChatContext();
  const navigate = useNavigate();

  const [meetingCredentials, setMeetingCredentials] = useState(null);
  const [joinOptions, setJoinOptions] = useState(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [requestNonce, setRequestNonce] = useState(0);

  useEffect(() => {
    if (!connected || !roomId || !currentUser) {
      navigate("/");
    }
  }, [connected, currentUser, navigate, roomId]);

  useEffect(() => {
    if (!connected || !roomId || !currentUser) return undefined;

    let isActive = true;

    async function loadMeetingCredentials() {
      setIsLoadingToken(true);
      setTokenError("");

      try {
        const requestBody = buildMeetingTokenRequest(roomId, currentUser);
        const response = await createMeetingTokenAPI(requestBody);
        const connectionDetails = getConnectionDetails(response);

        if (!connectionDetails.serverUrl || !connectionDetails.participantToken) {
          throw new Error("Meeting token response is incomplete.");
        }

        if (isActive) setMeetingCredentials(connectionDetails);
      } catch (error) {
        console.error("Error creating meeting token:", error);
        if (isActive) setTokenError("Could not prepare the meeting.");
      } finally {
        if (isActive) setIsLoadingToken(false);
      }
    }

    void loadMeetingCredentials();
    return () => { isActive = false; };
  }, [connected, currentUser, requestNonce, roomId]);

  function handlePreJoinSubmit(values) {
    if (!meetingCredentials) {
      toast.error("Meeting credentials are not ready yet.");
      return;
    }
    setJoinOptions({
      audioEnabled: values.audioEnabled,
      audioDeviceId: values.audioDeviceId,
      videoEnabled: values.videoEnabled,
      videoDeviceId: values.videoDeviceId,
      username: values.username,
    });
    toast.success("Joining meeting...");
  }

  function handleMeetingDisconnect() {
    setJoinOptions(null);
  }

  if (!connected || !roomId || !currentUser) return null;

  return (
    <div
      className="flex flex-col h-screen bg-black text-green-400"
      style={{ fontFamily: "monospace" }}
      data-lk-theme="default"
    >
      {/* Title bar */}
      <div className="border-b border-green-500/40 py-4 text-center">
        <h1
          className="text-2xl font-bold text-green-400 tracking-widest"
          style={{ fontFamily: "Orbitron, monospace" }}
        >
          Terminal Meeting Platform
        </h1>
      </div>

      {/* Room info bar */}
      <div className="flex items-center justify-between border-b border-green-500/40 px-6 py-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-300 font-bold tracking-wide">
            Meeting Room: <span className="text-green-400">{roomId}</span>
          </span>
          <span className="text-green-600 text-xs">│</span>
          <span className="text-green-600 text-xs">
            User: <span className="text-green-400">{currentUser}</span>
          </span>
        </div>

        <button
          onClick={() => navigate("/chat")}
          className="border border-green-500/50 px-3 py-1 text-xs text-green-400 hover:bg-green-500/10 transition"
        >
          ← Back to Chat
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden p-4">
        {isLoadingToken ? (
          <div className="flex h-full items-center justify-center">
            <div className="border border-green-500/30 p-8 text-center">
              <div className="mb-3 text-green-600 text-xs tracking-widest">SYSTEM</div>
              <p className="text-green-400 text-sm">_ Preparing your meeting session...</p>
              <div className="mt-4 flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block h-1.5 w-1.5 bg-green-500 animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : tokenError ? (
          <div className="flex h-full items-center justify-center">
            <div className="border border-green-500/30 p-8 text-center max-w-md w-full">
              <div className="mb-3 text-green-600 text-xs tracking-widest">ERROR</div>
              <p className="text-green-400 text-sm mb-6">⚠ {tokenError}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setRequestNonce((c) => c + 1)}
                  className="border border-green-500 px-4 py-2 text-xs text-green-400 hover:bg-green-500/10 transition"
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate("/chat")}
                  className="border border-green-500/50 px-4 py-2 text-xs text-green-400 hover:bg-green-500/10 transition"
                >
                  Back to Chat
                </button>
              </div>
            </div>
          </div>
        ) : !meetingCredentials || !joinOptions ? (
          <div className="flex h-full items-center justify-center">
            <div className="border border-green-500/30 p-8 w-full max-w-lg">
              <div className="mb-4 text-center">
                <div className="text-green-600 text-xs tracking-widest mb-1">PRE-JOIN</div>
                <p className="text-green-400 text-sm">Configure your devices before joining</p>
              </div>
              {/* LiveKit PreJoin — logic unchanged */}
              <PreJoin
                defaults={{
                  username: currentUser,
                  audioEnabled: true,
                  videoEnabled: true,
                }}
                userLabel="Display Name"
                camLabel="Camera"
                micLabel="Microphone"
                joinLabel="Join Meeting"
                persistUserChoices={true}
                onSubmit={handlePreJoinSubmit}
                onError={(error) => {
                  console.error("Pre-join error:", error);
                  setTokenError(
                    isPermissionDeniedError(error)
                      ? "Camera or microphone permission was denied. Please allow access and try again."
                      : "Camera or microphone preview failed.",
                  );
                }}
              />
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full border border-green-500/30 overflow-hidden">
            <LiveKitRoom
              serverUrl={meetingCredentials.serverUrl}
              token={meetingCredentials.participantToken}
              connect={true}
              audio={joinOptions.audioEnabled ? { deviceId: joinOptions.audioDeviceId } : false}
              video={joinOptions.videoEnabled ? { deviceId: joinOptions.videoDeviceId } : false}
              onDisconnected={handleMeetingDisconnect}
              onError={(error) => {
                console.error("LiveKit room error:", error);
                toast.error("Meeting connection failed.");
              }}
              className="h-full w-full"
              data-lk-theme="default"
            >
              <MeetingStatusBanner />
              <VideoConference />
            </LiveKitRoom>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingPage;
