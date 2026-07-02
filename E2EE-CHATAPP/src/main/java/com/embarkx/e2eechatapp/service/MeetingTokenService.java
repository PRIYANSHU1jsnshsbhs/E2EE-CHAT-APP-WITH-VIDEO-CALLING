package com.embarkx.e2eechatapp.service;

import com.embarkx.e2eechatapp.payload.MeetingTokenRequest;
import com.embarkx.e2eechatapp.payload.MeetingTokenResponse;
import com.embarkx.e2eechatapp.Repository.RoomRepository;
import com.embarkx.e2eechatapp.Entity.Room;
import com.embarkx.e2eechatapp.exception.MeetingException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/**
 * Generates participant tokens for LiveKit room connections.
 */
@Service
public class MeetingTokenService {

    private static final Duration TOKEN_TTL = Duration.ofMinutes(10);

    private final String liveKitUrl;
    private final String liveKitApiKey;
    private final String liveKitApiSecret;
    private final RoomRepository roomRepository;

    public MeetingTokenService(
            @Value("${livekit.url}") String liveKitUrl,
            @Value("${livekit.api-key}") String liveKitApiKey,
            @Value("${livekit.api-secret}") String liveKitApiSecret,
            RoomRepository roomRepository) {
        this.liveKitUrl = liveKitUrl;
        this.liveKitApiKey = liveKitApiKey;
        this.liveKitApiSecret = liveKitApiSecret;
        this.roomRepository = roomRepository;
    }

    public MeetingTokenResponse generateToken(MeetingTokenRequest request) {
        if (request == null) {
            throw new MeetingException("Meeting token request is required.");
        }

        String roomName = trimmedValue(request.getRoomName());
        String participantName = trimmedValue(request.getParticipantName());

        if (isBlank(roomName)) {
            throw new MeetingException("Room name is required.");
        }
        if (isBlank(participantName)) {
            throw new MeetingException("Participant name is required.");
        }

        String participantIdentity = defaultIfBlank(
                request.getParticipantIdentity(),
                "participant-" + UUID.randomUUID()
        );

        Room room = roomRepository.findByRoomId(roomName);
        if (room == null) {
            throw new MeetingException("Room not found.");
        }

        validateConfiguration();

        String participantToken = createJwt(roomName, participantIdentity, participantName);
        return new MeetingTokenResponse(liveKitUrl, participantToken);
    }

    private void validateConfiguration() {
        if (isBlank(liveKitUrl) || isBlank(liveKitApiKey) || isBlank(liveKitApiSecret)) {
            throw new IllegalStateException("LiveKit configuration is missing. Check LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.");
        }
    }

    private String createJwt(String roomName, String participantIdentity, String participantName) {
        Instant now = Instant.now();

        String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payloadJson = buildPayloadJson(roomName, participantIdentity, participantName, now);

        String encodedHeader = base64UrlEncode(headerJson);
        String encodedPayload = base64UrlEncode(payloadJson);
        String unsignedToken = encodedHeader + "." + encodedPayload;
        String signature = sign(unsignedToken, liveKitApiSecret);

        return unsignedToken + "." + signature;
    }

    private String buildPayloadJson(String roomName, String participantIdentity, String participantName, Instant now) {
        long issuedAt = now.getEpochSecond();
        long expiresAt = now.plus(TOKEN_TTL).getEpochSecond();

        return "{" +
                "\"iss\":\"" + escapeJson(liveKitApiKey) + "\"," +
                "\"sub\":\"" + escapeJson(participantIdentity) + "\"," +
                "\"nbf\":" + issuedAt + "," +
                "\"exp\":" + expiresAt + "," +
                "\"name\":\"" + escapeJson(participantName) + "\"," +
                "\"video\":{" +
                "\"roomJoin\":true," +
                "\"room\":\"" + escapeJson(roomName) + "\"" +
                "}" +
                "}";
    }

    private String escapeJson(String value) {
        StringBuilder escaped = new StringBuilder();
        for (char character : value.toCharArray()) {
            switch (character) {
                case '\\' -> escaped.append("\\\\");
                case '"' -> escaped.append("\\\"");
                case '\b' -> escaped.append("\\b");
                case '\f' -> escaped.append("\\f");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                default -> {
                    if (character < 0x20) {
                        escaped.append(String.format("\\u%04x", (int) character));
                    } else {
                        escaped.append(character);
                    }
                }
            }
        }
        return escaped.toString();
    }

    private String sign(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] signatureBytes = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signatureBytes);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to sign LiveKit participant token.", exception);
        }
    }

    private String base64UrlEncode(String value) {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private String defaultIfBlank(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim();
    }

    private String trimmedValue(String value) {
        return value == null ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
