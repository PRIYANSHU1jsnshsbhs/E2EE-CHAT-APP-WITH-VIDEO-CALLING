# Frontend Notes

This folder contains the React + Vite client for the chat application with **End-to-End Encryption (E2EE)**.

## E2EE Implementation

The frontend implements true end-to-end encryption using the **Web Crypto API**:

### Key Files

- **`src/config/cryptoHelper.js`** ⭐ - E2EE encryption utilities
  - `generateKeyPair()` - Creates RSA-OAEP 2048-bit key pair
  - `encryptMessage(plaintext, publicKey)` - Encrypts message for recipient
  - `decryptMessage(encryptedBase64, privateKey)` - Decrypts received message
  - `getOrCreateUserKeys()` - Gets existing keys or generates new ones
  - `storeUserKeys(publicKey, privateKey)` - Stores keys in localStorage

- **`src/context/chatContext.jsx`** - Session state management
  - Stores user keys (`userKeys`, `publicKey`)
  - Manages room participants and their public keys

- **`src/components/ChatPage.jsx`** - Main chat with E2EE
  - Loads/generates RSA key pair on startup
  - Registers public key with room on join
  - Encrypts messages before sending
  - Decrypts received messages
  - Shows encrypted indicator on messages

- **`src/services/RoomService.js`** - API calls including:
  - `getRoomParticipants(roomId)` - Fetch participants' public keys
  - `registerPublicKeyInRoom(roomId, publicKey, currentUser)` - Register your key

## How E2EE Works

1. **On First Visit**: User's browser generates an RSA key pair
2. **Key Storage**: Private key stays in localStorage, never sent to server
3. **Room Join**: Public key is registered with the room in MongoDB
4. **Sending Messages**: 
   - Message encrypted for each participant using their public keys
   - Self-encrypted copy created for reading own messages
   - Only encrypted data sent to backend
5. **Receiving Messages**:
   - Encrypted message received from WebSocket
   - Decrypted using user's private key
   - Plaintext displayed in UI

## Full Documentation

For the complete beginner-friendly explanation of:
- overall project architecture
- data flow with E2EE
- file-by-file walkthroughs
- setup steps
- security considerations

Read the root project guide:
- `../README.md`

## Useful Frontend Entry Points

- `src/main.jsx` - React bootstrap
- `src/config/cryptoHelper.js` - E2EE encryption ⭐
- `src/components/JoinCreateChat.jsx` - Room entry form
- `src/components/ChatPage.jsx` - E2EE chat screen
- `src/components/MeetingPage.jsx` - LiveKit meeting
- `src/context/chatContext.jsx` - Session & keys
- `src/services/RoomService.js` - Room API calls
- `src/services/MeetingService.js` - LiveKit token