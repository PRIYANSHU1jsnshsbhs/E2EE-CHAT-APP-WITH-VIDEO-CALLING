package com.embarkx.e2eechatapp.Controller;

import com.embarkx.e2eechatapp.Entity.Message;
import com.embarkx.e2eechatapp.Entity.Room;
import com.embarkx.e2eechatapp.Repository.RoomRepository;
import com.embarkx.e2eechatapp.payload.MessageRequest;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestBody;

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

    public ChatController(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    @MessageMapping("/sendMessage/{roomId}")
    @SendTo("/topic/room/{roomId}")
    public Message sendMessage(
            @DestinationVariable String roomId,
            @RequestBody MessageRequest request) {
        // Look up the room document so the new message can be added to the room history.
        Room room = roomRepository.findByRoomId(request.getRoomId());

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

        // Whatever this method returns becomes the STOMP payload sent to the destination
        // declared in @SendTo for the same room.
        return message;
    }
}
