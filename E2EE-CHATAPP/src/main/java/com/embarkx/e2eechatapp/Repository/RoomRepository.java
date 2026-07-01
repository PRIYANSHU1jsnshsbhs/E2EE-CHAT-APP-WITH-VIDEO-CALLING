package com.embarkx.e2eechatapp.Repository;

import com.embarkx.e2eechatapp.Entity.Room;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Spring Data repository for Room documents.
 *
 * Extending MongoRepository gives the project ready-made CRUD operations,
 * while the custom finder lets the app fetch rooms by their user-facing room id.
 */
public interface RoomRepository extends MongoRepository<Room, String> {

    // Find a room using the room id that users type in the frontend.
    Room findByRoomId(String roomId);
}
