import { Box, Button, Stack, Typography } from '@mui/material';

export default function TruthDareButtons({ onTruth, onDare, disabled }) {
  return (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Typography variant="h5" gutterBottom>🎯 Choose Your Fate!</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pick Truth or Dare, then spin the wheel!
      </Typography>
      <Stack direction="row" spacing={3} justifyContent="center">
        <Button
          variant="contained"
          color="info"
          size="large"
          onClick={onTruth}
          disabled={disabled}
          sx={{ 
            minWidth: 140, 
            py: 2.5, 
            fontSize: '1.1rem',
            boxShadow: 3,
            '&:hover': { boxShadow: 6 }
          }}
        >
          ❓ Truth
        </Button>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={onDare}
          disabled={disabled}
          sx={{ 
            minWidth: 140, 
            py: 2.5, 
            fontSize: '1.1rem',
            boxShadow: 3,
            '&:hover': { boxShadow: 6 }
          }}
        >
          ⚡ Dare
        </Button>
      </Stack>
    </Box>
  );
}