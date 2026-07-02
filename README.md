# E2EE Chat App

A full-stack chat application with **end-to-end encryption (E2EE)** built with Spring Boot, MongoDB, React, Vite, Tailwind CSS, SockJS, and STOMP.

This README is written for a beginner who wants to understand what each folder does, how data moves through the app, and where to start reading the code.

## ✅ End-to-End Encryption Implemented

The app now implements **true end-to-end encryption** using RSA-OAEP (2048-bit keys):

- **Key Generation**: Each user generates a unique RSA key pair on their browser using the Web Crypto API
- **Key Storage**: Private keys are stored locally in the browser (localStorage), never sent to the server
- **Key Exchange**: Public keys are shared with other participants when joining a room
- **Message Encryption**: Messages are encrypted client-side before sending
- **Message Decryption**: Only the intended recipient can decrypt messages using their private key
- **Self-Encryption**: Users can also read their own sent messages

### How E2EE Works in This App

1. When a user joins a room, a key pair is generated (or retrieved from localStorage)
2. The user's public key is registered with the room in MongoDB
3. When sending a message, it is encrypted for each participant using their public key
4. The encrypted messages are stored in MongoDB (server never sees plaintext)
5. Recipients decrypt messages using their private key
6. An "Encrypted" indicator shows on each message

## Tech Stack

### Backend
- Java 21
- Spring Boot 4.1
- Spring Web MVC
- Spring WebSocket + STOMP
- Spring Data MongoDB
- Lombok

### Frontend
- React 19
- Vite
- Tailwind CSS 4
- Axios
- SockJS
- `@stomp/stompjs`
- React Router
- React Hot Toast
- LiveKit React components for the meeting page
- Web Crypto API (built-in) for encryption

## Project Structure

```text
E2EE-CHAT-APP/
|-- README.md                        # Main beginner-friendly documentation
|-- .github/modernize/...            # Tooling/hooks, not app runtime code
|-- E2EE-CHATAPP/                    # Spring Boot backend
|   |-- pom.xml                      # Maven dependencies and build setup
|   |-- src/main/resources/
|   |   `-- application.properties   # Spring app name + MongoDB + LiveKit config
|   |-- src/main/java/com/embarkx/e2eechatapp/
|   |   |-- E2EeChatappApplication.java
|   |   |-- config/WebSocketConfig.java
|   |   |-- Controller/ChatController.java
|   |   |-- Controller/MeetingController.java
|   |   |-- Controller/RoomController.java
|   |   |-- Entity/Room.java
|   |   |-- Entity/Message.java
|   |   |-- Repository/RoomRepository.java
|   |   |-- service/MeetingTokenService.java
|   |   |-- payload/MessageRequest.java
|   |   `-- payload/PublicKeyRegistrationRequest.java
|   `-- src/test/java/...            # Spring context smoke test
|-- Frontend/                        # React frontend
|   |-- package.json                 # Frontend dependencies and scripts
|   |-- vite.config.js               # Dev server + websocket proxy config
|   |-- index.html                   # Browser entry HTML
|   `-- src/
|       |-- main.jsx                 # React bootstrap
|       |-- App.jsx                  # Home page wrapper
|       |-- App.css                  # Reserved app-level CSS
|       |-- index.css                # Tailwind entrypoint
|       |-- components/
|       |   |-- JoinCreateChat.jsx   # Room entry form
|       |   |-- ChatPage.jsx         # Main chat screen (E2EE enabled)
|       |   `-- MeetingPage.jsx      # LiveKit meeting screen
|       |-- context/chatContext.jsx  # Shared session state + keys
|       |-- services/
|       |   |-- RoomService.js       # Room REST API helpers
|       |   `-- MeetingService.js    # LiveKit token API helper
|       `-- config/
|           |-- AxiosHelper.js       # Axios base URL
|           |-- helper.js            # Relative time formatter
|           |-- cryptoHelper.js      # E2EE encryption utilities ⭐
|           |-- meetingHelper.js     # Meeting participant identity helper
|           `-- routes.jsx           # Route definitions
```

