# E2EE Chat App

A small full-stack chat application built with Spring Boot, MongoDB, React, Vite, Tailwind CSS, SockJS, and STOMP.

This README is written for a beginner who wants to understand what each folder does, how data moves through the app, and where to start reading the code.

## Important Reality Check

Despite the project name, the current codebase does **not** implement true end-to-end encryption.

What the code currently does:
- lets users create or join a room
- stores room messages in MongoDB
- tries to send live updates over WebSocket/STOMP
- polls the backend every 2 seconds to keep messages in sync

What is **not** present right now:
- client-side encryption
- key exchange
- message decryption logic
- authentication/authorization

So the app is currently a room-based real-time chat prototype, not a finished encrypted messenger.

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

## Project Structure

```text
E2EE-CHAT-APP/
|-- README.md                        # Main beginner-friendly documentation
|-- .github/modernize/...            # Tooling/hooks, not app runtime code
|-- E2EE-CHATAPP/                    # Spring Boot backend
|   |-- pom.xml                      # Maven dependencies and build setup
|   |-- src/main/resources/
|   |   `-- application.properties   # Spring app name + MongoDB connection
|   |-- src/main/java/com/embarkx/e2eechatapp/
|   |   |-- E2EeChatappApplication.java
|   |   |-- config/WebSocketConfig.java
|   |   |-- Controller/ChatController.java
|   |   |-- Controller/RoomController.java
|   |   |-- Entity/Room.java
|   |   |-- Entity/Message.java
|   |   |-- Repository/RoomRepository.java
|   |   `-- payload/MessageRequest.java
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
|       |   `-- ChatPage.jsx         # Main chat screen
|       |-- context/chatContext.jsx  # Shared session state
|       |-- services/RoomService.js  # REST API helpers
|       `-- config/
|           |-- AxiosHelper.js       # Axios base URL
|           |-- helper.js            # Relative time formatter
|           `-- routes.jsx           # Route definitions
```

## How the App Works

At a high level, the app works like this:

1. A user enters a name and a room id on the landing page.
2. The frontend either creates a room or checks whether that room already exists.
3. If successful, the frontend stores the room id and user name in React context.
4. The chat page opens.
5. The chat page tries to connect to the backend over SockJS/STOMP.
6. The chat page also fetches message history through REST.
7. When a user sends a message, the frontend immediately shows it locally.
8. The frontend publishes that message to the backend over STOMP.
9. The backend stores the message inside the room document in MongoDB.
10. The backend returns the message to subscribed clients.
11. The frontend also polls every 2 seconds as a fallback so missed live events still appear.

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

This means:
- frontend publishes to something like `/app/sendMessage/{roomId}`
- frontend subscribes to some `/topic/...` destination

### `Controller/RoomController.java`
This is the REST API for room management and message history.

Endpoints:
- `POST /api/v1/rooms`
  - creates a room if the room id does not already exist
  - request body is just a plain string room id
- `GET /api/v1/rooms/{roomId}`
  - checks whether a room exists
  - used by the frontend before joining
- `GET /api/v1/rooms/{roomId}/messages?page=0&size=50`
  - returns a slice of saved messages
  - pagination is done manually because messages are stored inside the room document

### `Controller/ChatController.java`
This controller handles live messages over STOMP.

Flow:
- client publishes to `/app/sendMessage/{roomId}`
- backend receives a `MessageRequest`
- backend finds the matching room in MongoDB
- backend creates a `Message`
- backend appends the message to the room's `messages` list
- backend saves the updated room
- backend broadcasts the returned `Message`

### `Entity/Room.java`
This is the MongoDB document for a chat room.

Fields:
- `id`: MongoDB's internal id
- `roomId`: human-friendly room code typed by users
- `messages`: list of all messages for that room

### `Entity/Message.java`
This represents one chat message.

Fields:
- `sender`
- `content`
- `timestamp`

### `payload/MessageRequest.java`
This is the payload shape the frontend sends when publishing a message.

Fields:
- `content`
- `roomId`
- `sender`

### `Repository/RoomRepository.java`
This is the Spring Data MongoDB repository.

It gives you:
- built-in CRUD methods from `MongoRepository`
- a custom finder: `findByRoomId(String roomId)`

## Frontend Walkthrough

### `src/main.jsx`
This is the React entry point.

It wraps the app with:
- `BrowserRouter` for page navigation
- `Toaster` for notifications
- `ChatProvider` for shared room/user state

### `src/config/routes.jsx`
Defines the routes:
- `/` -> landing page
- `/chat` -> chat room screen
- `/about` -> placeholder route
- `*` -> fallback 404 route

### `src/context/chatContext.jsx`
This is the shared session state for the current browser tab.

It stores:
- `roomId`
- `currentUser`
- `connected`

This lets the landing page and chat page share the same room session information.

### `src/components/JoinCreateChat.jsx`
This is the first screen users see.

Responsibilities:
- collect `userName` and `roomId`
- validate that both fields are filled
- call `createRoomAPI()` when the user wants a new room
- call `joinChatAPI()` when the user wants to join an existing room
- save successful session data into React context
- navigate to `/chat`

### `src/components/ChatPage.jsx`
This is the main chat UI.

Responsibilities:
- read `roomId`, `currentUser`, and `connected` from context
- open a SockJS/STOMP connection
- subscribe for incoming room messages
- fetch existing room history from the backend
- poll every 2 seconds as a backup
- optimistically add a sent message to the UI before the server reply arrives
- publish new messages to the backend
- auto-scroll to the latest message
- clear session state when leaving the room

Key helper logic inside this file:
- `getMessageTimestamp()`
  - normalizes different timestamp field names
- `isOwnMessage()`
  - decides whether to right-align or left-align a message
- `mergeIncomingMessages()`
  - deduplicates messages using `sender + content`
  - replaces optimistic messages when a server timestamp arrives later

### `src/services/RoomService.js`
This file keeps API calls in one place.

Functions:
- `createRoomAPI(roomId)`
- `joinChatAPI(roomId)`
- `getMessagesAPI(roomId, size, page)`

### `src/config/AxiosHelper.js`
Creates a reusable Axios client pointing at:
- `http://localhost:8080`

