package com.embarkx.e2eechatapp.Controller;

import com.embarkx.e2eechatapp.Entity.Message;
import com.embarkx.e2eechatapp.Entity.Room;
import com.embarkx.e2eechatapp.Repository.RoomRepository;
import com.embarkx.e2eechatapp.payload.EncryptedMessageRequest;
import com.embarkx.e2eechatapp.payload.MessageRequest;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.time.LocalDateTime;

/**
 * Handles real-time chat messages sent over the STOMP/WebSocket connection.
 *
 * The frontend publishes a message to the backend, this controller stores it in MongoDB,
 * and then Spring broadcasts the saved message payload back to subscribers.
 */
@Controller
@CrossOrigin("*")
public class ChatController {
    private RoomRepository roomRepository;
    private SimpMessagingTemplate messagingTemplate;

    public ChatController(RoomRepository roomRepository, SimpMessagingTemplate messagingTemplate) {
        this.roomRepository = roomRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/sendMessage/{roomId}")
    public void sendMessage(
            @DestinationVariable String roomId,
            @Payload MessageRequest request) {
        // Look up the room document so the new message can be added to the room history.
        Room room = roomRepository.findByRoomId(roomId);

        // Build the message object that will be stored and then returned to subscribers.
        // The server sets its own timestamp so persisted messages always have a backend time.
        Message message = new Message();
        message.setContent(request.getContent());
        message.setSender(request.getSender());
        message.setTimestamp(LocalDateTime.now());

        if (room != null) {
            // Persist the new message inside the room's embedded message list.
            room.getMessages().add(message);
            roomRepository.save(room);
        } else {
            throw new RuntimeException("Room not found !!");
        }

        // Broadcast the saved message to everyone subscribed to this room.
        messagingTemplate.convertAndSend("/topic/room/" + roomId, message);
    }

    /**
     * Handles E2EE messages from the frontend.
     *
     * The frontend publishes an {@link EncryptedMessageRequest} containing one
     * ciphertext per room participant (encrypted with each recipient's RSA public key)
     * plus a self-encrypted copy so the sender can also read their own message.
     *
     * This handler persists the encrypted blobs in MongoDB and then broadcasts the
     * same payload to all subscribers — no plaintext ever touches the server.
     */
    @MessageMapping("/sendEncryptedMessage/{roomId}")
    public void sendEncryptedMessage(
            @DestinationVariable String roomId,
            @Payload EncryptedMessageRequest request) {

        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            throw new RuntimeException("Room not found: " + roomId);
        }

        Message message = new Message();
        message.setSender(request.getSender());
        message.setSenderPublicKey(request.getSenderPublicKey());
        message.setEncryptedMessages(request.getEncryptedMessages());
        message.setSelfEncrypted(request.getSelfEncrypted());
        message.setTimestamp(java.time.LocalDateTime.now());

        room.getMessages().add(message);
        roomRepository.save(room);

        // Broadcast the encrypted payload — every subscriber decrypts their own copy.
        messagingTemplate.convertAndSend("/topic/encrypted/room/" + roomId, message);
    }
}
