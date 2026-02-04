import { useState, useRef, useEffect, useCallback } from 'react';
import { Box, TextField, IconButton, Typography, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export default function Chat({ messages, onSend }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmedInput = input.trim();
    if (trimmedInput && trimmedInput.length <= 500) {
      onSend(trimmedInput);
      setInput('');
    }
  }, [input, onSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h6" gutterBottom>💬 Chat</Typography>
      
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        mb: 2, 
        p: 1, 
        bgcolor: 'background.default',
        borderRadius: 1
      }}>
        {messages.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={2}>
            No messages yet
          </Typography>
        ) : (
          messages.map((msg, i) => (
            <Box key={i} sx={{ mb: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" color="primary">
                  {msg.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </Typography>
              </Stack>
              <Typography variant="body2">{msg.message}</Typography>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Stack direction="row" spacing={1}>
        <TextField
          fullWidth
          size="small"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          variant="outlined"
          inputProps={{ maxLength: 500 }}
        />
        <IconButton color="primary" onClick={handleSend} disabled={!input.trim()}>
          <SendIcon />
        </IconButton>
      </Stack>
    </Box>
  );
}