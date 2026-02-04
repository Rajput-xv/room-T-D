import { useState, useEffect } from 'react';
import { Box, Button, Typography, keyframes } from '@mui/material';

const numbers = Array.from({ length: 10 }, (_, i) => i + 1);
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(1080deg); }
`;

export default function SpinningWheel({ onSpin, isSpinning, result, disabled, showSpinButton = true }) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (result) {
      // Calculate rotation to land on result
      const segmentAngle = 360 / 10;
      const targetAngle = (result - 1) * segmentAngle + segmentAngle / 2;
      setRotation(1080 + targetAngle);
    }
  }, [result]);

  const handleSpin = () => {
    setRotation(0);
    if (onSpin) onSpin();
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>🎡 Spin the Wheel</Typography>
      
      <Box sx={{ position: 'relative', display: 'inline-block', my: 2 }}>
        {/* Pointer */}
        <Box sx={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '20px solid #ff0000',
          zIndex: 10
        }} />

        <svg 
          width="220" 
          height="220" 
          viewBox="0 0 220 220"
          style={{
            transition: isSpinning ? 'transform 3s ease-out' : 'none',
            transform: `rotate(${rotation}deg)`
          }}
        >
          {numbers.map((n, i) => {
            const startAngle = (i / 10) * 360;
            const endAngle = ((i + 1) / 10) * 360;
            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (endAngle - 90) * Math.PI / 180;
            
            const x1 = 110 + 100 * Math.cos(startRad);
            const y1 = 110 + 100 * Math.sin(startRad);
            const x2 = 110 + 100 * Math.cos(endRad);
            const y2 = 110 + 100 * Math.sin(endRad);
            
            const textAngle = ((startAngle + endAngle) / 2 - 90) * Math.PI / 180;
            const textX = 110 + 70 * Math.cos(textAngle);
            const textY = 110 + 70 * Math.sin(textAngle);

            return (
              <g key={n}>
                <path
                  d={`M 110 110 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                  fill={colors[i]}
                  stroke="#fff"
                  strokeWidth="2"
                />
                <text 
                  x={textX} 
                  y={textY} 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  fontSize="18"
                  fontWeight="bold"
                  fill="#040404"
                >
                  {n}
                </text>
              </g>
            );
          })}
          <circle cx="110" cy="110" r="20" fill="#333" />
        </svg>
      </Box>

      {showSpinButton && (
        <Box>
          <Button 
            variant="contained" 
            color="primary"
            size="large"
            onClick={handleSpin} 
            disabled={disabled || isSpinning}
          >
            {isSpinning ? '🎰 Spinning...' : '🎯 Spin the Wheel!'}
          </Button>
        </Box>
      )}

      {result && !isSpinning && (
        <Typography variant="h5" sx={{ mt: 2, color: colors[(result - 1) % 10] }}>
          #{result}
        </Typography>
      )}
    </Box>
  );
}