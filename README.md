# 🎯 Truth or Dare Game

A real-time multiplayer Truth or Dare game built with React, Node.js, Socket.IO, and WebRTC for **audio + video** communication.

## Features

- ✅ Create and join game rooms (max 10 players)
- ✅ Real-time spinning wheel to select players
- ✅ Random truth questions and dare tasks
- ✅ **WebRTC video + audio communication**
- ✅ Toggle video/mic/audio independently
- ✅ Real-time chat
- ✅ Auto-kick after 2 minutes of inactivity
- ✅ Dark mode UI with Material-UI
- ✅ Self-view with mirrored video
- ✅ Responsive grid layout for participants

## Tech Stack

**Backend:**
- Node.js + Express
- Socket.IO for real-time communication
- MongoDB + Mongoose
- Helmet, CORS, Rate Limiting for security

**Frontend:**
- React 18 + Vite
- Material-UI (MUI)
- Socket.IO Client
- simple-peer (WebRTC)

## Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- npm or yarn

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd room-T-D
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and settings
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

### Backend (.env)

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/truth-dare-game
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Frontend (.env)

```env
VITE_SOCKET_URL=http://localhost:3001
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | Get available rooms |
| GET | `/api/rooms/:roomId` | Get specific room |
| GET | `/api/truth` | Get random truth |
| GET | `/api/dare` | Get random dare |
| GET | `/api/stats` | Get game stats |
| GET | `/health` | Health check |

## Socket Events

### Client → Server
- `create-room` - Create a new room
- `join-room` - Join existing room
- `leave-room` - Leave current room
- `send-message` - Send chat message
- `spin-wheel` - Spin the wheel
- `select-truth` / `select-dare` - Choose truth or dare
- `toggle-audio` / `toggle-mic` / `toggle-video` - Toggle media

### Server → Client
- `room-created` / `room-joined` - Room events
- `member-joined` / `member-left` - Member events
- `wheel-spinning` / `wheel-stopped` - Game events
- `truth-question` / `dare-task` - Questions
- `chat-message` - Chat events
- `member-video-toggled` - Video state changes
- `error` - Error events

## Project Structure

```
truth-dare-game/
├── backend/
│   ├── config/          # Database config
│   ├── data/            # truths.json, dares.json
│   ├── models/          # Mongoose models
│   ├── routes/          # Express routes
│   ├── services/        # Business logic
│   ├── socket/          # Socket.IO handlers
│   └── server.js        # Entry point
│
└── frontend/
    └── src/
        ├── components/  # React components
        ├── services/    # Socket & WebRTC services
        ├── App.jsx      # Main app
        └── main.jsx     # Entry point
```

## License

MIT
