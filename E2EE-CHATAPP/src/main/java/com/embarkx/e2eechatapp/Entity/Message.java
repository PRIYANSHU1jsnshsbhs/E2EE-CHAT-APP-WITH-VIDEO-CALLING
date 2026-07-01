package com.embarkx.e2eechatapp.Entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Simple message value object stored inside a Room document.
 */
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
public class Message {

    // Name of the user who sent the chat message.
    private String sender;

    // Text body of the message.
    private String content;

    // Time the backend or client associated with the message.
    private LocalDateTime timestamp;

    public Message(String sender, String content) {
        this.sender = sender;
        this.content = content;
        // Convenience constructor for quickly creating a message with the current time.
        timestamp = LocalDateTime.now();
    }
}
