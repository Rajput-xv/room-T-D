import { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Container, Box, Snackbar, Alert } from '@mui/material';
import Home from './components/Home';
import RoomList from './components/RoomList';
import GameRoom from './components/GameRoom';
import socketService from './services/socketService';
import webrtcService from './services/webrtcService';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1'
    },
    secondary: {
      main: '#ec4899'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    }
  }
});

export default function App() {
  const [view, setView] = useState('home'); // 'home', 'rooms', 'game'
  const [username, setUsername] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [truthDare, setTruthDare] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [gamePhase, setGamePhase] = useState('waiting'); // 'waiting', 'choose', 'spin', 'result'
  const [currentChoice, setCurrentChoice] = useState(null); // 'truth' or 'dare'
  const [turnOrder, setTurnOrder] = useState([]);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  // Use ref to track current room for activity updates (avoids closure issue)
  const currentRoomRef = useRef(null);
  
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    const socket = socketService.connect();

    // Room events
    socket.on('room-created', ({ roomId, roomName, room }) => {
      setCurrentRoom(room);
      setMembers(room.members);
      setView('game');
      showSnackbar('Room created successfully!', 'success');
    });

    socket.on('room-joined', ({ room }) => {
      setCurrentRoom(room);
      setMembers(room.members);
      setView('game');
      showSnackbar('Joined room successfully!', 'success');
    });

    socket.on('available-rooms', ({ rooms }) => {
      setRooms(rooms);
    });

    socket.on('member-joined', ({ username, members }) => {
      setMembers(members);
      showSnackbar(`${username} joined the room`, 'info');
    });

    socket.on('member-left', ({ username, members }) => {
      setMembers(members);
      showSnackbar(`${username} left the room`, 'info');
    });

    socket.on('member-kicked', ({ username, reason }) => {
      setMembers(prev => prev.filter(m => m.username !== username));
      showSnackbar(`${username} was kicked: ${reason}`, 'warning');
    });

    socket.on('kicked', ({ reason }) => {
      showSnackbar(`You were kicked: ${reason}`, 'error');
      handleLeaveRoom();
    });

    // Room ended by host - room deleted from database
    socket.on('room-ended', ({ message }) => {
      showSnackbar(message || 'Room has ended', 'warning');
      handleLeaveRoom();
    });

    // Game events
    socket.on('game-started', ({ room, gameState }) => {
      setCurrentRoom(room);
      if (gameState) {
        setGamePhase(gameState.gamePhase);
        setCurrentPlayer(gameState.currentPlayer);
        setCurrentChoice(gameState.currentChoice);
        setTurnOrder(gameState.turnOrder);
      }
      showSnackbar('Game started! First player\'s turn.', 'success');
    });

    socket.on('choice-made', ({ username, choice, gamePhase }) => {
      setCurrentChoice(choice);
      setGamePhase(gamePhase);
      showSnackbar(`${username} chose ${choice}!`, 'info');
    });

    socket.on('wheel-spinning', ({ spinning }) => {
      setIsSpinning(spinning);
    });

    socket.on('wheel-stopped', ({ result, content, type }) => {
      setIsSpinning(false);
      setSpinResult(result);
      setTruthDare({ type, content });
      setGamePhase('result');
    });

    socket.on('turn-changed', ({ currentPlayer, gamePhase, currentTurnIndex, turnOrder }) => {
      setCurrentPlayer(currentPlayer);
      setGamePhase(gamePhase);
      setTurnOrder(turnOrder);
      setCurrentChoice(null);
      setTruthDare(null);
      setSpinResult(null);
      showSnackbar(`It's ${currentPlayer}'s turn!`, 'info');
    });

    // Legacy events (for compatibility)
    socket.on('current-player-updated', ({ playerNumber, username }) => {
      setCurrentPlayer(username);
    });

    socket.on('truth-question', ({ question }) => {
      setTruthDare({ type: 'truth', content: question });
    });

    socket.on('dare-task', ({ task }) => {
      setTruthDare({ type: 'dare', content: task });
    });

    // Chat events
    socket.on('chat-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    // Media events
    socket.on('member-audio-toggled', ({ username, enabled }) => {
      setMembers(prev => prev.map(m => 
        m.username === username ? { ...m, audioEnabled: enabled } : m
      ));
    });

    socket.on('member-mic-toggled', ({ username, enabled }) => {
      setMembers(prev => prev.map(m => 
        m.username === username ? { ...m, micEnabled: enabled } : m
      ));
    });

    socket.on('member-video-toggled', ({ username, enabled }) => {
      setMembers(prev => prev.map(m => 
        m.username === username ? { ...m, videoEnabled: enabled } : m
      ));
    });

    // Error handling
    socket.on('error', ({ message }) => {
      setError(message);
      showSnackbar(message, 'error');
      setTimeout(() => setError(null), 5000);
    });

    // Activity tracking interval - use ref to avoid closure issue
    const activityInterval = setInterval(() => {
      if (currentRoomRef.current) {
        socketService.updateActivity(currentRoomRef.current.roomId);
      }
    }, 30000);

    return () => {
      clearInterval(activityInterval);
      socketService.disconnect();
      webrtcService.cleanup();
    };
  }, []);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleCreateRoom = (roomName, user) => {
    if (!roomName?.trim() || !user?.trim()) {
      showSnackbar('Please fill in all fields', 'error');
      return;
    }
    setUsername(user);
    socketService.createRoom(roomName, user);
  };

  const handleJoinRoom = (roomId, user) => {
    if (!roomId?.trim() || !user?.trim()) {
      showSnackbar('Please fill in all fields', 'error');
      return;
    }
    setUsername(user);
    socketService.joinRoom(roomId, user);
  };

  const handleShowRooms = (user) => {
    if (!user?.trim()) {
      showSnackbar('Please enter a username', 'error');
      return;
    }
    setUsername(user);
    socketService.getAvailableRooms();
    setView('rooms');
  };

  const handleLeaveRoom = () => {
    if (currentRoom) {
      socketService.leaveRoom(currentRoom.roomId);
    }
    webrtcService.cleanup();
    setCurrentRoom(null);
    setMembers([]);
    setMessages([]);
    setCurrentPlayer(null);
    setTruthDare(null);
    setSpinResult(null);
    setGamePhase('waiting');
    setCurrentChoice(null);
    setTurnOrder([]);
    setView('home');
  };

  // End room (host only) - deletes room from database
  const handleEndRoom = () => {
    if (currentRoom) {
      socketService.endRoom(currentRoom.roomId);
    }
  };

  const handleSendMessage = (message) => {
    socketService.sendMessage(currentRoom.roomId, username, message);
  };

  const handleSpin = () => {
    socketService.spinWheel(currentRoom.roomId);
  };

  const handleChooseTruthOrDare = (choice) => {
    socketService.chooseTruthOrDare(currentRoom.roomId, choice);
  };

  const handleNextTurn = () => {
    socketService.nextTurn(currentRoom.roomId);
  };

  const handleSelectTruth = () => {
    socketService.selectTruth(currentRoom.roomId);
  };

  const handleSelectDare = () => {
    socketService.selectDare(currentRoom.roomId);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          {error && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'error.main', borderRadius: 1 }}>
              {error}
            </Box>
          )}

          {view === 'home' && (
            <Home 
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              onShowRooms={handleShowRooms}
            />
          )}

          {view === 'rooms' && (
            <RoomList 
              rooms={rooms}
              onJoin={(roomId) => handleJoinRoom(roomId, username)}
              onBack={() => setView('home')}
              onRefresh={() => socketService.getAvailableRooms()}
            />
          )}

          {view === 'game' && currentRoom && (
            <GameRoom
              room={currentRoom}
              username={username}
              members={members}
              messages={messages}
              currentPlayer={currentPlayer}
              truthDare={truthDare}
              isSpinning={isSpinning}
              spinResult={spinResult}
              gamePhase={gamePhase}
              currentChoice={currentChoice}
              turnOrder={turnOrder}
              onLeave={handleLeaveRoom}
              onEndRoom={handleEndRoom}
              onSendMessage={handleSendMessage}
              onSpin={handleSpin}
              onChooseTruthOrDare={handleChooseTruthOrDare}
              onNextTurn={handleNextTurn}
              onSelectTruth={handleSelectTruth}
              onSelectDare={handleSelectDare}
            />
          )}
        </Box>
      </Container>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}