## How the App Works

At a high level, the app works like this:

### Pre-E2EE Flow (Room Creation)
1. A user enters a name and a room id on the landing page.
2. The frontend either creates a room or checks whether that room already exists.
3. If successful, the frontend generates or retrieves RSA key pair from localStorage.
4. The frontend stores the room id, user name, and keys in React context.
5. The public key is registered with the room in MongoDB.

### E2EE Chat Flow
1. The chat page opens and connects via SockJS/STOMP.
2. When a user sends a message:
   - The message is encrypted for each participant using their public keys
   - A self-encrypted copy is created using the sender's public key
   - The encrypted message is sent to the backend
3. The backend stores the encrypted message in MongoDB (never sees plaintext)
4. Recipients receive the encrypted message and decrypt it with their private key
5. Each message displays an "Encrypted" indicator

## E2EE Implementation Details

### Frontend Crypto (`src/config/cryptoHelper.js`)
The crypto module provides these functions:
- `generateKeyPair()` - Creates RSA-OAEP 2048-bit key pair
- `encryptMessage(plaintext, publicKey)` - Encrypts message for a recipient
- `decryptMessage(encryptedBase64, privateKey)` - Decrypts received message
- `getOrCreateUserKeys()` - Gets existing keys or generates new ones
- `storeUserKeys(publicKey, privateKey)` - Stores keys in localStorage
- `hashKey(publicKey)` - Creates a fingerprint for key verification

### Backend Changes
- `Room.java` - Added `participantPublicKeys` Map<String, String> field
- `RoomController.java` - Added endpoints for participant public key management:
  - `GET /api/v1/rooms/{roomId}/participants` - Get all participants' public keys
  - `POST /api/v1/rooms/{roomId}/participants` - Register your public key

### Chat Context (`src/context/chatContext.jsx`)
Extended to include:
- `userKeys` - Current user's key pair
- `publicKey` - User's public key for sharing
- `participants` - Map of other participants' public keys

### Chat Page (`src/components/ChatPage.jsx`)
Key changes:
- Loads participants' public keys on room join
- Registers user's public key with the room
- Encrypts messages before sending
- Decrypts received messages
- Shows encrypted indicator on messages

## Backend Walkthrough

### `E2EeChatappApplication.java`
This is the backend entry point. Running this class starts Spring Boot and loads:
- REST controllers
- WebSocket configuration
- MongoDB repositories
- the embedded web server

### `config/WebSocketConfig.java`
This file configures live messaging.

What it does:
- creates a websocket handshake endpoint at `/chat`
- enables SockJS fallback support
- tells Spring that client-to-server destinations start with `/app`
- tells Spring that server-to-client broadcast destinations start with `/topic`

### `Controller/RoomController.java`
This is the REST API for room management, message history, and participant keys.

Endpoints:
- `POST /api/v1/rooms` - creates a room
- `GET /api/v1/rooms/{roomId}` - checks if room exists
- `GET /api/v1/rooms/{roomId}/messages` - returns paginated messages
- `GET /api/v1/rooms/{roomId}/participants` - returns participants' public keys ⭐
- `POST /api/v1/rooms/{roomId}/participants` - registers public key ⭐

### `Controller/ChatController.java`
This controller handles live messages over STOMP.

### `Entity/Room.java`
This is the MongoDB document for a chat room.

Fields:
- `id`: MongoDB's internal id
- `roomId`: human-friendly room code
- `messages`: list of all messages (encrypted)
- `participantPublicKeys`: Map of userId -> publicKey ⭐

## Frontend Walkthrough

### `src/main.jsx`
React entry point with BrowserRouter, Toaster, and ChatProvider.

### `src/context/chatContext.jsx`
Shared session state including E2EE keys and participants.

### `src/components/ChatPage.jsx`
Main chat UI with E2EE encryption:
- Key generation/loading on startup
- Public key registration on room join
- Message encryption before sending
- Message decryption on receipt
- Encrypted indicator display

