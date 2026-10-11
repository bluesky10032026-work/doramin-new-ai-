import React, { useEffect, useRef } from 'react';
import { AssistantState, CharacterGender } from '../types/assistant';

interface DoremonAvatarProps {
  state: AssistantState;
  gender: CharacterGender;
  micLevel: number;
  speakerLevel: number;
  primaryColor?: string;
  accentColor?: string;
  glowColor?: string;
}

export const AuronAvatar: React.FC<DoremonAvatarProps> = ({
  state,
  gender,
  micLevel,
  speakerLevel,
  primaryColor = '#3b82f6',
  accentColor = '#60a5fa',
  glowColor = 'rgba(59, 130, 246, 0.45)',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const rotationRef = useRef<number>(0);
  const innerEnergyRef = useRef<number>(0.2);

  const isFemale = gender === 'female';

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
      canvas.width = Math.max(200, rect.width || 360) * dpr;
      canvas.height = Math.max(200, rect.height || 360) * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particle field
    const particleCount = isFemale ? 56 : 48;
    const particles = Array.from({ length: particleCount }).map((_, i) => ({
      angle: (i / particleCount) * Math.PI * 2,
      distance: 75 + Math.random() * 65,
      speed: (isFemale ? 0.005 : 0.003) + Math.random() * 0.008,
      size: 1 + Math.random() * 2.5,
      opacity: 0.25 + Math.random() * 0.65,
      wobble: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      if (!canvas || !ctx) return;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Target energy from audio level or state
      let targetEnergy = 0.15;
      if (state === 'speaking') {
        targetEnergy = 0.45 + speakerLevel * 1.6;
        rotationRef.current += isFemale ? 0.022 : 0.016;
      } else if (state === 'listening') {
        targetEnergy = 0.25 + micLevel * 1.3;
        rotationRef.current += 0.009;
      } else if (state === 'thinking') {
        targetEnergy = 0.35 + Math.sin(Date.now() * 0.006) * 0.16;
        rotationRef.current += 0.035;
      } else if (state === 'connecting') {
        targetEnergy = 0.2 + Math.sin(Date.now() * 0.004) * 0.1;
        rotationRef.current += 0.02;
      } else {
        // Disconnected / Idle
        targetEnergy = 0.12 + Math.sin(Date.now() * 0.002) * 0.05;
        rotationRef.current += 0.004;
      }

      // Smooth energy dampening
      innerEnergyRef.current += (targetEnergy - innerEnergyRef.current) * 0.1;
      const energy = innerEnergyRef.current;
      const baseRadius = Math.min(width, height) * 0.22;
      const rot = rotationRef.current;

      // 1. Ambient outer glow halo
      const glowGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.3, cx, cy, baseRadius * 2.2);
      glowGrad.addColorStop(0, glowColor);
      glowGrad.addColorStop(0.5, isFemale ? 'rgba(239, 68, 68, 0.09)' : 'rgba(59, 130, 246, 0.09)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Orbital particles
      particles.forEach((p) => {
        p.angle += p.speed * (state === 'speaking' ? 2.0 : 1.0);
        p.wobble += 0.025;
        const currentDist = (baseRadius + p.distance * (0.8 + energy * 0.55)) * dpr;
        const px = cx + Math.cos(p.angle) * currentDist;
        const py = cy + Math.sin(p.angle) * currentDist + Math.sin(p.wobble) * 4 * dpr;

        ctx.save();
        ctx.fillStyle = isFemale ? (p.size > 2 ? '#ff6467' : '#ef4444') : (p.size > 2 ? '#60a5fa' : '#3b82f6');
        ctx.globalAlpha = Math.min(1.0, p.opacity * (0.5 + energy));
        ctx.beginPath();
        ctx.arc(px, py, p.size * dpr * (1 + energy * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 3. Outer Holographic Ring (with dashes and rotation)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2 * dpr;
      ctx.globalAlpha = 0.45 + Math.min(0.5, energy * 0.6);
      ctx.setLineDash([16 * dpr, 8 * dpr, 6 * dpr, 8 * dpr]);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.45 * dpr * (1 + energy * 0.1), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 4. Middle Counter-Rotating Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-rot * 1.3);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2.5 * dpr;
      ctx.globalAlpha = 0.5 + Math.min(0.45, energy * 0.5);
      ctx.setLineDash([35 * dpr, 15 * dpr, 70 * dpr, 20 * dpr]);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.2 * dpr * (1 + energy * 0.15), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 5. Reactive Harmonic Polygon / Sonic Lattice
      const vertices = isFemale ? 7 : 8;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot * 0.7);
      ctx.strokeStyle = isFemale ? '#fca5a5' : '#93c5fd';
      ctx.lineWidth = 1.5 * dpr;
      ctx.globalAlpha = 0.35 + energy * 0.4;
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let i = 0; i < vertices; i++) {
        const theta = (i / vertices) * Math.PI * 2;
        const radiusMod = (baseRadius * 0.95 + Math.sin(rot * 4 + i) * 7 * energy) * dpr;
        const vx = Math.cos(theta) * radiusMod;
        const vy = Math.sin(theta) * radiusMod;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // 6. Central Neural Core (Pulsing Energy Sphere)
      const coreRadius = (baseRadius * 0.65 + energy * 20) * dpr;
      const coreGrad = ctx.createRadialGradient(
        cx - coreRadius * 0.25,
        cy - coreRadius * 0.25,
        coreRadius * 0.1,
        cx,
        cy,
        coreRadius
      );

      if (isFemale) {
        // Spicy Sassy Red
        if (state === 'speaking') {
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.3, '#f87171');
          coreGrad.addColorStop(0.7, '#dc2626');
          coreGrad.addColorStop(1, 'rgba(153, 27, 27, 0.4)');
        } else if (state === 'listening') {
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.3, '#fb7185');
          coreGrad.addColorStop(0.7, '#e11d48');
          coreGrad.addColorStop(1, 'rgba(159, 18, 57, 0.4)');
        } else if (state === 'thinking') {
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.3, '#f43f5e');
          coreGrad.addColorStop(0.7, '#be123c');
          coreGrad.addColorStop(1, 'rgba(136, 19, 55, 0.4)');
        } else {
          coreGrad.addColorStop(0, '#fca5a5');
          coreGrad.addColorStop(0.4, '#b91c1c');
          coreGrad.addColorStop(0.8, '#450a0a');
          coreGrad.addColorStop(1, 'rgba(69, 10, 10, 0.3)');
        }
      } else {
        // Doraemon Male Blue
        if (state === 'speaking') {
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.3, '#60a5fa');
          coreGrad.addColorStop(0.7, '#2563eb');
          coreGrad.addColorStop(1, 'rgba(30, 64, 175, 0.4)');
        } else if (state === 'listening') {
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.3, '#38bdf8');
          coreGrad.addColorStop(0.7, '#0284c7');
          coreGrad.addColorStop(1, 'rgba(7, 89, 133, 0.4)');
        } else if (state === 'thinking') {
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.3, '#818cf8');
          coreGrad.addColorStop(0.7, '#4f46e5');
          coreGrad.addColorStop(1, 'rgba(49, 46, 129, 0.4)');
        } else {
          coreGrad.addColorStop(0, '#93c5fd');
          coreGrad.addColorStop(0.4, '#1d4ed8');
          coreGrad.addColorStop(0.8, '#0f172a');
          coreGrad.addColorStop(1, 'rgba(15, 23, 42, 0.3)');
        }
      }

      ctx.save();
      ctx.shadowColor = isFemale ? '#ef4444' : '#3b82f6';
      ctx.shadowBlur = (22 + energy * 35) * dpr;
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 7. Core Inner Iris
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1 * dpr;
      ctx.globalAlpha = 0.5 + energy * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius * 0.42, 0, Math.PI * 2);
      ctx.stroke();

      // Center bright singularity
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, (3.5 + energy * 4.5) * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [state, gender, isFemale, micLevel, speakerLevel, primaryColor, accentColor, glowColor]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[460px] max-h-[460px] aspect-square transition-all duration-300"
        aria-label={`Doraemon Avatar (${gender}, ${state})`}
      />

      <div className="absolute bottom-6 flex flex-col items-center pointer-events-none">
        <span className={`text-xs uppercase tracking-widest font-mono font-semibold transition-colors duration-300 ${
          isFemale ? 'text-rose-400' : 'text-blue-400'
        }`}>
          {state === 'speaking'
            ? `${isFemale ? 'Sassy Female Voice Active' : 'Doraemon Voice Active'}`
            : state === 'listening'
            ? 'Listening To Your Voice'
            : state === 'thinking'
            ? 'Neural Processing…'
            : state === 'connecting'
            ? 'Connecting To Live Model'
            : `${isFemale ? 'Doraemon AI (Sassy Female Ready)' : 'Doraemon AI (Male Ready)'}`}
        </span>
      </div>
    </div>
  );
};
