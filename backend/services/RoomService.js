const Room = require('../models/Room');
const User = require('../models/User');

// Validation helpers
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  return trimmed.length >= 2 && trimmed.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
};

const validateRoomName = (roomName) => {
  if (!roomName || typeof roomName !== 'string') return false;
  const trimmed = roomName.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
};

const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

class RoomService {
  // Create a new room
  static async createRoom(roomName, host, socketId) {
    const sanitizedRoomName = sanitize(roomName);
    const sanitizedHost = sanitize(host);
    
    if (!validateRoomName(sanitizedRoomName)) {
      throw new Error('Invalid room name (2-50 characters)');
    }
    if (!validateUsername(sanitizedHost)) {
      throw new Error('Invalid username (2-20 alphanumeric characters)');
    }

    const room = new Room({
      roomName: sanitizedRoomName,
      host: sanitizedHost,
      members: [{
        username: sanitizedHost,
        socketId,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
        audioEnabled: true,
        micEnabled: true,
        videoEnabled: true
      }],
      status: 'waiting',
      turnOrder: [sanitizedHost], // Host is first in turn order
      currentTurnIndex: 0,
      gamePhase: 'waiting'
    });
    await room.save();

    // Track user
    await User.findOneAndUpdate(
      { username: sanitizedHost },
      { $inc: { roomsJoined: 1 }, $setOnInsert: { createdAt: Date.now() } },
      { upsert: true }
    );

    return room;
  }

  // Join an existing room
  static async joinRoom(roomId, username, socketId) {
    const sanitizedUsername = sanitize(username);
    
    if (!validateUsername(sanitizedUsername)) {
      throw new Error('Invalid username (2-20 alphanumeric characters)');
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      throw new Error('Room not found');
    }
    if (room.members.length >= room.maxMembers) {
      throw new Error('Room is full');
    }
    if (room.members.find(m => m.username === sanitizedUsername)) {
      throw new Error('Username already taken in this room');
    }

    room.members.push({
      username: sanitizedUsername,
      socketId,
      joinedAt: Date.now(),
      lastActivity: Date.now(),
      audioEnabled: true,
      micEnabled: true,
      videoEnabled: true
    });
    
    // Add to turn order (players join in order, added to end of turn queue)
    room.turnOrder.push(sanitizedUsername);
    await room.save();

    // Track user
    await User.findOneAndUpdate(
      { username: sanitizedUsername },
      { $inc: { roomsJoined: 1 }, $setOnInsert: { createdAt: Date.now() } },
      { upsert: true }
    );

    return room;
  }

  // Leave a room
  static async leaveRoom(roomId, username) {
    const room = await Room.findOne({ roomId });
    if (!room) return null;

    room.members = room.members.filter(m => m.username !== username);
    
    // Remove from turn order
    room.turnOrder = room.turnOrder.filter(u => u !== username);
    
    // Adjust currentTurnIndex if needed
    if (room.turnOrder.length > 0 && room.currentTurnIndex >= room.turnOrder.length) {
      room.currentTurnIndex = 0;
    }
    
    // If current player left, move to next turn
    if (room.currentPlayer === username && room.turnOrder.length > 0) {
      room.currentPlayer = room.turnOrder[room.currentTurnIndex];
      room.gamePhase = 'choose';
      room.currentChoice = null;
      room.spinResult = null;
      room.currentContent = null;
    }

    // If room is empty, delete it
    if (room.members.length === 0) {
      await Room.deleteOne({ roomId });
      return { room: null, deleted: true };
    }

    // If host left, assign new host
    if (room.host === username && room.members.length > 0) {
      room.host = room.members[0].username;
    }

    await room.save();
    return { room, deleted: false };
  }

  // Get available rooms (less than 10 members)
  static async getAvailableRooms() {
    return Room.find({ $expr: { $lt: [{ $size: '$members' }, 10] } })
      .select('roomId roomName host members status createdAt')
      .lean();
  }

  // Update member activity
  static async updateActivity(roomId, username) {
    const room = await Room.findOne({ roomId });
    if (room) {
      const member = room.members.find(m => m.username === username);
      if (member) {
        member.lastActivity = Date.now();
        await room.save();
      }
    }
    return room;
  }

