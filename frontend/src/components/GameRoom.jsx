import { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, Button, Grid, Stack, List, ListItem, ListItemText, Chip, Alert, CircularProgress } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import VideoGrid from './VideoGrid';
import SpinningWheel from './SpinningWheel';
import TruthDareButtons from './TruthDareButtons';
import Chat from './Chat';
import webrtcService from '../services/webrtcService';
import socketService from '../services/socketService';

export default function GameRoom({ 
  room, 
  username, 
  members, 
  messages, 
  currentPlayer, 
  truthDare,
  isSpinning,
  spinResult,
  gamePhase,
  currentChoice,
  turnOrder,
  onLeave,
  onEndRoom,
  onSendMessage, 
  onSpin, 
  onChooseTruthOrDare,
  onNextTurn,
  onSelectTruth, 
  onSelectDare 
}) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [streams, setStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [mediaError, setMediaError] = useState(null);

  const isHost = room.host === username;
  const isCurrentPlayer = currentPlayer === username;

  // Initialize WebRTC with video and audio
  const initWebRTC = useCallback(async () => {
    setIsInitializing(true);
    setMediaError(null);
    
    try {
      // Initialize local stream with video AND audio
      const stream = await webrtcService.initLocalStream(true, true);
      setLocalStream(stream);
      
      // Listen for local stream updates
      webrtcService.onLocalStream((stream) => {
        setLocalStream(stream);
      });
      
      // Listen for remote streams
      webrtcService.onStream((peerId, stream) => {
        // console.log('Received remote stream from:', peerId);
        setStreams(prev => ({ ...prev, [peerId]: stream }));
      });

      // Set up signaling handlers
      socketService.on('webrtc-offer', async ({ from, offer }) => {
        try {
          const answer = await webrtcService.handleOffer(from, offer);
          socketService.sendAnswer(room.roomId, answer, from);
        } catch (err) {
          console.error('Error handling offer:', err);
        }
      });

      socketService.on('webrtc-answer', ({ from, answer }) => {
        webrtcService.handleAnswer(from, answer);
      });

      socketService.on('webrtc-ice-candidate', ({ from, candidate }) => {
        webrtcService.handleIceCandidate(from, candidate);
      });

      // Connect to existing members (after a small delay to ensure stream is ready)
      setTimeout(async () => {
        for (const member of members) {
          if (member.username !== username) {
            try {
              const offer = await webrtcService.createOffer(member.socketId);
              socketService.sendOffer(room.roomId, offer, member.socketId);
            } catch (err) {
              console.error(`Error connecting to ${member.username}:`, err);
            }
          }
        }
      }, 500);
      
    } catch (err) {
      console.error('WebRTC init error:', err);
      setMediaError('Could not access camera/microphone. Please check permissions.');
    } finally {
      setIsInitializing(false);
    }
  }, [room.roomId, username, members]);

  useEffect(() => {
    initWebRTC();

    // Handle new member joining - connect to them
    const handleNewMember = ({ username: newUsername, members: newMembers }) => {
      const newMember = newMembers.find(m => m.username === newUsername);
      if (newMember && newUsername !== username) {
        setTimeout(async () => {
          try {
            const offer = await webrtcService.createOffer(newMember.socketId);
            socketService.sendOffer(room.roomId, offer, newMember.socketId);
          } catch (err) {
            console.error(`Error connecting to new member ${newUsername}:`, err);
          }
        }, 500);
      }
    };

    // Handle member leaving - cleanup their stream
    const handleMemberLeft = ({ username: leftUsername }) => {
      setStreams(prev => {
        const newStreams = { ...prev };
        // Find and remove the stream for the member who left
        Object.keys(newStreams).forEach(key => {
          const member = members.find(m => m.socketId === key);
          if (member?.username === leftUsername) {
            delete newStreams[key];
          }
        });
        return newStreams;
      });
    };

    socketService.on('member-joined', handleNewMember);
    socketService.on('member-left', handleMemberLeft);

    return () => {
      socketService.off('member-joined', handleNewMember);
      socketService.off('member-left', handleMemberLeft);
      socketService.off('webrtc-offer');
      socketService.off('webrtc-answer');
      socketService.off('webrtc-ice-candidate');
      webrtcService.cleanup();
    };
  }, [initWebRTC, room.roomId, username, members]);

  const handleToggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    webrtcService.toggleAudio(newState);
    socketService.toggleAudio(room.roomId, newState);
  };

  const handleToggleMic = () => {
    const newState = !micEnabled;
    setMicEnabled(newState);
    webrtcService.toggleMic(newState);
    socketService.toggleMic(room.roomId, newState);
  };

  const handleToggleVideo = () => {
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    webrtcService.toggleVideo(newState);
    socketService.toggleVideo(room.roomId, newState);
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h5">{room.roomName}</Typography>
            <Typography variant="caption" color="text.secondary">
              Room ID: {room.roomId} | Host: {room.host}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button 
              variant="outlined" 
              color={videoEnabled ? 'primary' : 'error'}
              onClick={handleToggleVideo}
              startIcon={videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
              size="small"
            >
              Video
            </Button>
            <Button 
              variant="outlined" 
              color={micEnabled ? 'primary' : 'error'}
              onClick={handleToggleMic}
              startIcon={micEnabled ? <MicIcon /> : <MicOffIcon />}
              size="small"
            >
              Mic
            </Button>
            <Button 
              variant="outlined" 
              color={audioEnabled ? 'primary' : 'error'}
              onClick={handleToggleAudio}
              startIcon={audioEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
              size="small"
            >
              Audio
            </Button>
            <Button 
              variant="contained" 
              color="error"
              onClick={onLeave}
              startIcon={<ExitToAppIcon />}
              size="small"
            >
              Leave
            </Button>
            {isHost && (
              <Button 
                variant="contained" 
                color="error"
                onClick={onEndRoom}
                size="small"
                sx={{ bgcolor: 'darkred' }}
              >
                End Room
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Media Error Alert */}
      {mediaError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMediaError(null)}>
          {mediaError}
          <Button size="small" onClick={initWebRTC} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Left: Video Grid + Game Area */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 2 }}>
            {isInitializing ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Connecting to room...</Typography>
              </Box>
            ) : (
              <VideoGrid 
                members={members} 
                streams={streams} 
                localStream={localStream}
                currentUsername={username}
              />
            )}
          </Paper>

          {/* Game Area */}
          <Paper sx={{ p: 2 }}>
            {/* Host Start Button - Only shown before game starts */}
            {isHost && room.status === 'waiting' && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h5" gutterBottom>
                  🎮 Ready to Play?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {members.length} player{members.length > 1 ? 's' : ''} in the room
                </Typography>
                <Button 
                  variant="contained" 
                  color="success" 
                  size="large"
                  onClick={() => socketService.startGame(room.roomId)}
                >
                  Start Game
                </Button>
              </Box>
            )}

            {/* Waiting for host to start - Non-host view */}
            {!isHost && room.status === 'waiting' && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h5" gutterBottom>
                  ⏳ Waiting for Host
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The host will start the game soon...
                </Typography>
              </Box>
            )}

            {/* Game is active */}
            {room.status === 'active' && (
              <>
                {/* Current Turn Indicator */}
                <Alert 
                  severity={isCurrentPlayer ? 'success' : 'info'} 
                  sx={{ mb: 2 }}
                >
                  {isCurrentPlayer ? (
                    <Typography fontWeight="bold">🎯 It's YOUR turn!</Typography>
                  ) : (
                    <Typography>Current Turn: <strong>{currentPlayer}</strong></Typography>
                  )}
                </Alert>

                {/* Phase: Choose Truth or Dare */}
                {gamePhase === 'choose' && isCurrentPlayer && (
                  <TruthDareButtons 
                    onTruth={() => onChooseTruthOrDare('truth')} 
                    onDare={() => onChooseTruthOrDare('dare')}
                    disabled={false}
                  />
                )}

                {/* Phase: Choose - Not current player */}
                {gamePhase === 'choose' && !isCurrentPlayer && (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body1" color="text.secondary">
                      Waiting for {currentPlayer} to choose Truth or Dare...
                    </Typography>
                  </Box>
                )}

                {/* Phase: Spin the Wheel */}
                {gamePhase === 'spin' && (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography>
                        {currentPlayer} chose <strong>{currentChoice?.toUpperCase()}</strong>!
                      </Typography>
                    </Alert>
                    <SpinningWheel 
                      onSpin={onSpin} 
                      isSpinning={isSpinning}
                      result={spinResult}
                      disabled={!isCurrentPlayer}
                      showSpinButton={isCurrentPlayer}
                    />
                    {!isCurrentPlayer && (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                        Waiting for {currentPlayer} to spin the wheel...
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Phase: Show Result */}
                {gamePhase === 'result' && truthDare && (
                  <Box>
                    <SpinningWheel 
                      onSpin={onSpin} 
                      isSpinning={false}
                      result={spinResult}
                      disabled={true}
                      showSpinButton={false}
                    />
                    <Alert 
                      severity={truthDare.type === 'truth' ? 'info' : 'warning'} 
                      sx={{ mt: 2 }}
                    >
                      <Typography variant="subtitle1" fontWeight="bold">
                        {truthDare.type === 'truth' ? '❓ TRUTH' : '⚡ DARE'} #{spinResult}
                      </Typography>
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {truthDare.content}
                      </Typography>
                    </Alert>

                    {/* Next Turn Button */}
                    <Box sx={{ textAlign: 'center', mt: 3 }}>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        size="large"
                        onClick={onNextTurn}
                      >
                        Next Player's Turn →
                      </Button>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>

        {/* Right: Members + Chat */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Players ({members.length}/10)
            </Typography>
            <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
              {members.map((m, index) => (
                <ListItem key={m.username} sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 20 }}>
                          #{turnOrder?.indexOf(m.username) + 1 || index + 1}
                        </Typography>
                        <span>{m.username}</span>
                        {m.username === room.host && <Chip label="Host" size="small" color="primary" />}
                        {m.username === currentPlayer && <Chip label="Turn" size="small" color="success" />}
                        {m.username === username && <Chip label="You" size="small" color="secondary" />}
                      </Stack>
                    }
                  />
                  <Stack direction="row" spacing={0.5}>
                    {m.videoEnabled ? <VideocamIcon fontSize="small" color="success" /> : <VideocamOffIcon fontSize="small" color="error" />}
                    {m.micEnabled ? <MicIcon fontSize="small" color="success" /> : <MicOffIcon fontSize="small" color="error" />}
                  </Stack>
                </ListItem>
              ))}
            </List>
          </Paper>

          <Paper sx={{ p: 2, height: 350 }}>
            <Chat messages={messages} onSend={onSendMessage} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}