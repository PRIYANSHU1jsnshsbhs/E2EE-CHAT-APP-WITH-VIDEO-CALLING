package com.embarkx.e2eechatapp.payload;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Payload sent by the frontend when publishing a new message over STOMP.
 *
 * This is intentionally small: it carries the room id, sender name, and message text.
 */
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class MessageRequest {

    // The text the user typed into the chat composer.
    private String content;

    // The room the message belongs to.
    private String roomId;

    // The display name of the sender.
    private String sender;

}
