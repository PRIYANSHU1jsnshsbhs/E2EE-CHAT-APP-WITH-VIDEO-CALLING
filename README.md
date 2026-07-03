# ENIGMATIC — End-to-End Encrypted Chat App

A full-stack, real-time chat application with **true end-to-end encryption (E2EE)** and **video meeting** support.
The server never sees your plaintext — every message is encrypted in the browser before it leaves your device.

---

## Table of Contents

1. [What This App Does](#1-what-this-app-does)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [How E2EE Works — Step by Step](#4-how-e2ee-works--step-by-step)
5. [Project Structure](#5-project-structure)
6. [Backend Deep Dive](#6-backend-deep-dive)
7. [Frontend Deep Dive](#7-frontend-deep-dive)
8. [Data Models](#8-data-models)
9. [API Reference](#9-api-reference)
10. [WebSocket / STOMP Reference](#10-websocket--stomp-reference)
11. [Prerequisites](#11-prerequisites)
12. [Running the App Locally](#12-running-the-app-locally)
13. [Configuration Reference](#13-configuration-reference)
14. [LiveKit Setup](#14-livekit-setup)
15. [Troubleshooting](#15-troubleshooting)
16. [Security Model and Threat Analysis](#16-security-model-and-threat-analysis)
17. [Known Limitations](#17-known-limitations)

---

## 1. What This App Does

ENIGMATIC is a browser-based encrypted chat platform where:

- Users create or join **named rooms** using a short room code
- All chat messages are **RSA-OAEP encrypted per recipient** before leaving the browser
- The Spring Boot backend stores and relays **only ciphertext** — it has zero ability to read messages
- Users can launch a **video/audio meeting** from inside any chat room using LiveKit WebRTC
- The UI follows a **terminal/hacker aesthetic** — black background, neon green monospace text

---

## 2. Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Java | 21 | Runtime language |
| Spring Boot | 4.1 | Application framework, embedded Tomcat |
| Spring Web MVC | included | REST API controllers |
| Spring WebSocket + STOMP | included | Real-time bi-directional messaging |
| Spring Data MongoDB | included | Repository layer for MongoDB |
| Lombok | latest | Eliminates getter/setter boilerplate |
| Maven Wrapper | included | Reproducible builds, no global Maven needed |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | Component UI framework |
| Vite | 8 | Dev server, HMR, production bundler |
| Tailwind CSS | 4 | Utility-first styling |
| Axios | latest | HTTP REST client |
| SockJS-client | latest | WebSocket with HTTP long-poll fallback |
| @stomp/stompjs | 7 | STOMP protocol over SockJS |
| React Router | 7 | Client-side page routing |
| LiveKit React | latest | Pre-built video/audio meeting UI |
| Web Crypto API | browser built-in | RSA-OAEP 2048-bit encrypt/decrypt |
| react-hot-toast | latest | Toast notifications |
| Framer Motion | latest | UI animations |

### Infrastructure
| Technology | Purpose |
|---|---|
| MongoDB | Persists rooms and embedded message history |
| LiveKit Cloud | Managed WebRTC SFU for video/audio routing |

---

## 3. Architecture Overview

```
Browser (React + Vite)
        |
        |  HTTP REST  (Axios)         --> /api/v1/rooms/**
        |  HTTP REST  (Axios)         --> /api/v1/meetings/token
        |  WebSocket  (SockJS/STOMP)  --> /chat
        |
        v
Spring Boot (port 8080)
        |
        |-- RoomController     REST: create/join rooms, get messages, manage public keys
        |-- ChatController     STOMP: receive encrypted messages, broadcast to subscribers
        |-- MeetingController  REST: generate LiveKit JWT token
        |-- MeetingTokenService  Builds and signs LiveKit JWT with HMAC-SHA256
        |
        v
MongoDB (port 27017)
  database: E2EECHATAPP
  collection: rooms
    {
      _id, roomId,
      messages: [ { sender, encryptedMessages, selfEncrypted, senderPublicKey, timestamp } ],
      participantPublicKeys: { "username": "base64-spki-public-key", ... }
    }

LiveKit Cloud (WSS)
  -- Browser connects directly to LiveKit after receiving JWT from backend
  -- Backend only mints the token; it does not proxy audio/video
```

### Request lifecycle — sending a chat message

```
1. User types message and hits Send
2. ChatPage.jsx fetches latest participant public keys from backend (GET /api/v1/rooms/{id}/participants)
3. For each participant, encryptMessage(plaintext, participantPublicKey) runs in the browser
4. A selfEncrypted copy is also created for the sender using their own public key
5. STOMP publish to /app/sendEncryptedMessage/{roomId}
6. ChatController.sendEncryptedMessage() receives the payload
7. Builds a Message entity (no plaintext field populated) and saves to MongoDB
8. messagingTemplate.convertAndSend("/topic/encrypted/room/{roomId}", message)
9. All subscribers (including sender) receive the broadcast
10. Each client calls decryptMessage() using their own private key stored in localStorage
11. Decrypted content renders in the chat window with a lock icon
```

---

## 4. How E2EE Works — Step by Step

### Key Generation
- When a user opens the app, `getOrCreateUserKeys()` in `cryptoHelper.js` checks localStorage
- If no keys exist, `generateKeyPair()` creates an **RSA-OAEP 2048-bit** key pair using `window.crypto.subtle`
- The public key is exported as **SPKI** format and base64-encoded
- The private key is exported as **PKCS8** format and base64-encoded
- Both are stored in localStorage under the key `userCryptoKeys`
- **The private key never leaves the browser. Ever.**

### Key Registration
- After joining a room, ChatPage calls `registerPublicKeyInRoom(roomId, publicKey, username)`
- This POSTs to `POST /api/v1/rooms/{roomId}/participants`
- MongoDB stores `{ username: base64PublicKey }` in the room's `participantPublicKeys` map
- Other participants can now look up this user's public key

### Sending a Message
```
plaintext = "Hello Bob"

For each participant in room (e.g. bob, carol):
    ciphertext[bob]   = RSA-OAEP-Encrypt(plaintext, bob_public_key)
    ciphertext[carol] = RSA-OAEP-Encrypt(plaintext, carol_public_key)

selfEncrypted = RSA-OAEP-Encrypt(plaintext, alice_public_key)  // alice is sender

Payload sent to backend:
{
  sender: "alice",
  senderPublicKey: "MIIBIjAN...",
  encryptedMessages: { bob: "abc...", carol: "xyz..." },
  selfEncrypted: "def...",
  roomId: "my-room"
}
```

### Receiving a Message
```
On STOMP broadcast received:

if message.sender == currentUser:
    plaintext = RSA-OAEP-Decrypt(message.selfEncrypted, myPrivateKey)
else:
    plaintext = RSA-OAEP-Decrypt(message.encryptedMessages[myUsername], myPrivateKey)

Display plaintext with lock icon.
```

### What if Decryption Fails?
- This happens when loading old messages encrypted with a different key pair
  (e.g. user cleared localStorage and got new keys)
- The app does NOT crash or throw — it shows a placeholder:
  - `[encrypted — sent in a previous session]` for your own old messages
  - `[encrypted — key mismatch]` for messages you should be able to read
  - `[encrypted — not addressed to you]` for messages sent before you joined

---

## 5. Project Structure

```
E2EE-CHAT-APP/
├── README.md
├── E2EE-CHATAPP/                          # Spring Boot backend
│   ├── pom.xml                            # Maven dependencies
│   ├── mvnw / mvnw.cmd                    # Maven wrapper scripts
│   └── src/main/
│       ├── resources/
│       │   └── application.properties     # App config (MongoDB URI, LiveKit keys)
│       └── java/com/embarkx/e2eechatapp/
│           ├── E2EeChatappApplication.java       # Main entry point
│           ├── config/
│           │   └── WebSocketConfig.java          # STOMP endpoint + broker config
│           ├── Controller/
│           │   ├── RoomController.java            # REST: rooms, messages, public keys
│           │   ├── ChatController.java            # STOMP: encrypted message handler
│           │   └── MeetingController.java         # REST: LiveKit token endpoint
│           ├── Entity/
│           │   ├── Room.java                      # MongoDB document model
│           │   └── Message.java                   # Embedded message value object
│           ├── Repository/
│           │   └── RoomRepository.java            # Spring Data MongoDB repository
│           ├── service/
│           │   └── MeetingTokenService.java       # JWT builder for LiveKit
│           ├── payload/
│           │   ├── MessageRequest.java            # Plaintext message DTO (legacy)
│           │   ├── EncryptedMessageRequest.java   # E2EE message DTO
│           │   ├── PublicKeyRegistrationRequest.java
│           │   ├── MeetingTokenRequest.java
│           │   └── MeetingTokenResponse.java
│           └── exception/
│               ├── MeetingException.java
│               └── MeetingExceptionHandler.java
│
└── Frontend/                              # React frontend
    ├── package.json
    ├── vite.config.js                     # Dev proxy config
    ├── index.html                         # Browser entry HTML
    └── src/
        ├── main.jsx                       # React bootstrap (BrowserRouter, providers)
        ├── App.jsx                        # Home page wrapper
        ├── index.css                      # Tailwind + CSS variables
        ├── config/
        │   ├── AxiosHelper.js             # Axios instance with base URL
        │   ├── cryptoHelper.js            # ALL crypto: keygen, encrypt, decrypt
        │   ├── helper.js                  # timeAgo() utility
        │   ├── meetingHelper.js           # Meeting token request builder
        │   └── routes.jsx                 # React Router route definitions
        ├── context/
        │   └── chatContext.jsx            # Global session state + user key pair
        ├── services/
        │   ├── RoomService.js             # REST calls: rooms, messages, participants
        │   └── MeetingService.js          # REST call: meeting token
        └── components/
            ├── JoinCreateChat.jsx         # Landing page — create/join room
            ├── ChatPage.jsx               # Main chat UI with E2EE
            ├── MeetingPage.jsx            # LiveKit video meeting UI
            └── ui/
                ├── particles.tsx          # Interactive particle canvas background
                └── globe.tsx              # Rotating 3D globe (cobe)
```

---

## 6. Backend Deep Dive

### `E2EeChatappApplication.java`
The Spring Boot entry point. Running `main()` starts the embedded Tomcat server,
bootstraps the application context, and wires all beans automatically.

---

### `config/WebSocketConfig.java`
Configures all WebSocket/STOMP infrastructure.

```java
registry.addEndpoint("/chat")
    .setAllowedOrigins("http://localhost:3000", "http://localhost:5173", "http://localhost:8080")
    .withSockJS();
```
- Browsers connect to `/chat` for the STOMP handshake
- SockJS provides fallback transports (XHR streaming, long-polling) for environments where raw WebSockets are blocked

```java
config.enableSimpleBroker("/topic");
config.setApplicationDestinationPrefixes("/app");
```
- Messages from client → server must be published to destinations starting with `/app`
- Messages from server → client are broadcast on `/topic/**` destinations

---

### `Controller/RoomController.java`
Handles all room lifecycle and key management over REST.

| Method | Path | Description |
|---|---|---|
| POST | /api/v1/rooms | Create a new room |
| GET | /api/v1/rooms/{roomId} | Get room (confirm it exists before joining) |
| GET | /api/v1/rooms/{roomId}/messages | Paginated message history |
| GET | /api/v1/rooms/{roomId}/participants | Get all participant public keys |
| POST | /api/v1/rooms/{roomId}/participants | Register your public key |

Pagination for messages is done in-memory because messages are embedded inside the Room document.
The math: `start = messages.size() - (page+1)*size`, `end = start + size`.

---

### `Controller/ChatController.java`
Handles real-time STOMP messages.

**`@MessageMapping("/sendEncryptedMessage/{roomId}")`**
- Receives `EncryptedMessageRequest` (sender, senderPublicKey, encryptedMessages map, selfEncrypted, roomId)
- Builds a `Message` entity — note: `content` field is left null (no plaintext ever stored)
- Saves to MongoDB inside the room's messages list
- Broadcasts to `/topic/encrypted/room/{roomId}`

---

### `Controller/MeetingController.java`
Single endpoint: `POST /api/v1/meetings/token`
Delegates to `MeetingTokenService` to mint a LiveKit JWT and returns `{ server_url, participant_token }`.

---

### `service/MeetingTokenService.java`
Builds a LiveKit-compatible JWT entirely from scratch using `javax.crypto.Mac` (HMAC-SHA256).
No LiveKit server SDK is used — the JWT is hand-crafted:
```
header  = base64url({ "alg": "HS256", "typ": "JWT" })
payload = base64url({ iss, sub, nbf, exp, name, video: { roomJoin: true, room } })
signature = HMAC-SHA256(header + "." + payload, livekit_api_secret)
token = header + "." + payload + "." + signature
```
Tokens are valid for **10 minutes**. The service validates that the requested room exists in MongoDB before issuing a token.

---

### `Entity/Room.java`
MongoDB document (`@Document(collection = "rooms")`).

| Field | Type | Description |
|---|---|---|
| id | String | MongoDB ObjectId (internal) |
| roomId | String | Human-facing room code |
| messages | List<Message> | All messages embedded in the document |
| participantPublicKeys | Map<String,String> | username -> base64 SPKI public key |

---

### `Entity/Message.java`
Value object embedded inside Room.

| Field | Type | Description |
|---|---|---|
| sender | String | Display name of the sender |
| content | String | Plaintext — only used for legacy non-E2EE messages |
| timestamp | LocalDateTime | Set by the server at receive time |
| encryptedMessages | Map<String,String> | recipientUsername -> base64 RSA ciphertext |
| selfEncrypted | String | Sender's own encrypted copy (base64) |
| senderPublicKey | String | Sender's public key — lets recipients verify sender identity |

---

## 7. Frontend Deep Dive

### `src/main.jsx`
Bootstraps React with three wrapping providers:
- `BrowserRouter` — enables React Router navigation
- `Toaster` — global toast notification layer
- `ChatProvider` — provides shared session state (room, user, keys) to all components

---

### `src/context/chatContext.jsx`
The global state store. Holds:

| State | Type | Description |
|---|---|---|
| roomId | string | The active room code |
| currentUser | string | The user's chosen display name |
| connected | boolean | Whether the user has successfully joined a room |
| userKeys | object | `{ publicKey, privateKey }` — the RSA key pair |
| publicKey | string | Base64 SPKI public key (shared with others) |
| participants | object | `{ username: publicKey }` map of room members |
| liveKitUrl | string | LiveKit server WSS URL for the current meeting |
| participantToken | string | LiveKit JWT for the current meeting |

On mount, `useEffect` calls `getOrCreateUserKeys()` to hydrate the key pair from localStorage.

---

### `src/config/cryptoHelper.js`
All cryptographic operations live here. Uses only the browser's native `window.crypto.subtle`.

| Function | Description |
|---|---|
| `generateKeyPair()` | Generates RSA-OAEP 2048-bit key pair, returns `{ publicKey, privateKey }` as base64 strings |
| `encryptMessage(plaintext, publicKeyBase64)` | Imports public key, encrypts with RSA-OAEP SHA-256, returns base64 ciphertext |
| `decryptMessage(encryptedBase64, privateKeyBase64)` | Imports private key, decrypts, returns plaintext string |
| `getOrCreateUserKeys()` | Checks localStorage, generates new keys if none exist |
| `storeUserKeys(pub, priv)` | Saves keys to localStorage as JSON |
| `getUserPublicKey()` | Returns just the public key from localStorage |
| `clearUserKeys()` | Wipes key pair from localStorage |
| `hashKey(publicKeyBase64)` | SHA-256 fingerprint of a public key (hex) — for out-of-band verification |
| `bufferToBase64(buffer)` | Converts ArrayBuffer to base64 string |
| `base64ToBuffer(base64)` | Converts base64 string to ArrayBuffer |

---

### `src/components/JoinCreateChat.jsx`
The landing page (`/`).
- Input fields for Username and Room ID
- **Join Room**: calls `GET /api/v1/rooms/{roomId}` — fails if room doesn't exist
- **Create Room**: calls `POST /api/v1/rooms` with the room ID as plain-text body — fails if room already exists
- On success, sets `roomId`, `currentUser`, `connected` in context and navigates to `/chat`

---

### `src/components/ChatPage.jsx`
The main chat screen (`/chat`). On mount:

1. Redirects to `/` if not connected
2. `GET /api/v1/rooms/{roomId}/participants` — loads existing participant public keys
3. `POST /api/v1/rooms/{roomId}/participants` — registers own public key
4. `GET /api/v1/rooms/{roomId}/messages` — loads message history, decrypts each one
5. Opens STOMP connection via SockJS, subscribes to `/topic/encrypted/room/{roomId}`

On Send:
1. Fetches latest participants (to pick up anyone who joined after initial load)
2. Encrypts message for each participant individually
3. Encrypts a self-copy
4. Publishes to `/app/sendEncryptedMessage/{roomId}`

On STOMP message received:
- Calls `decryptMessageForCurrentUser()` which reads the private key from localStorage
- Appends decrypted message to the messages list
- If decryption fails (key mismatch), shows a readable placeholder instead of crashing

---

### `src/components/MeetingPage.jsx`
The video meeting screen (`/meeting`). On mount:
1. Redirects to `/` if not connected
2. Calls `POST /api/v1/meetings/token` with room name, participant identity, participant name
3. Receives `{ server_url, participant_token }`
4. Renders LiveKit `<PreJoin>` for camera/mic device selection
5. On pre-join submit, renders `<LiveKitRoom>` + `<VideoConference>` with credentials
6. Shows a `MeetingStatusBanner` overlay when reconnecting

---

### `vite.config.js`
Proxies two path prefixes during development so the browser sees everything on one origin:

```js
"/chat" -> "http://localhost:8080"  (ws: true — proxies WebSocket upgrades too)
"/api"  -> "http://localhost:8080"
```

This means you never have to worry about CORS during local development.
In production you would configure a reverse proxy (nginx, AWS ALB, etc.) to do the same.

---

## 8. Data Models

### Room document (MongoDB)
```json
{
  "_id": "68a1f0c2b3d4e5f6a7b8c9d0",
  "roomId": "my-secret-room",
  "messages": [
    {
      "sender": "alice",
      "content": null,
      "timestamp": "2025-07-04T14:30:00",
      "encryptedMessages": {
        "bob": "MIIB...base64-ciphertext-for-bob...",
        "carol": "MIIB...base64-ciphertext-for-carol..."
      },
      "selfEncrypted": "MIIB...base64-ciphertext-for-alice-self...",
      "senderPublicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ..."
    }
  ],
  "participantPublicKeys": {
    "alice": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ...",
    "bob":   "MIIBIjANBgkqhkiG9w0BAQEFAAOCAg...",
    "carol": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAh..."
  }
}
```

### localStorage schema (browser)
```json
{
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ...",
  "privateKey": "MIIEvQIBADANBgkqhkiG9w0BAQEFAA...",
  "createdAt": "2025-07-04T12:00:00.000Z"
}
```
Key name: `userCryptoKeys`

---

## 9. API Reference

### Create a room
```http
POST /api/v1/rooms
Content-Type: application/plain

my-room-id
```
Response `201 Created`:
```json
{ "_id": "...", "roomId": "my-room-id", "messages": [], "participantPublicKeys": {} }
```
Response `400 Bad Request` if room already exists: `"Room already exists"`

---

### Get / join a room
```http
GET /api/v1/rooms/my-room-id
```
Response `200 OK`: full Room document
Response `400 Bad Request`: `"Room not found!"`

---

### Get message history (paginated)
```http
GET /api/v1/rooms/my-room-id/messages?page=0&size=50
```
- `page` defaults to `0` (most recent window)
- `size` defaults to `20`
- Pages walk backward from the end of the embedded list

Response `200 OK`: array of Message objects

---

### Get participant public keys
```http
GET /api/v1/rooms/my-room-id/participants
```
Response `200 OK`:
```json
{
  "alice": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ...",
  "bob":   "MIIBIjANBgkqhkiG9w0BAQEFAAOCAg..."
}
```

---

### Register your public key
```http
POST /api/v1/rooms/my-room-id/participants
Content-Type: application/json

{
  "userId": "alice",
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ..."
}
```
Response `201 Created`: full `participantPublicKeys` map

---

### Generate a LiveKit meeting token
```http
POST /api/v1/meetings/token
Content-Type: application/json

{
  "roomName": "my-room-id",
  "participantIdentity": "alice-1720094400000",
  "participantName": "alice"
}
```
Response `201 Created`:
```json
{
  "server_url": "wss://your-project.livekit.cloud",
  "participant_token": "eyJhbGci..."
}
```
Response `400 Bad Request` if room does not exist: `{ "error": "Room not found." }`

---

## 10. WebSocket / STOMP Reference

### Connection
```
URL:       http://localhost:5173/chat   (Vite proxies to http://localhost:8080/chat)
Transport: SockJS with WebSocket preferred, long-poll fallback
```

### Client → Server (publish)

| Destination | Payload type | Description |
|---|---|---|
| `/app/sendEncryptedMessage/{roomId}` | `EncryptedMessageRequest` JSON | Send an E2EE message |
| `/app/sendMessage/{roomId}` | `MessageRequest` JSON | Legacy plaintext message (not used by current UI) |

**EncryptedMessageRequest shape:**
```json
{
  "sender": "alice",
  "senderPublicKey": "MIIBIjAN...",
  "encryptedMessages": {
    "bob": "base64-ciphertext",
    "carol": "base64-ciphertext"
  },
  "selfEncrypted": "base64-ciphertext",
  "roomId": "my-room-id"
}
```

### Server → Client (subscribe)

| Destination | Payload type | Description |
|---|---|---|
| `/topic/encrypted/room/{roomId}` | `Message` JSON | Broadcast of saved encrypted message |
| `/topic/room/{roomId}` | `Message` JSON | Legacy plaintext broadcast |

**Message broadcast shape:**
```json
{
  "sender": "alice",
  "content": null,
  "timestamp": "2025-07-04T14:30:00",
  "encryptedMessages": { "bob": "..." },
  "selfEncrypted": "...",
  "senderPublicKey": "MIIBIjAN..."
}
```

---

## 11. Prerequisites

Before running anything, make sure these are installed:

### Java 21
```
java -version
# Must show: openjdk 21 or similar
```
Download: https://adoptium.net/temurin/releases/?version=21

### Node.js 18+ and npm
```
node -v   # v18.x or higher
npm -v    # 9.x or higher
```
Download: https://nodejs.org/en/download

### MongoDB 6+ (Community Edition)
```
mongod --version
# mongod v6.x or v7.x
```
Download: https://www.mongodb.com/try/download/community
MongoDB must be running on `localhost:27017` with no authentication for default config.

### A LiveKit account (for video meetings only)
Free tier available at https://livekit.io — see [Section 14](#14-livekit-setup).
Chat works without LiveKit. Meeting page will show an error if keys are not configured.

---

## 12. Running the App Locally

### Step 1 — Start MongoDB

**Windows (if installed as a service):**
```cmd
net start MongoDB
```

**Windows (manual):**
```cmd
mongod --dbpath C:\data\db
```

**macOS / Linux:**
```bash
brew services start mongodb-community
# or
sudo systemctl start mongod
```

Verify it is running:
```
mongosh
# You should see the MongoDB shell prompt
```
The app will auto-create the `E2EECHATAPP` database and `rooms` collection on first use.

---

### Step 2 — Start the Spring Boot Backend

Open a terminal in the `E2EE-CHATAPP` directory:

**Windows:**
```cmd
cd E2EE-CHATAPP
mvnw.cmd spring-boot:run
```

**macOS / Linux:**
```bash
cd E2EE-CHATAPP
./mvnw spring-boot:run
```

Expected output (last few lines):
```
Tomcat started on port 8080 (http) with context path '/'
Started E2EeChatappApplication in 3.4 seconds
```

If you see a MongoDB connection error, make sure MongoDB is running on port 27017.
The backend listens on `http://localhost:8080`.

---

### Step 3 — Start the React Frontend

Open a **second terminal** in the `Frontend` directory:

```cmd
cd Frontend
npm install
npm run dev
```

Expected output:
```
VITE v8.x.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open `http://localhost:5173` in your browser.

---

### Step 4 — Using the App

1. Enter a **username** and a **room code** on the landing page
2. Click **Create Room** to create a new room, or **Join Room** to join an existing one
3. You will be taken to the chat screen
4. Open the same URL in another browser window/tab, use a different username, join the same room
5. Send messages — they will appear in both windows, decrypted automatically
6. Click **Join Meeting** to launch the video room (requires LiveKit config — see Section 14)

---

### Running both in one terminal (optional, Windows)

You can use two CMD windows side by side, or a terminal multiplexer. There is no combined start script.

---

### Building for production

**Frontend:**
```cmd
cd Frontend
npm run build
```
Output goes to `Frontend/dist/`. Serve it with any static file server or behind an nginx reverse proxy.

**Backend:**
```cmd
cd E2EE-CHATAPP
mvnw.cmd package -DskipTests
java -jar target/E2EE-CHATAPP-0.0.1-SNAPSHOT.jar
```

---

## 13. Configuration Reference

All backend configuration is in `E2EE-CHATAPP/src/main/resources/application.properties`.

| Property | Default | Description |
|---|---|---|
| `spring.application.name` | `E2EE-CHATAPP` | Application name shown in logs |
| `spring.data.mongodb.uri` | `mongodb://localhost:27017/E2EECHATAPP` | MongoDB connection string |
| `livekit.url` | `wss://...livekit.cloud` | LiveKit server WebSocket URL |
| `livekit.api-key` | `APItb7GD...` | LiveKit API key (from dashboard) |
| `livekit.api-secret` | `ff9Zx...` | LiveKit API secret (from dashboard) |

### Changing the MongoDB URI
If MongoDB requires authentication or runs on a different host:
```properties
spring.data.mongodb.uri=mongodb://username:password@host:27017/E2EECHATAPP
```

### Changing the backend port
Add to `application.properties`:
```properties
server.port=9090
```
Then update `vite.config.js` proxy targets from `8080` to `9090`.

### Environment variables (recommended for production)
Instead of hardcoding secrets, use environment variables:
```properties
livekit.api-key=${LIVEKIT_API_KEY}
livekit.api-secret=${LIVEKIT_API_SECRET}
```
Then set `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in your environment before starting the backend.

---

## 14. LiveKit Setup

LiveKit powers the video meeting feature. Chat works without it.

### Create a free account
1. Go to https://livekit.io and sign up
2. Create a new project in the dashboard
3. Copy your **API Key** and **API Secret** from the project settings
4. Copy the **Server URL** (format: `wss://your-project.livekit.cloud`)

### Update application.properties
```properties
livekit.url=wss://your-project-name.livekit.cloud
livekit.api-key=APIxxxxxxxxxxxxx
livekit.api-secret=your-secret-here
```

### How it works
1. User clicks "Join Meeting" in the chat
2. Frontend calls `POST /api/v1/meetings/token`
3. Backend validates the room exists, then mints a signed JWT with:
   - `roomJoin: true` permission
   - Room name scoped to the chat room
   - 10-minute expiry
4. Frontend receives `{ server_url, participant_token }`
5. LiveKit `<PreJoin>` lets the user configure camera/mic
6. `<LiveKitRoom>` connects directly to LiveKit's cloud using the token
7. Audio and video streams are routed through LiveKit — the Spring Boot backend is not involved

### Camera / Microphone permissions
The browser will ask for camera and microphone access when joining a meeting.
If you deny them, the pre-join screen will show an error. You can still join with audio-only or video-only.

---

## 15. Troubleshooting

### Backend won't start — MongoDB connection refused
```
com.mongodb.MongoSocketOpenException: Exception opening socket
```
MongoDB is not running. Start it first (see Step 1 in Section 12).

---

### Backend won't start — port 8080 in use
```
Web server failed to start. Port 8080 was already in use.
```
Either kill the process using port 8080, or change the port:
```properties
# application.properties
server.port=8081
```
Then update `vite.config.js` proxy target to `http://localhost:8081`.

---

### `npm run dev` fails — module not found
You skipped `npm install`. Run it first:
```cmd
cd Frontend
npm install
npm run dev
```

---

### Chat messages show "[encrypted — sent in a previous session]"
Your localStorage keys changed. This is expected if you:
- Cleared your browser data
- Opened DevTools and ran `localStorage.clear()`
- Switched browsers

Old messages were encrypted with your old public key. They cannot be recovered.
New messages you send will work fine with your new key pair.

---

### Chat messages show "[encrypted — not addressed to you]"
You joined the room after those messages were sent. The sender encrypted only for participants
who were registered at send time. You were not in `participantPublicKeys` yet.

---

### Chat messages show "[encrypted — key mismatch]"
A message was encrypted for your username but your private key doesn't match.
This can happen if two tabs/devices are logged in with the same username but different key pairs.
Use a unique username per device.

---

### WebSocket connection fails — STOMP error in console
Make sure:
1. The backend is running on port 8080
2. You are accessing the frontend via `http://localhost:5173` (not `127.0.0.1`)
3. Vite proxy is active (only works with `npm run dev`, not a static file server)

---

### Meeting page shows "Could not prepare the meeting"
1. Check that the LiveKit keys in `application.properties` are correct
2. Check that the room you are in actually exists in MongoDB
3. The meeting token expires after 10 minutes — navigate back to chat and re-click "Join Meeting"

---

### Camera/microphone error in pre-join
```
Camera or microphone permission was denied
```
Allow camera/mic access in your browser's address bar permission prompt.
On Chrome: click the camera icon in the address bar → Allow.

---

### Build fails — Java version mismatch
```
error: Source option 21 is not supported
```
Your `JAVA_HOME` points to an older JDK. Set it to Java 21:
```cmd
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.x.x
```

---

## 16. Security Model and Threat Analysis

### What is protected
- **Message content** — encrypted with RSA-OAEP 2048-bit before leaving the browser
- **Private keys** — never transmitted; stored only in localStorage on the sender's device
- **Server-side confidentiality** — the MongoDB database contains only ciphertext; a database breach reveals no message content

### What is NOT protected
- **Metadata** — the server knows who sent a message, when, to which room, and who the recipients are
- **Username authenticity** — anyone can claim any username; there is no authentication system
- **Key authenticity** — public keys are registered by whoever claims that username; a MITM can register a fake key before the real user joins
- **Forward secrecy** — keys are persistent; compromise of a user's localStorage exposes all past messages
- **Transport** — the STOMP connection is not TLS-encrypted in local development; use HTTPS/WSS in production

### Recommended hardening for production
- Add user authentication (JWT auth, OAuth2, etc.) to prevent username spoofing
- Serve the app over HTTPS/WSS to protect metadata in transit
- Implement key fingerprint verification UI so users can confirm each other's keys out-of-band
- Consider replacing RSA-OAEP with a Signal-Protocol-style ratchet for forward secrecy
- Move messages to a separate MongoDB collection to enable efficient cleanup and TTL indexing
- Rotate LiveKit credentials and store them in environment variables, not in the properties file

---

## 17. Known Limitations

- Messages are stored as an embedded array inside the Room document. Very active rooms will produce large documents and slow MongoDB reads. For production, move messages to a separate collection with an index on `roomId`.
- No authentication — anyone who knows a room code can join and read all future messages.
- No key rotation — if a user's localStorage is cleared, they cannot recover old messages and must re-register their new public key.
- No forward secrecy — all messages can be decrypted if a user's private key is ever compromised.
- Session state is memory-only — refreshing the chat page disconnects the STOMP client and the user must rejoin.
- RSA-OAEP has a plaintext size limit based on key size (2048-bit key = max ~214 bytes plaintext). Long messages will fail silently. Hybrid encryption (RSA + AES) should be used for production.
- The `EncryptedMessageService.js` file in `src/services/` is dead code — the ChatPage handles encryption directly. It can be removed.
