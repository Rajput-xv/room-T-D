import { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';

const numbers = Array.from({ length: 10 }, (_, i) => i + 1);
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];

export default function SpinningWheel({ onSpin, forcedResult = null, disabled = false }) {
  const SEGMENTS = numbers.length;
  const SEGMENT_ANGLE = 360 / SEGMENTS;

  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [hasSpun, setHasSpun] = useState(false);

  const rotationRef = useRef(0);
  const animRef = useRef(null);
  const spinningRef = useRef(false);

  const DECEL = 200; // controls how "heavy" the wheel feels (lower = longer spin)
  const EXTRA_SPINS_MIN = 5;
  const EXTRA_SPINS_MAX = 8;

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const normalize = (deg) => ((deg % 360) + 360) % 360;

  // angle of a segment’s center measured clockwise from pointer (top)
  const segmentCenterAngle = (index) =>
    index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;

  // compute absolute rotation needed to land exactly under pointer (at bottom)
  const computeTargetRotation = (current, index, extraSpins) => {
    const targetModulo = normalize(180 - segmentCenterAngle(index));
    return current - normalize(current) + extraSpins * 360 + targetModulo;
  };

  const startSpin = () => {
    if (spinningRef.current || disabled) return;

    spinningRef.current = true;
    setIsSpinning(true);
    setResult(null);

    const current = rotationRef.current;

    const finalIndex =
      forcedResult && numbers.includes(forcedResult)
        ? numbers.indexOf(forcedResult)
        : Math.floor(Math.random() * SEGMENTS);

    const extraSpins =
      Math.floor(Math.random() * (EXTRA_SPINS_MAX - EXTRA_SPINS_MIN + 1)) +
      EXTRA_SPINS_MIN;

    const target = computeTargetRotation(current, finalIndex, extraSpins);
    const distance = target - current;

    // v² = 2as → initial angular velocity
    let velocity = Math.sqrt(2 * DECEL * distance);
    let lastTime = null;

    const animate = (time) => {
      if (!lastTime) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      velocity = Math.max(0, velocity - DECEL * dt);
      rotationRef.current += velocity * dt;
      setRotation(rotationRef.current);

      if (velocity <= 0) {
        rotationRef.current = target;
        setRotation(target);
        setIsSpinning(false);
        spinningRef.current = false;
        setHasSpun(true);

        const finalNumber = numbers[finalIndex];
        setResult(finalNumber);
        onSpin?.(finalNumber);
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6">🎡 Spin the Wheel</Typography>

      <Box sx={{ position: 'relative', display: 'inline-block', my: 2 }}>
        {/* pointer at bottom, pointing up */}
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

      {!isSpinning && !hasSpun && (
        <Button
          variant="contained"
          size="large"
          onClick={startSpin}
          disabled={disabled}
        >
          Spin
        </Button>
      )}

      {/* {result && !isSpinning && (
        <Typography variant="h5" sx={{ mt: 2 }}>
          Result: {result}
        </Typography>
      )} */}
    </Box>
  );
}
