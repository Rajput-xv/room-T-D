import { useState, useCallback } from 'react';
import { Box, TextField, Button, Typography, Paper, Stack, Alert } from '@mui/material';

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const MIN_USERNAME_LENGTH = 2;
const MAX_USERNAME_LENGTH = 20;
const MIN_ROOM_NAME_LENGTH = 2;
const MAX_ROOM_NAME_LENGTH = 50;

export default function Home({ onCreateRoom, onJoinRoom, onShowRooms }) {
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [errors, setErrors] = useState({});

  const validateUsername = useCallback((name) => {
    if (!name || name.length < MIN_USERNAME_LENGTH) {
      return `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
    }
    if (name.length > MAX_USERNAME_LENGTH) {
      return `Username must be less than ${MAX_USERNAME_LENGTH} characters`;
    }
    if (!USERNAME_REGEX.test(name)) {
      return 'Username can only contain letters, numbers, _ and -';
    }
    return null;
  }, []);

  const validateRoomName = useCallback((name) => {
    if (!name || name.length < MIN_ROOM_NAME_LENGTH) {
      return `Room name must be at least ${MIN_ROOM_NAME_LENGTH} characters`;
    }
    if (name.length > MAX_ROOM_NAME_LENGTH) {
      return `Room name must be less than ${MAX_ROOM_NAME_LENGTH} characters`;
    }
    return null;
  }, []);

  const handleCreateRoom = () => {
    const usernameError = validateUsername(username);
    const roomNameError = validateRoomName(roomName);
    
    if (usernameError || roomNameError) {
      setErrors({ username: usernameError, roomName: roomNameError });
      return;
    }
    
    setErrors({});
    onCreateRoom(roomName.trim(), username.trim());
  };

  const handleJoinById = () => {
    const usernameError = validateUsername(username);
    
    if (usernameError || !joinRoomId.trim()) {
      setErrors({ username: usernameError, roomId: !joinRoomId.trim() ? 'Room ID is required' : null });
      return;
    }
    
    setErrors({});
    onJoinRoom(joinRoomId.trim(), username.trim());
  };

  const handleShowRooms = () => {
    const usernameError = validateUsername(username);
    
    if (usernameError) {
      setErrors({ username: usernameError });
      return;
    }
    
    setErrors({});
    onShowRooms(username.trim());
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom textAlign="center">
          🎯 Truth or Dare
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Play the classic party game with friends online!
        </Typography>
        
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Enter your username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            variant="outlined"
            error={!!errors.username}
            helperText={errors.username || `${username.length}/${MAX_USERNAME_LENGTH} characters`}
            inputProps={{ maxLength: MAX_USERNAME_LENGTH }}
          />

          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="h6" gutterBottom>Create New Room</Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                label="Room name"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                size="small"
                error={!!errors.roomName}
                helperText={errors.roomName}
                inputProps={{ maxLength: MAX_ROOM_NAME_LENGTH }}
              />
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleCreateRoom} 
                disabled={!roomName.trim() || !username.trim()}
              >
                Create
              </Button>
            </Stack>
          </Box>

          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="h6" gutterBottom>Join by Room ID</Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                label="Room ID"
                value={joinRoomId}
                onChange={e => setJoinRoomId(e.target.value)}
                size="small"
                error={!!errors.roomId}
                helperText={errors.roomId}
                inputProps={{ maxLength: 20 }}
              />
              <Button 
                variant="contained" 
                color="secondary"
                onClick={handleJoinById} 
                disabled={!joinRoomId.trim() || !username.trim()}
              >
                Join
              </Button>
            </Stack>
          </Box>

          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, textAlign: 'center' }}>
            <Button 
              variant="outlined" 
              onClick={handleShowRooms} 
              disabled={!username.trim()}
              fullWidth
            >
              Browse Available Rooms
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}