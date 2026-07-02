package com.embarkx.e2eechatapp.Controller;

import com.embarkx.e2eechatapp.Entity.Message;
import com.embarkx.e2eechatapp.Entity.Room;
import com.embarkx.e2eechatapp.Repository.RoomRepository;
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
}
