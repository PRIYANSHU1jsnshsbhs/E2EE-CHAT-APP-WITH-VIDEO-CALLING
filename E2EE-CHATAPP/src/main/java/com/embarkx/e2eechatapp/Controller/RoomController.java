package com.embarkx.e2eechatapp.Controller;

import com.embarkx.e2eechatapp.Entity.Message;
import com.embarkx.e2eechatapp.Entity.Room;
import com.embarkx.e2eechatapp.Repository.RoomRepository;
import com.embarkx.e2eechatapp.payload.PublicKeyRegistrationRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Exposes the HTTP endpoints used for room management and chat history lookup.
 *
 * The frontend uses these endpoints before and during a chat session:
 * - create a room
 * - confirm that a room exists before joining
 * - fetch previously saved messages
 * - manage participant public keys
 */
@RestController
@RequestMapping("/api/v1/rooms")
@CrossOrigin("*")
public class RoomController {

    private RoomRepository roomRepository;

    public RoomController(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    // Create a new room document when the provided room id does not already exist.
    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody String roomId) {
        if (roomRepository.findByRoomId(roomId) != null) {
            return ResponseEntity.badRequest().body("Room already exists");
        }

        Room room = new Room();
        room.setRoomId(roomId);
        roomRepository.save(room);
        return ResponseEntity.status(HttpStatus.CREATED).body(room);
    }

    // Return the room document so the frontend knows the room exists and can join it.
    @GetMapping("/{roomId}")
    public ResponseEntity<?> joinRoom(@PathVariable String roomId) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            return ResponseEntity.badRequest().body("Room not found!");
        }
        return ResponseEntity.ok(room);
    }

    // Load a slice of saved messages for the room.
    // Pagination is done manually because messages are stored as an embedded list
    // inside the Room document rather than in their own collection.
    @GetMapping("/{roomId}/messages")
    public ResponseEntity<List<Message>> getMessages(@PathVariable String roomId,
                                                     @RequestParam(value = "page", defaultValue = "0", required = false) int page,
                                                     @RequestParam(value = "size", defaultValue = "20", required = false) int size) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            return ResponseEntity.badRequest().build();
        }

        // Page 0 means "latest messages". The math below walks backward from the end
        // of the list and returns only the requested window.
        List<Message> messages = room.getMessages();
        int start = Math.max(0, messages.size() - (page + 1) * size);
        int end = Math.min(messages.size(), start + size);

        List<Message> paginatedMessages = messages.subList(start, end);
        return ResponseEntity.ok(paginatedMessages);
    }

    // Get all participants and their public keys for a room
    @GetMapping("/{roomId}/participants")
    public ResponseEntity<Map<String, String>> getParticipants(@PathVariable String roomId) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(room.getParticipantPublicKeys());
    }

    // Register participant's public key in a room
    @PostMapping("/{roomId}/participants")
    public ResponseEntity<?> registerPublicKey(@PathVariable String roomId, @RequestBody PublicKeyRegistrationRequest request) {
        Room room = roomRepository.findByRoomId(roomId);
        
        if (room == null) {
            return ResponseEntity.badRequest().body("Room not found!");
        }

        // Add or update participant's public key
        room.getParticipantPublicKeys().put(request.getUserId(), request.getPublicKey());
        roomRepository.save(room);

        return ResponseEntity.status(HttpStatus.CREATED).body(room.getParticipantPublicKeys());
    }

}
