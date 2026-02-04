import SimplePeer from 'simple-peer';

class WebRTCService {
  constructor() {
    this.localStream = null;
    this.peers = new Map(); // peerId -> SimplePeer instance
    this.pendingCandidates = new Map(); // peerId -> array of ICE candidates
    this.onStreamCallbacks = [];
    this.onLocalStreamCallbacks = [];
    this.onSignalCallbacks = []; // Callback to send signals via socket
    this.onPeerDisconnectCallbacks = [];
  }

  // Set callback for when we need to send signaling data
  setSignalCallback(callback) {
    this.onSignalCallbacks.push(callback);
  }

  // Clear signal callbacks
  clearSignalCallbacks() {
    this.onSignalCallbacks = [];
  }

  // Initialize local audio + video stream
  async initLocalStream(videoEnabled = true, audioEnabled = true) {
    try {
      // Stop any existing stream first
      this.stopLocalStream();
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
        video: videoEnabled ? {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        } : false
      });
      
      // Notify listeners about local stream
      this.onLocalStreamCallbacks.forEach(cb => cb(this.localStream));
      
      return this.localStream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      // Try audio only if video fails
      if (videoEnabled) {
        return this.initLocalStream(false, audioEnabled);
      }
      throw err;
    }
  }

  // Get local stream (for self-view)
  getLocalStream() {
    return this.localStream;
  }

  // Register callback for local stream (for self-view)
  onLocalStream(callback) {
    this.onLocalStreamCallbacks.push(callback);
    // If stream already exists, call immediately
    if (this.localStream) {
      callback(this.localStream);
    }
  }

  // Register callback for peer disconnect
  onPeerDisconnect(callback) {
    this.onPeerDisconnectCallbacks.push(callback);
  }

  // Create peer connection
  createPeerConnection(peerId, initiator = true) {
    // If peer already exists and is not destroyed, return it
    if (this.peers.has(peerId)) {
      const existingPeer = this.peers.get(peerId);
      if (!existingPeer.destroyed) {
        // console.log(`⚠️ Peer ${peerId} already exists, reusing`);
        return existingPeer;
      }
      // Clean up destroyed peer
      this.peers.delete(peerId);
    }

    // console.log(`🔗 Creating peer connection to ${peerId}, initiator: ${initiator}`);

    const peer = new SimplePeer({
      initiator,
      stream: this.localStream,
      trickle: true, // Enable ICE trickle for faster connections
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // Free TURN servers for NAT traversal
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 10
      }
    });

    // Handle ALL signal events (offers, answers, AND ICE candidates)
    peer.on('signal', (data) => {
      // console.log(`📡 Sending signal to ${peerId}:`, data.type || 'ice-candidate');
      // Send every signal to the remote peer via socket
      this.onSignalCallbacks.forEach(cb => cb(peerId, data));
    });

    peer.on('stream', (remoteStream) => {
      // console.log(`🎥 Received stream from peer ${peerId}:`, {
      //   video: remoteStream.getVideoTracks().length,
      //   audio: remoteStream.getAudioTracks().length
      // });
      this.onStreamCallbacks.forEach(cb => cb(peerId, remoteStream));
    });

    peer.on('track', (track, stream) => {
      // console.log(`🎵 Track received from ${peerId}:`, track.kind);
    });

    peer.on('connect', () => {
      // console.log(`✅ Peer ${peerId} connected!`);
      // Process any pending ICE candidates
      if (this.pendingCandidates.has(peerId)) {
        const candidates = this.pendingCandidates.get(peerId);
        candidates.forEach(candidate => {
          try {
            peer.signal(candidate);
          } catch (e) {
            console.error('Error adding pending candidate:', e);
          }
        });
        this.pendingCandidates.delete(peerId);
      }
    });

    peer.on('error', (err) => {
      console.error(`Peer ${peerId} error:`, err.message);
      this.cleanupPeer(peerId);
    });

    peer.on('close', () => {
      this.cleanupPeer(peerId);
      this.onPeerDisconnectCallbacks.forEach(cb => cb(peerId));
    });

    peer.on('iceStateChange', (state) => {
      // ICE state changed
    });

    this.peers.set(peerId, peer);
    return peer;
  }

  // Clean up a specific peer
  cleanupPeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer && !peer.destroyed) {
      peer.destroy();
    }
    this.peers.delete(peerId);
    this.pendingCandidates.delete(peerId);
  }

  // Initiate connection to a peer (as initiator)
  connectToPeer(peerId) {
    if (!this.localStream) {
      console.error('Cannot connect to peer: no local stream');
      return null;
    }
    return this.createPeerConnection(peerId, true);
  }

  // Handle incoming signal (offer, answer, or ICE candidate)
  handleSignal(peerId, signal) {
    // console.log(`📥 Received signal from ${peerId}:`, signal.type || 'ice-candidate');
    let peer = this.peers.get(peerId);
    
    // If we receive an offer, we need to create a non-initiator peer
    if (signal.type === 'offer') {
      // If peer exists and we also sent an offer (glare condition), 
      // the peer with larger socket ID wins as initiator
      if (peer && !peer.destroyed) {
        peer.destroy();
        this.peers.delete(peerId);
      }
      peer = this.createPeerConnection(peerId, false);
    }
    
    if (!peer) {
      // For ICE candidates that arrive before the peer is created, queue them
      if (signal.candidate || signal.type === 'candidate') {
        if (!this.pendingCandidates.has(peerId)) {
          this.pendingCandidates.set(peerId, []);
        }
        this.pendingCandidates.get(peerId).push(signal);
        return;
      }
      console.error(`No peer connection for ${peerId}`);
      return;
    }
    
    try {
      peer.signal(signal);
    } catch (err) {
      console.error(`Error signaling peer ${peerId}:`, err);
      // If the signal fails, queue ICE candidates
      if (signal.candidate || signal.type === 'candidate') {
        if (!this.pendingCandidates.has(peerId)) {
          this.pendingCandidates.set(peerId, []);
        }
        this.pendingCandidates.get(peerId).push(signal);
      }
    }
  }

  // Toggle mic (microphone/input)
  toggleMic(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Toggle video
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Check if video track exists and is active
  hasVideoTrack() {
    return this.localStream?.getVideoTracks().length > 0;
  }

  // Check if audio track exists
  hasAudioTrack() {
    return this.localStream?.getAudioTracks().length > 0;
  }

  // Register callback for remote streams
  onStream(callback) {
    this.onStreamCallbacks.push(callback);
  }

  // Remove stream callback
  offStream(callback) {
    this.onStreamCallbacks = this.onStreamCallbacks.filter(cb => cb !== callback);
  }

  // Close specific peer connection
  closeConnection(peerId) {
    this.cleanupPeer(peerId);
  }

  // Close all connections
  closeAllConnections() {
    this.peers.forEach((peer, peerId) => {
      if (!peer.destroyed) {
        peer.destroy();
      }
    });
    this.peers.clear();
    this.pendingCandidates.clear();
  }

  // Stop local stream
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
  }

  // Cleanup everything
  cleanup() {
    this.closeAllConnections();
    this.stopLocalStream();
    this.onStreamCallbacks = [];
    this.onLocalStreamCallbacks = [];
    this.onSignalCallbacks = [];
    this.onPeerDisconnectCallbacks = [];
  }

  // Get connection stats for debugging
  getStats() {
    return {
      peers: Array.from(this.peers.keys()),
      hasLocalStream: !!this.localStream,
      localTracks: this.localStream?.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })) || []
    };
  }
}

const webrtcService = new WebRTCService();
export default webrtcService;