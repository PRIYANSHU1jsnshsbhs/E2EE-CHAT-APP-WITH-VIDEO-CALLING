package com.embarkx.e2eechatapp.payload;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

/**
 * Payload sent by the frontend for an E2EE chat message.
 *
 * The frontend encrypts the plaintext once per recipient and once for self,
 * then sends all ciphertext blobs here. The backend stores them as-is and
 * broadcasts the payload — it never sees the plaintext.
 */
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class EncryptedMessageRequest {

    // Display name of the sender.
    private String sender;

    // Sender's RSA public key (base64 SPKI) so recipients can verify the sender.
    private String senderPublicKey;

    // Map of recipientUserId -> base64 RSA-OAEP ciphertext.
    private Map<String, String> encryptedMessages;

    // Sender's own copy encrypted with their own public key.
    private String selfEncrypted;

    // Room this message belongs to.
    private String roomId;
}
