const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const MemberSchema = new mongoose.Schema({
  username: { type: String, required: true },
  socketId: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  audioEnabled: { type: Boolean, default: true },
  micEnabled: { type: Boolean, default: true },
  videoEnabled: { type: Boolean, default: true }
}, { _id: false });

const RoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, default: () => uuidv4().slice(0, 8) },
  roomName: { type: String, required: true },
  host: { type: String, required: true },
  members: [MemberSchema],
  maxMembers: { type: Number, default: 10 },
  status: { type: String, enum: ['waiting', 'active'], default: 'waiting' },
  currentPlayer: { type: String, default: null },
  currentTurnIndex: { type: Number, default: 0 }, // Index in turnOrder array
  turnOrder: [{ type: String }], // Array of usernames in join order
  gamePhase: { 
    type: String, 
    enum: ['waiting', 'choose', 'spin', 'result'], 
    default: 'waiting' 
  }, // waiting=not started, choose=player choosing truth/dare, spin=spinning wheel, result=showing result
  currentChoice: { type: String, enum: ['truth', 'dare', null], default: null }, // What current player chose
  spinResult: { type: Number, default: null },
  currentContent: { type: String, default: null }, // The truth question or dare task
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);