import React from 'react';
import { Mic, MicOff, Loader2, RotateCcw, Volume2, Sparkles } from 'lucide-react';
import { AssistantState, CharacterGender } from '../types/assistant';

interface MicButtonProps {
  state: AssistantState;
  gender: CharacterGender;
  micLevel: number;
  speakerLevel: number;
  onStart: () => void;
  onStop: () => void;
  onInterrupt: () => void;
}

export const MicButton: React.FC<MicButtonProps> = ({
  state,
  gender,
  micLevel,
  speakerLevel,
  onStart,
  onStop,
  onInterrupt,
}) => {
  const isFemale = gender === 'female';

  const handleClick = () => {
    switch (state) {
      case 'disconnected':
      case 'error':
        onStart();
        break;
      case 'speaking':
        onInterrupt();
        break;
      case 'listening':
      case 'thinking':
      case 'connecting':
        onStop();
        break;
    }
  };

  const getButtonVisuals = () => {
    switch (state) {
      case 'connecting':
        return {
          glow: 'shadow-[0_0_25px_rgba(251,191,36,0.5)] border-amber-400/60 bg-amber-950/40 text-amber-300',
          ring: 'border-amber-400/40 animate-spin',
          icon: <Loader2 className="w-8 h-8 animate-spin" />,
          label: 'Connecting…',
          subLabel: 'Connecting to Gemini Live',
        };
      case 'listening':
        return {
          glow: isFemale
            ? 'shadow-[0_0_35px_rgba(239,68,68,0.55)] border-red-500 bg-red-950/40 text-red-100'
            : 'shadow-[0_0_35px_rgba(59,130,246,0.55)] border-blue-400 bg-blue-950/40 text-blue-100',
          ring: isFemale ? 'border-red-500/50 animate-ping' : 'border-blue-400/50 animate-ping',
          icon: (
            <Mic
              className="w-8 h-8 transition-transform duration-150"
              style={{ transform: `scale(${1 + micLevel * 0.45})` }}
            />
          ),
          label: 'Listening',
          subLabel: isFemale ? 'Sassy Doraemon is listening' : 'Doraemon is listening',
        };
      case 'speaking':
        return {
          glow: isFemale
            ? 'shadow-[0_0_45px_rgba(239,68,68,0.7)] border-red-400 bg-red-950/60 text-red-50'
            : 'shadow-[0_0_45px_rgba(59,130,246,0.7)] border-blue-400 bg-blue-950/60 text-blue-50',
          ring: isFemale ? 'border-red-400/70 animate-pulse' : 'border-blue-400/70 animate-pulse',
          icon: (
            <Volume2
              className="w-8 h-8 transition-transform duration-100"
              style={{ transform: `scale(${1 + speakerLevel * 0.5})` }}
            />
          ),
          label: isFemale ? 'Sassy Voice Active' : 'Doraemon is speaking',
          subLabel: 'Tap anytime to interrupt',
        };
      case 'thinking':
        return {
          glow: isFemale
            ? 'shadow-[0_0_30px_rgba(244,63,94,0.5)] border-rose-400/60 bg-rose-950/40 text-rose-200'
            : 'shadow-[0_0_30px_rgba(99,102,241,0.5)] border-indigo-400/60 bg-indigo-950/40 text-indigo-200',
          ring: isFemale ? 'border-rose-400/40 animate-pulse' : 'border-indigo-400/40 animate-pulse',
          icon: <Sparkles className="w-8 h-8 animate-pulse" />,
          label: 'Thinking…',
          subLabel: 'Formulating response',
        };
      case 'error':
        return {
          glow: 'shadow-[0_0_25px_rgba(244,63,94,0.5)] border-rose-500/70 bg-rose-950/40 text-rose-300',
          ring: 'border-rose-500/40',
          icon: <RotateCcw className="w-8 h-8" />,
          label: 'Retry Connection',
          subLabel: 'Tap to reconnect',
        };
      case 'disconnected':
      default:
        return {
          glow: isFemale
            ? 'shadow-[0_0_20px_rgba(239,68,68,0.25)] border-slate-700/80 bg-slate-900/60 text-slate-200 hover:border-red-500/70 hover:text-red-300'
            : 'shadow-[0_0_20px_rgba(59,130,246,0.25)] border-slate-700/80 bg-slate-900/60 text-slate-200 hover:border-blue-400/70 hover:text-blue-300',
          ring: 'border-transparent',
          icon: <Mic className="w-8 h-8" />,
          label: 'Tap to Start',
          subLabel: isFemale ? 'Talk to Sassy Doraemon' : 'Talk to Doraemon',
        };
    }
  };

  const visuals = getButtonVisuals();

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative group flex items-center justify-center">
        {(state === 'listening' || state === 'speaking') && (
          <div
            className={`absolute -inset-3 rounded-full border transition-all duration-300 pointer-events-none ${visuals.ring}`}
          />
        )}

        <button
          onClick={handleClick}
          aria-label={visuals.label}
          className={`relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center border-2 backdrop-blur-xl transition-all duration-300 active:scale-95 focus:outline-none focus:ring-4 cursor-pointer ${
            isFemale ? 'focus:ring-red-500/30' : 'focus:ring-blue-500/30'
          } ${visuals.glow}`}
        >
          {visuals.icon}
        </button>

        {(state === 'listening' || state === 'speaking' || state === 'thinking') && (
          <button
            onClick={onStop}
            title="Disconnect session"
            aria-label="Disconnect"
            className="absolute -right-10 bottom-0 p-2 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 transition-all text-xs flex items-center justify-center backdrop-blur-md cursor-pointer"
          >
            <MicOff className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="text-center select-none pointer-events-none">
        <div className="text-sm font-semibold tracking-wide text-slate-100">
          {visuals.label}
        </div>
        <div className="text-xs text-slate-400 font-mono mt-0.5">
          {visuals.subLabel}
        </div>
      </div>
    </div>
  );
};
