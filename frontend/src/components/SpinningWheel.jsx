import { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';

const numbers = Array.from({ length: 10 }, (_, i) => i + 1);
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];

// Animation duration in ms - matches server's 3000ms timeout
const SPIN_DURATION = 2800;
const EXTRA_SPINS = 5;

export default function SpinningWheel({ onSpin, forcedResult = null, disabled = false, isSpinning = false }) {
  const SEGMENTS = numbers.length;
  const SEGMENT_ANGLE = 360 / SEGMENTS;

  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);

  const rotationRef = useRef(0);
  const animRef = useRef(null);
  const lastResultRef = useRef(null);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []);

  // When server sends isSpinning=true with forcedResult, start animation
  useEffect(() => {
    if (isSpinning && forcedResult != null && forcedResult !== lastResultRef.current && !isAnimating) {
      lastResultRef.current = forcedResult;
      animateToTarget(forcedResult);
    }
  }, [isSpinning, forcedResult]);

  const normalize = (deg) => ((deg % 360) + 360) % 360;

  const segmentCenterAngle = (index) => index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;

  const computeTargetRotation = (current, index) => {
    const targetModulo = normalize(180 - segmentCenterAngle(index));
    return current - normalize(current) + EXTRA_SPINS * 360 + targetModulo;
  };

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const animateToTarget = (targetNumber) => {
    setIsAnimating(true);
    setHasSpun(false);

    const current = rotationRef.current;
    const finalIndex = numbers.indexOf(targetNumber);
    if (finalIndex === -1) {
      setIsAnimating(false);
      return;
    }

    const target = computeTargetRotation(current, finalIndex);
    const distance = target - current;
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / SPIN_DURATION, 1);
      const easedProgress = easeOutCubic(progress);

      rotationRef.current = current + distance * easedProgress;
      setRotation(rotationRef.current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        rotationRef.current = target;
        setRotation(target);
        setIsAnimating(false);
        setHasSpun(true);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  // Click handler - just trigger server spin, don't animate locally
  const handleSpinClick = () => {
    if (isAnimating || disabled || isSpinning) return;
    onSpin?.();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h6">🎡 Spin the Wheel</Typography>

      <Box sx={{ position: 'relative', my: 2 }}>
        <Box
          sx={{
            position: 'absolute',
            top: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: '22px solid #e53935',
            zIndex: 10
          }}
        />

        <svg
          width={260}
          height={260}
          viewBox="0 0 260 260"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: '50% 50%'
          }}
        >
          {numbers.map((n, i) => {
            const start = (i / SEGMENTS) * 360 - 90;
            const end = ((i + 1) / SEGMENTS) * 360 - 90;

            const r = 110;
            const cx = 130;
            const cy = 130;

            const x1 = cx + r * Math.cos((start * Math.PI) / 180);
            const y1 = cy + r * Math.sin((start * Math.PI) / 180);
            const x2 = cx + r * Math.cos((end * Math.PI) / 180);
            const y2 = cy + r * Math.sin((end * Math.PI) / 180);

            const textAngle = ((start + end) / 2) * (Math.PI / 180);
            const tx = cx + r * 0.6 * Math.cos(textAngle);
            const ty = cy + r * 0.6 * Math.sin(textAngle);

            return (
              <g key={n}>
                <path
                  d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                  fill={colors[i]}
                  stroke="#fff"
                  strokeWidth="2"
                />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontWeight="700"
                >
                  {n}
                </text>
              </g>
            );
          })}

          <circle cx="130" cy="130" r="24" fill="#333" />
        </svg>
      </Box>

      {!isAnimating && !isSpinning && !hasSpun && (
        <Button
          variant="contained"
          size="large"
          onClick={handleSpinClick}
          disabled={disabled}
        >
          Spin
        </Button>
      )}
    </Box>
  );
}
