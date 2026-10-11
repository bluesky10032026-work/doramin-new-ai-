import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types/assistant';

interface WaveformProps {
  state: AssistantState;
  micLevel: number; // 0 to 1
  speakerLevel: number; // 0 to 1
  primaryColor?: string;
  accentColor?: string;
}

export const Waveform: React.FC<WaveformProps> = ({
  state,
  micLevel,
  speakerLevel,
  primaryColor = '#06b6d4',
  accentColor = '#a855f7',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);
  const smoothedLevelRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(120, rect.width || 320) * dpr;
      canvas.height = Math.max(30, rect.height || 56) * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      if (!canvas || !ctx) return;
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Determine active level based on state
      let targetLevel = 0;
      if (state === 'speaking') {
        targetLevel = Math.max(0.15, speakerLevel * 1.8);
      } else if (state === 'listening') {
        targetLevel = Math.max(0.08, micLevel * 1.6);
      } else if (state === 'thinking') {
        targetLevel = 0.25;
      } else if (state === 'connecting') {
        targetLevel = 0.12;
      } else {
        targetLevel = 0.04;
      }

      // Smooth interpolation to prevent abrupt flashing
      smoothedLevelRef.current += (targetLevel - smoothedLevelRef.current) * 0.12;
      const level = smoothedLevelRef.current;

      const speed = state === 'speaking' ? 0.08 : state === 'listening' ? 0.05 : 0.02;
      phaseRef.current += speed;
      const phase = phaseRef.current;

      // Draw multi-layered glowing sine waves
      const waveCount = 3;
      const colors = [
        primaryColor,
        accentColor,
        state === 'speaking' ? '#38bdf8' : '#34d399',
      ];

      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        ctx.lineWidth = (2 + w * 0.5) * dpr;
        ctx.strokeStyle = colors[w];
        ctx.globalAlpha = 0.6 - w * 0.15;

        const freq = 0.008 + w * 0.003;
        const offset = phase * (1 + w * 0.4) + w * 1.2;
        const amplitude = (height * 0.38) * level * (1 - w * 0.2);

        for (let x = 0; x <= width; x += 4 * dpr) {
          // Windowing envelope so wave tapers smoothly at both ends
          const normX = x / width;
          const envelope = Math.sin(normX * Math.PI);
          const y = centerY + Math.sin(x * freq + offset) * amplitude * envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Central glow dot if active
      if (level > 0.1) {
        ctx.save();
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 15 * dpr;
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = Math.min(1.0, level * 0.8);
        ctx.beginPath();
        ctx.arc(width / 2, centerY, 3 * dpr * (1 + level), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [state, micLevel, speakerLevel, primaryColor, accentColor]);

  return (
    <div className="w-full max-w-sm h-14 relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
};
