import { Box, Paper, Typography, Button, List, ListItem, ListItemText, Stack, IconButton, Chip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function RoomList({ rooms, onJoin, onBack, onRefresh }) {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <IconButton onClick={onBack}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">Available Rooms</Typography>
          <IconButton onClick={onRefresh}>
            <RefreshIcon />
          </IconButton>
        </Stack>

        {rooms.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            No rooms available. Create one!
          </Typography>
        ) : (
          <List>
            {rooms.map(room => (
              <ListItem 
                key={room.roomId} 
                sx={{ 
                  bgcolor: 'background.default', 
                  mb: 1, 
                  borderRadius: 1,
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <ListItemText 
                  primary={room.roomName}
                  secondary={`Host: ${room.host}`}
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip 
                    label={`${room.members.length}/10`} 
                    size="small" 
                    color={room.members.length < 10 ? 'success' : 'error'}
                  />
                  <Button 
                    variant="contained" 
                    size="small"
                    onClick={() => onJoin(room.roomId)}
                    disabled={room.members.length >= 10}
                  >
                    Join
                  </Button>
                </Stack>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}