import SimplePeer from 'simple-peer';

class WebRTCService {
  constructor() {
    this.localStream = null;
    this.peers = new Map(); // peerId -> SimplePeer instance
    this.onStreamCallbacks = [];
    this.onLocalStreamCallbacks = [];
  }

  // Initialize local audio + video stream
  async initLocalStream(videoEnabled = true, audioEnabled = true) {
    try {
      // Stop any existing stream first
      this.stopLocalStream();
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audioEnabled,
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
        // console.log('Falling back to audio only...');
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

  // Create peer connection as initiator
  createPeerConnection(peerId, initiator = true) {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId);
    }

    const peer = new SimplePeer({
      initiator,
      stream: this.localStream,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    peer.on('stream', (remoteStream) => {
      // console.log(`Received stream from peer: ${peerId}`);
      this.onStreamCallbacks.forEach(cb => cb(peerId, remoteStream));
    });

    peer.on('error', (err) => {
      console.error(`Peer ${peerId} error:`, err);
      this.peers.delete(peerId);
    });

    peer.on('close', () => {
      // console.log(`Peer ${peerId} connection closed`);
      this.peers.delete(peerId);
    });

    this.peers.set(peerId, peer);
    return peer;
  }

  // Create offer (returns signal data via peer.on('signal'))
  createOffer(peerId) {
    const peer = this.createPeerConnection(peerId, true);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Offer timeout'));
      }, 10000);
      
      peer.on('signal', (data) => {
        if (data.type === 'offer' || data.candidate) {
          clearTimeout(timeout);
          resolve(data);
        }
      });
    });
  }

  // Handle incoming offer and create answer
  handleOffer(peerId, offer) {
    const peer = this.createPeerConnection(peerId, false);
    peer.signal(offer);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Answer timeout'));
      }, 10000);
      
      peer.on('signal', (data) => {
        if (data.type === 'answer') {
          clearTimeout(timeout);
          resolve(data);
        }
      });
    });
  }

  // Handle answer from remote peer
  handleAnswer(peerId, answer) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.signal(answer);
    }
  }

  // Handle ICE candidate
  handleIceCandidate(peerId, candidate) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.signal(candidate);
    }
  }

  // Toggle audio (speaker/output)
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
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
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.destroy();
      this.peers.delete(peerId);
    }
  }

  // Close all connections
  closeAllConnections() {
    this.peers.forEach((peer) => {
      peer.destroy();
    });
    this.peers.clear();
  }

  // Stop local stream
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  // Cleanup everything
  cleanup() {
    this.closeAllConnections();
    this.stopLocalStream();
    this.onStreamCallbacks = [];
    this.onLocalStreamCallbacks = [];
  }
}

const webrtcService = new WebRTCService();
export default webrtcService;