  // Check and kick inactive members (called by server interval)
  static async checkAndKickInactiveMembers(io) {
    const rooms = await Room.find({ status: 'active' });
    const now = Date.now();
    const INACTIVITY_LIMIT = 2 * 60 * 1000; // 2 minutes

    for (const room of rooms) {
      const inactiveMembers = room.members.filter(
        m => now - new Date(m.lastActivity).getTime() > INACTIVITY_LIMIT
      );

      for (const member of inactiveMembers) {
        room.members = room.members.filter(m => m.username !== member.username);
        io.to(room.roomId).emit('member-kicked', {
          username: member.username,
          reason: 'Inactivity (2 minutes)'
        });
        io.to(member.socketId).emit('kicked', { reason: 'Inactivity (2 minutes)' });
      }

      if (room.members.length === 0) {
        await Room.deleteOne({ roomId: room.roomId });
      } else {
        await room.save();
      }
    }
  }

  // Spin the wheel - returns random number 1-totalItems
  static spinWheelRandom(totalItems = 10) {
    return Math.floor(Math.random() * totalItems) + 1;
  }

  // Get game state for a room
  static async getGameState(roomId) {
    const room = await Room.findOne({ roomId });
    if (!room) return null;
    return {
      status: room.status,
      gamePhase: room.gamePhase,
      currentPlayer: room.currentPlayer,
      currentChoice: room.currentChoice,
      spinResult: room.spinResult,
      currentContent: room.currentContent,
      turnOrder: room.turnOrder,
      currentTurnIndex: room.currentTurnIndex
    };
  }

  // Start the game
  static async startGame(roomId) {
    const room = await Room.findOne({ roomId });
    if (room) {
      room.status = 'active';
      room.gamePhase = 'choose';
      room.currentTurnIndex = 0;
      room.currentPlayer = room.turnOrder[0]; // First player in join order
      room.currentChoice = null;
      room.spinResult = null;
      room.currentContent = null;
      await room.save();
    }
    return room;
  }

  // Player chooses truth or dare
  static async chooseTruthOrDare(roomId, username, choice) {
    const room = await Room.findOne({ roomId });
    if (!room) throw new Error('Room not found');
    if (room.currentPlayer !== username) throw new Error('Not your turn');
    if (room.gamePhase !== 'choose') throw new Error('Invalid game phase');
    
    room.currentChoice = choice;
    room.gamePhase = 'spin';
    await room.save();
    return room;
  }

  // Spin wheel and get result (returns random number for content index)
  static spinWheel(totalItems) {
    return Math.floor(Math.random() * totalItems) + 1;
  }

  // Set spin result and content
  static async setSpinResult(roomId, result, content) {
    const room = await Room.findOne({ roomId });
    if (!room) return null;
    
    room.spinResult = result;
    room.currentContent = content;
    room.gamePhase = 'result';
    await room.save();
    return room;
  }

  // Move to next player's turn
  static async nextTurn(roomId) {
    const room = await Room.findOne({ roomId });
    if (!room) throw new Error('Room not found');
    
    // Move to next player (cycle through)
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
    room.currentPlayer = room.turnOrder[room.currentTurnIndex];
    room.gamePhase = 'choose';
    room.currentChoice = null;
    room.spinResult = null;
    room.currentContent = null;
    await room.save();
    return room;
  }

  // Toggle audio/mic/video for a member
  static async toggleMemberMedia(roomId, username, type, enabled) {
    const room = await Room.findOne({ roomId });
    if (room) {
      const member = room.members.find(m => m.username === username);
      if (member) {
        if (type === 'audio') member.audioEnabled = enabled;
        if (type === 'mic') member.micEnabled = enabled;
        if (type === 'video') member.videoEnabled = enabled;
        await room.save();
      }
    }
    return room;
  }

  // Get room by ID
  static async getRoom(roomId) {
    return Room.findOne({ roomId });
  }

  // Delete a specific room
  static async deleteRoom(roomId) {
    await Room.deleteOne({ roomId });
  }

  // Clean up all rooms (called on server start to remove stale rooms)
  static async cleanupAllRooms() {
    const result = await Room.deleteMany({});
    console.log(`🧹 Cleaned up ${result.deletedCount} stale rooms from database`);
    return result.deletedCount;
  }

  // Clean up stale rooms (rooms older than specified time with no activity)
  static async cleanupStaleRooms(maxAgeMs = 24 * 60 * 60 * 1000) {
    const cutoffTime = new Date(Date.now() - maxAgeMs);
    const result = await Room.deleteMany({ createdAt: { $lt: cutoffTime } });
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} stale rooms older than ${maxAgeMs / 1000 / 60} minutes`);
    }
    return result.deletedCount;
  }
}

module.exports = RoomService;