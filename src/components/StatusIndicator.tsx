import React from 'react';
import { AssistantState } from '../types/assistant';

interface StatusIndicatorProps {
  state: AssistantState;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ state }) => {
  const getBadgeConfig = () => {
    switch (state) {
      case 'listening':
        return {
          label: 'Listening',
          dotClass: 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]',
          borderClass: 'border-emerald-500/30 text-emerald-300 bg-emerald-950/40',
        };
      case 'speaking':
        return {
          label: 'Auron is speaking',
          dotClass: 'bg-cyan-400 animate-ping shadow-[0_0_10px_#22d3ee]',
          borderClass: 'border-cyan-500/40 text-cyan-200 bg-cyan-950/50',
        };
      case 'thinking':
        return {
          label: 'Thinking…',
          dotClass: 'bg-purple-400 animate-spin shadow-[0_0_8px_#c084fc]',
          borderClass: 'border-purple-500/30 text-purple-200 bg-purple-950/40',
        };
      case 'connecting':
        return {
          label: 'Connecting…',
          dotClass: 'bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]',
          borderClass: 'border-amber-500/30 text-amber-200 bg-amber-950/40',
        };
      case 'error':
        return {
          label: 'Connection Error',
          dotClass: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
          borderClass: 'border-rose-500/30 text-rose-300 bg-rose-950/40',
        };
      case 'disconnected':
      default:
        return {
          label: 'Tap to talk',
          dotClass: 'bg-slate-500',
          borderClass: 'border-slate-700/50 text-slate-400 bg-slate-900/40',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium tracking-wide backdrop-blur-md border transition-all duration-300 ${config.borderClass}`}
      role="status"
      aria-live="polite"
    >
      <span className={`w-2 h-2 rounded-full transition-all duration-300 ${config.dotClass}`} />
      <span>{config.label}</span>
    </div>
  );
};
