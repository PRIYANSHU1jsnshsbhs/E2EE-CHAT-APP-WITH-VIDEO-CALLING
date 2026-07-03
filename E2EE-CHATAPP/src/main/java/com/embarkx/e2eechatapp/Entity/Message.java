package com.embarkx.e2eechatapp.Entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

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

    // Plaintext content (only used for non-E2EE messages).
    private String content;

    // Time the backend or client associated with the message.
    private LocalDateTime timestamp;

    // Per-recipient RSA-encrypted ciphertext: recipientUserId -> base64-encoded ciphertext.
    private Map<String, String> encryptedMessages;

    // Sender's own copy of the message encrypted with their own public key,
    // so they can decrypt and display their own sent messages.
    private String selfEncrypted;

    // The sender's public key (base64 SPKI), broadcast so late-joining
    // participants can verify who sent the message.
    private String senderPublicKey;

    public Message(String sender, String content) {
        this.sender = sender;
        this.content = content;
        timestamp = LocalDateTime.now();
    }
}
