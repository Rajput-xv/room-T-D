const express = require('express');
const router = express.Router();
const RoomService = require('../services/RoomService');
const ContentService = require('../services/ContentService');
const validator = require('validator');

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = validator.escape(validator.trim(req.body[key]));
      }
    });
  }
  next();
};

router.use(sanitizeInput);

// Get available rooms
router.get('/rooms', async (req, res, next) => {
  try {
    const rooms = await RoomService.getAvailableRooms();
    res.json({ success: true, rooms });
  } catch (err) {
    next(err);
  }
});

// Get specific room
router.get('/rooms/:roomId', async (req, res, next) => {
  try {
    const { roomId } = req.params;
    if (!roomId || !validator.isLength(roomId, { min: 1, max: 20 })) {
      return res.status(400).json({ success: false, error: 'Invalid room ID' });
    }
    const room = await RoomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    res.json({ success: true, room });
  } catch (err) {
    next(err);
  }
});

// Get random truth
router.get('/truth', (req, res) => {
  try {
    const truth = ContentService.getTruth();
    res.json({ success: true, question: truth });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get truth' });
  }
});

// Get random dare
router.get('/dare', (req, res) => {
  try {
    const dare = ContentService.getDare();
    res.json({ success: true, task: dare });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get dare' });
  }
});

// Get game stats
router.get('/stats', async (req, res, next) => {
  try {
    const rooms = await RoomService.getAvailableRooms();
    const totalMembers = rooms.reduce((acc, room) => acc + room.members.length, 0);
    res.json({
      success: true,
      stats: {
        activeRooms: rooms.length,
        totalPlayers: totalMembers,
        maxPlayersPerRoom: 10
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;