package com.embarkx.e2eechatapp.Entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * MongoDB document representing one chat room.
 *
 * Each room stores:
 * - its database id
 * - the human-facing room id entered by users
 * - the full message history as an embedded list
 */
@Document(collection = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Room {

    // MongoDB's internal primary key for the document.
    @Id
    private String id;

    // The room code users type into the frontend to create or join a chat room.
    private String roomId;

    // Messages are embedded directly inside the room document for simple history lookup.
    private List<Message> messages = new ArrayList<>();
}
