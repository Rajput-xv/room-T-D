const RoomService = require('../services/RoomService');
const ContentService = require('../services/ContentService');

// Simple rate limiter for socket events
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 1000;
const RATE_LIMIT_MAX = 10;

const checkRateLimit = (socketId) => {
  const now = Date.now();
  const userLimit = rateLimiter.get(socketId) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  
  if (now > userLimit.resetAt) {
    userLimit.count = 1;
    userLimit.resetAt = now + RATE_LIMIT_WINDOW;
  } else {
    userLimit.count++;
  }
  
  rateLimiter.set(socketId, userLimit);
  return userLimit.count <= RATE_LIMIT_MAX;
};

setInterval(() => {
  const now = Date.now();
  for (const [socketId, limit] of rateLimiter.entries()) {
    if (now > limit.resetAt + 60000) {
      rateLimiter.delete(socketId);
    }
  }
}, 60000);

module.exports = function (io) {
  io.on('connection', (socket) => {
    // console.log(`✅ User connected: ${socket.id}`);

    const withRateLimit = (handler) => async (data) => {
      if (!checkRateLimit(socket.id)) {
        socket.emit('error', { message: 'Too many requests. Please slow down.' });
        return;
      }
      try {
        await handler(data);
      } catch (err) {
        console.error(`Socket error (${socket.id}):`, err.message);
        socket.emit('error', { message: err.message || 'An error occurred' });
      }
    };

    socket.on('create-room', withRateLimit(async ({ roomName, username }) => {
      if (!roomName || !username) {
        throw new Error('Room name and username are required');
      }
      const room = await RoomService.createRoom(roomName, username, socket.id);
      socket.join(room.roomId);
      socket.username = username;
      socket.roomId = room.roomId;
      socket.emit('room-created', { roomId: room.roomId, roomName: room.roomName, room });
      // console.log(`🏠 Room created: ${room.roomId} by ${username}`);
    }));

    // Join room
    socket.on('join-room', withRateLimit(async ({ roomId, username }) => {
      if (!roomId || !username) {
        throw new Error('Room ID and username are required');
      }
      const room = await RoomService.joinRoom(roomId, username, socket.id);
      socket.join(roomId);
      socket.username = username;
      socket.roomId = roomId;
      socket.emit('room-joined', { room });
      socket.to(roomId).emit('member-joined', { username, members: room.members });
      // console.log(`👤 ${username} joined room: ${roomId}`);
    }));

    // Leave room
    socket.on('leave-room', withRateLimit(async ({ roomId }) => {
      const username = socket.username;
      if (!roomId || !username) return;
      
      const result = await RoomService.leaveRoom(roomId, username);
      socket.leave(roomId);
      socket.roomId = null;
      socket.username = null;
      
      if (result && !result.deleted) {
        socket.to(roomId).emit('member-left', { username, members: result.room.members });
      }
      // console.log(`🚪 ${username} left room: ${roomId}`);
    }));

    // Get available rooms
    socket.on('get-available-rooms', async () => {
      try {
        const rooms = await RoomService.getAvailableRooms();
        io.to(socket.id).emit('available-rooms', { rooms });
      } catch (err) {
        io.to(socket.id).emit('error', { message: err.message });
      }
    });

    // Chat message
    socket.on('send-message', ({ roomId, username, message }) => {
      io.to(roomId).emit('chat-message', { username, message, timestamp: Date.now() });
    });

    // Start game (host only)
    socket.on('start-game', async ({ roomId }) => {
      try {
        const room = await RoomService.startGame(roomId);
        io.to(roomId).emit('game-started', { 
          room,
          gameState: {
            status: room.status,
            gamePhase: room.gamePhase,
            currentPlayer: room.currentPlayer,
            currentChoice: room.currentChoice,
            spinResult: room.spinResult,
            currentContent: room.currentContent,
            turnOrder: room.turnOrder,
            currentTurnIndex: room.currentTurnIndex
          }
        });
      } catch (err) {
        io.to(socket.id).emit('error', { message: err.message });
      }
    });

    // Choose truth or dare
    socket.on('choose-truth-or-dare', async ({ roomId, choice }) => {
      try {
        const room = await RoomService.chooseTruthOrDare(roomId, socket.username, choice);
        io.to(roomId).emit('choice-made', {
          username: socket.username,
          choice,
          gamePhase: room.gamePhase
        });
      } catch (err) {
        io.to(socket.id).emit('error', { message: err.message });
      }
    });

    // Spin wheel - spins for number 1-10, backend picks random group + that number
    socket.on('spin-wheel', async ({ roomId }) => {
      try {
        const room = await RoomService.getRoom(roomId);
        if (!room) throw new Error('Room not found');
        if (room.currentPlayer !== socket.username) throw new Error('Not your turn');
        if (room.gamePhase !== 'spin') throw new Error('Choose truth or dare first');
        if (!room.currentChoice) throw new Error('No choice made');

        io.to(roomId).emit('wheel-spinning', { spinning: true });
        
        // Simulate spin duration
        setTimeout(async () => {
          try {
            // Re-fetch room to get latest state
            const currentRoom = await RoomService.getRoom(roomId);
            if (!currentRoom) {
              io.to(roomId).emit('error', { message: 'Room not found' });
              return;
            }
            
            // Wheel always shows 1-10
            const wheelNumber = Math.floor(Math.random() * 10) + 1;
            
            // Get content using the CURRENT choice (truth or dare)
            // Pass roomId for history tracking to prevent repetition
            const currentChoice = currentRoom.currentChoice;
            
            const selectedContent = ContentService.getContentByWheelNumber(
              currentChoice, 
              wheelNumber,
              roomId  // Pass roomId for tracking used content
            );
            
            await RoomService.setSpinResult(roomId, wheelNumber, selectedContent);
            
            io.to(roomId).emit('wheel-stopped', { 
              result: wheelNumber,
              content: selectedContent,
              type: currentChoice
            });
          } catch (innerErr) {
            console.error('Error in spin-wheel timeout:', innerErr);
            io.to(roomId).emit('error', { message: innerErr.message });
          }
        }, 3000);
      } catch (err) {
        io.to(socket.id).emit('error', { message: err.message });
      }
    });

    // Next turn - move to next player
    socket.on('next-turn', async ({ roomId }) => {
      try {
        const room = await RoomService.nextTurn(roomId);
        io.to(roomId).emit('turn-changed', {
          currentPlayer: room.currentPlayer,
          gamePhase: room.gamePhase,
          currentTurnIndex: room.currentTurnIndex,
          turnOrder: room.turnOrder
        });
      } catch (err) {
        io.to(socket.id).emit('error', { message: err.message });
      }
    });

    // End room - host can end and delete the room (kicks everyone)
    socket.on('end-room', async ({ roomId }) => {
      try {
        const room = await RoomService.getRoom(roomId);
        if (!room) throw new Error('Room not found');
        if (room.host !== socket.username) throw new Error('Only host can end the room');
        
        // Notify all members that room is ending
        io.to(roomId).emit('room-ended', { message: 'Host has ended the room' });
        
        // Clean up content history tracking for this room
        ContentService.cleanupRoom(roomId);
        
        // Delete room from database
        await RoomService.deleteRoom(roomId);
        
        // Make all sockets leave the room
        const sockets = await io.in(roomId).fetchSockets();
        for (const s of sockets) {
          s.leave(roomId);
          s.roomId = null;
          s.username = null;
        }
      } catch (err) {
        io.to(socket.id).emit('error', { message: err.message });
      }
    });

    // Select truth
    socket.on('select-truth', ({ roomId }) => {
      const question = ContentService.getTruth(roomId);
      io.to(roomId).emit('truth-question', { question });
    });

    // Select dare
    socket.on('select-dare', ({ roomId }) => {
      const task = ContentService.getDare(roomId);
      io.to(roomId).emit('dare-task', { task });
    });

    // Update activity
    socket.on('update-activity', async ({ roomId }) => {
      try {
        await RoomService.updateActivity(roomId, socket.username);
      } catch (err) {
        console.error('Activity update error:', err);
      }
    });

    // Toggle audio
    socket.on('toggle-audio', async ({ roomId, enabled }) => {
      try {
        await RoomService.toggleMemberMedia(roomId, socket.username, 'audio', enabled);
        io.to(roomId).emit('member-audio-toggled', { username: socket.username, enabled });
      } catch (err) {
        io.to(socket.id).emit('error', { message: err.message });
      }
    });

    // Toggle mic
    socket.on('toggle-mic', async ({ roomId, enabled }) => {
      try {
        await RoomService.toggleMemberMedia(roomId, socket.username, 'mic', enabled);
        io.to(roomId).emit('member-mic-toggled', { username: socket.username, enabled });
      } catch (err) {
        io.to(socket.id).emit('error', { message: err.message });
      }
    });

    // Toggle video
    socket.on('toggle-video', async ({ roomId, enabled }) => {
      try {
        await RoomService.toggleMemberMedia(roomId, socket.username, 'video', enabled);
        io.to(roomId).emit('member-video-toggled', { username: socket.username, enabled });
      } catch (err) {
        io.to(socket.id).emit('error', { message: err.message });
      }
    });

    // WebRTC signaling - these MUST be reliable for video/audio to work
    socket.on('webrtc-offer', ({ roomId, offer, to }) => {
      // console.log(`📨 WebRTC offer: ${socket.id} -> ${to}`);
      io.to(to).emit('webrtc-offer', { from: socket.id, offer });
    });

    socket.on('webrtc-answer', ({ roomId, answer, to }) => {
      // console.log(`📨 WebRTC answer: ${socket.id} -> ${to}`);
      io.to(to).emit('webrtc-answer', { from: socket.id, answer });
    });

    socket.on('webrtc-ice-candidate', ({ roomId, candidate, to }) => {
      // console.log(`📨 ICE candidate: ${socket.id} -> ${to}`);
      io.to(to).emit('webrtc-ice-candidate', { from: socket.id, candidate });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      // console.log(`❌ User disconnected: ${socket.id}`);
      rateLimiter.delete(socket.id);
      
      if (socket.roomId && socket.username) {
        try {
          const result = await RoomService.leaveRoom(socket.roomId, socket.username);
          if (result && !result.deleted) {
            socket.to(socket.roomId).emit('member-left', { 
              username: socket.username, 
              members: result.room.members 
            });
          }
        } catch (err) {
          console.error('Error handling disconnect:', err);
        }
      }
    });

    // Error handling for socket
    socket.on('error', (err) => {
      console.error(`Socket error (${socket.id}):`, err);
    });
  });
};