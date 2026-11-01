import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';

interface CanvasCaptchaProps {
  code: string;
  theme?: 'light' | 'dark';
}

export default function CanvasCaptcha({ code, theme = 'dark' }: CanvasCaptchaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, width, height);
    
    if (theme === 'dark') {
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(0, 0, width, height);

      // Subtle interference dots in cobalt/crimson
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.arc(
          Math.random() * width,
          Math.random() * height,
          Math.random() * 1.5,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = i % 3 === 0 
          ? `rgba(239, 68, 68, ${Math.random() * 0.35})` 
          : `rgba(59, 130, 246, ${Math.random() * 0.35})`;
        ctx.fill();
      }

      // Subtle security lines in cobalt/crimson
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.strokeStyle = i % 2 === 0
          ? `rgba(239, 68, 68, ${Math.random() * 0.25})`
          : `rgba(59, 130, 246, ${Math.random() * 0.25})`;
        ctx.lineWidth = 1 + Math.random();
        ctx.stroke();
      }

      // Text in electric cobalt
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#60A5FA';
    } else {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.arc(
          Math.random() * width,
          Math.random() * height,
          Math.random() * 1.5,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = i % 3 === 0
          ? `rgba(225, 29, 72, ${Math.random() * 0.25})`
          : `rgba(37, 99, 235, ${Math.random() * 0.25})`;
        ctx.fill();
      }

      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.strokeStyle = `rgba(148, 163, 184, ${Math.random() * 0.4})`;
        ctx.lineWidth = 1 + Math.random();
        ctx.stroke();
      }

      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1D4ED8';
    }

    // Characters with transformation
    const charWidth = width / (code.length + 1);
    for (let i = 0; i < code.length; i++) {
      ctx.save();
      const x = charWidth * (i + 1);
      const y = height / 2;
      
      ctx.translate(x, y);
      const angle = (Math.random() - 0.5) * 0.35;
      ctx.rotate(angle);
      
      const jitter = (Math.random() - 0.5) * 4;
      ctx.fillText(code[i], 0, jitter);
      ctx.restore();
    }
  }, [code, theme]);

  return (
    <Box
      sx={{
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0,0,0,0.1)',
        bgcolor: theme === 'dark' ? '#161B20' : '#ffffff',
        height: 42,
        boxShadow: theme === 'dark' ? 'inset 0 1px 3px rgba(0,0,0,0.4)' : 'inset 0 0 10px rgba(0,0,0,0.05)',
      }}
    >
      <canvas ref={canvasRef} width={110} height={42} style={{ display: 'block' }} />
    </Box>
  );
}