### `src/config/helper.js`
Contains `timeAgo()` which converts a date into labels like:
- `Just now`
- `2 minutes ago`
- `3 hours ago`

## Message Flow End-to-End

Here is the most important path in the whole app:

```text
User types message in ChatPage
        |
        v
Frontend creates local message object
        |
        v
Frontend shows message immediately (optimistic UI)
        |
        v
Frontend publishes JSON to /app/sendMessage/{roomId}
        |
        v
ChatController receives the message
        |
        v
RoomRepository finds the room in MongoDB
        |
        v
Message is appended to room.messages
        |
        v
Room is saved back to MongoDB
        |
        v
Backend broadcasts the saved message to subscribers
        |
        v
Frontend merges broadcast message into local state
        |
        v
Polling also refreshes message history every 2 seconds
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

### WebSocket / STOMP
- handshake endpoint: `/chat`
- publish destination prefix: `/app`
- subscribe destination prefix: `/topic`

## What a Beginner Should Read First

If you want to understand the code in the easiest order, read files in this sequence:

1. `Frontend/src/components/JoinCreateChat.jsx`
2. `Frontend/src/context/chatContext.jsx`
3. `Frontend/src/components/ChatPage.jsx`
4. `Frontend/src/services/RoomService.js`
5. `E2EE-CHATAPP/src/main/java/com/embarkx/e2eechatapp/Controller/RoomController.java`
6. `E2EE-CHATAPP/src/main/java/com/embarkx/e2eechatapp/Controller/ChatController.java`
7. `E2EE-CHATAPP/src/main/java/com/embarkx/e2eechatapp/config/WebSocketConfig.java`
8. `E2EE-CHATAPP/src/main/java/com/embarkx/e2eechatapp/Entity/Room.java`
9. `E2EE-CHATAPP/src/main/java/com/embarkx/e2eechatapp/Repository/RoomRepository.java`

That order follows the actual user journey through the app.

## Current Limitations and Things to Notice

These are not guesses; they come directly from the current code.

- The project name says `E2EE`, but there is no encryption logic yet.
- Messages are stored directly in the `Room` document, so a single room document grows forever as more messages are added.
- There is no login system, token system, or access control.
- The frontend uses optimistic UI plus polling, which helps even if websocket delivery is imperfect.
- The backend broadcasts to `/topic/room/{roomId}` while the frontend subscribes to `/topic/${roomId}`. Those destinations should match for pure websocket delivery.
- The backend currently allows websocket origin `http://localhost:3000`, while a default Vite app usually runs on `http://localhost:5173`.
- The attachment button exists in the UI but does not upload files yet.
- Error handling is basic and can be improved.
- Tests are minimal; there is only a Spring context smoke test right now.

## Suggested Next Improvements

If you want to keep building this project, these are the highest-value next steps:

1. Implement real end-to-end encryption in the browser.
2. Fix websocket topic/origin alignment between frontend and backend.
3. Add authentication and room access control.
4. Move messages into their own MongoDB collection for better scalability.
5. Add proper API and websocket tests.
6. Persist session data so refreshing the browser does not drop the room state.
7. Implement real file attachment support or remove the placeholder button.

## Notes About Existing Scaffold Docs

Some generated files still exist from the original framework scaffolding:
- `E2EE-CHATAPP/HELP.md`
- `Frontend/README.md`

They are generic starter docs. This root `README.md` is the project-specific guide.
"# E2EE-CHAT-APP-WITH-VIDEO-CALLING" 
"# E2EE-CHAT-APP-WITH-VIDEO-CALLING" 
