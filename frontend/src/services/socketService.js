import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        // console.log('✅ Connected to server');
        this.reconnectAttempts = 0;
      });

      this.socket.on('disconnect', (reason) => {
        // console.log('❌ Disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('🚨 Connection error:', error.message);
        this.reconnectAttempts++;
      });

      this.socket.on('reconnect', (attemptNumber) => {
        // console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after max attempts');
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Room operations
  createRoom(roomName, username) {
    this.socket.emit('create-room', { roomName, username });
  }

  joinRoom(roomId, username) {
    this.socket.emit('join-room', { roomId, username });
  }

  leaveRoom(roomId) {
    this.socket.emit('leave-room', { roomId });
  }

  getAvailableRooms() {
    this.socket.emit('get-available-rooms');
  }

  // Game operations
  startGame(roomId) {
    this.socket.emit('start-game', { roomId });
  }

  // Choose truth or dare (new flow)
  chooseTruthOrDare(roomId, choice) {
    this.socket.emit('choose-truth-or-dare', { roomId, choice });
  }

  spinWheel(roomId) {
    this.socket.emit('spin-wheel', { roomId });
  }

  // Move to next player's turn
  nextTurn(roomId) {
    this.socket.emit('next-turn', { roomId });
  }

  // End room (host only) - deletes room from database
  endRoom(roomId) {
    this.socket.emit('end-room', { roomId });
  }

  // Legacy methods (for compatibility)
  selectTruth(roomId) {
    this.socket.emit('select-truth', { roomId });
  }

  selectDare(roomId) {
    this.socket.emit('select-dare', { roomId });
  }

  // Chat
  sendMessage(roomId, username, message) {
    this.socket.emit('send-message', { roomId, username, message });
  }

  // Activity tracking
  updateActivity(roomId) {
    this.socket.emit('update-activity', { roomId });
  }

  // Media controls
  toggleAudio(roomId, enabled) {
    this.socket.emit('toggle-audio', { roomId, enabled });
  }

  toggleMic(roomId, enabled) {
    this.socket.emit('toggle-mic', { roomId, enabled });
  }

  toggleVideo(roomId, enabled) {
    this.socket.emit('toggle-video', { roomId, enabled });
  }

  // WebRTC signaling
  sendOffer(roomId, offer, to) {
    this.socket.emit('webrtc-offer', { roomId, offer, to });
  }

  sendAnswer(roomId, answer, to) {
    this.socket.emit('webrtc-answer', { roomId, answer, to });
  }

  sendIceCandidate(roomId, candidate, to) {
    this.socket.emit('webrtc-ice-candidate', { roomId, candidate, to });
  }

  // Event listeners
  on(event, callback) {
    this.socket?.on(event, callback);
  }

  off(event, callback) {
    this.socket?.off(event, callback);
  }
}

const socketService = new SocketService();
export default socketService;