### `src/config/cryptoHelper.js` ⭐
E2EE encryption utilities using Web Crypto API:
- RSA-OAEP 2048-bit encryption
- Base64 encoding for storage/transmission
- Key generation, encryption, decryption, and hashing

## Message Flow with E2EE

```text
User types message in ChatPage
        |
        v
Generate/Load RSA Key Pair (if not exists)
        |
        v
Encrypt message for each participant using their public keys
        |
        v
Create self-encrypted copy using own public key
        |
        v
Send encrypted message to backend via STOMP
        |
        v
Backend stores encrypted message in MongoDB
        |
        v
Backend broadcasts to subscribed clients
        |
        v
Recipient decrypts message using their private key
        |
        v
Display decrypted message with "Encrypted" indicator
```

## Local Setup

## Prerequisites
- Java 21
- Node.js and npm
- MongoDB running locally on port `27017`

### 1. Start MongoDB
Make sure MongoDB is running locally.

The backend expects:
- host: `localhost`
- port: `27017`
- database: `E2EECHATAPP`

### 2. Start the backend
From `E2EE-CHATAPP`:

```powershell
.\mvnw.cmd spring-boot:run
```

Backend default URL:
- `http://localhost:8080`

### 3. Start the frontend
From `Frontend`:

```powershell
npm install
npm run dev
```

Frontend default Vite URL is usually:
- `http://localhost:5173`

## API Reference

### Create room
```http
POST /api/v1/rooms
Content-Type: application/plain
Body: my-room-id
```

### Join room / fetch room
```http
GET /api/v1/rooms/my-room-id
```

### Fetch messages
```http
GET /api/v1/rooms/my-room-id/messages?page=0&size=50
```

### Get participants' public keys ⭐
```http
GET /api/v1/rooms/my-room-id/participants
```
Response:
```json
{
  "alice": "MIIBIjANBgkqhkiG9w0BAQEF...",
  "bob": "MIIBIjANBgkqhkiG9w0BAQEF..."
}
```

### Register public key ⭐
```http
POST /api/v1/rooms/my-room-id/participants
Content-Type: application/json
Body:
{
  "userId": "alice",
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEF..."
}
```

### WebSocket / STOMP
- handshake endpoint: `/chat`
- publish destination prefix: `/app`
- subscribe destination prefix: `/topic`

### LiveKit meeting token
```http
POST /api/v1/meetings/token
Content-Type: application/json
Body:
{
  "roomName": "my-room",
  "participantIdentity": "alice-123",
  "participantName": "Alice"
}
```

## Security Considerations

- **Private keys never leave the browser** - stored in localStorage
- **Server cannot read messages** - only stores encrypted data
- **Each message is encrypted for each recipient** - ensures only intended recipients can read
- **Self-encryption allows users to read their own messages**
- **Key fingerprint can be verified** - users can compare hashKey() outputs out-of-band

## Current Limitations

- Messages are stored directly in the `Room` document (embedded)
- No authentication/authorization system
- No key rotation implemented yet
- No forward secrecy (keys persist)
- Session state lost on browser refresh (keys remain in localStorage)

## What a Beginner Should Read First

If you want to understand the code in the easiest order, read files in this sequence:

1. `Frontend/src/config/cryptoHelper.js` - Understand E2EE crypto ⭐
2. `Frontend/src/components/JoinCreateChat.jsx` - Room entry
3. `Frontend/src/context/chatContext.jsx` - Session & key management
4. `Frontend/src/components/ChatPage.jsx` - E2EE chat flow
5. `Frontend/src/services/RoomService.js` - API calls
6. `E2EE-CHATAPP/src/main/java/com/embarkx/e2eechatapp/Entity/Room.java` - Data model
7. `E2EE-CHATAPP/src/main/java/com/embarkx/e2eechatapp/Controller/RoomController.java` - REST API

## Suggested Next Improvements

1. Add key rotation for better security
2. Implement forward secrecy with ephemeral keys
3. Add message authentication (HMAC)
4. Implement key fingerprint verification UI
5. Add authentication system
6. Move messages to separate MongoDB collection
7. Add end-to-end encrypted file sharing