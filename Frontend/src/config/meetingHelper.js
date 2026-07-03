export function uniqueId(currentUser) {
  const baseName = currentUser?.trim() || "guest";
  return `${baseName}-${Date.now()}`;
}

export function buildMeetingTokenRequest(roomId, currentUser) {
  const participantName = currentUser?.trim() || "Guest";

  return {
    roomName: roomId,
    participantIdentity: uniqueId(participantName),
    participantName,
  };
}
