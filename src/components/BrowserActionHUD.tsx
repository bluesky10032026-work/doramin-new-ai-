import React from 'react';
import { ExternalLink, Search, Palette, Timer, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { BrowserActionItem } from '../types/assistant';

interface BrowserActionHUDProps {
  action: BrowserActionItem | null;
  onDismiss: () => void;
}

export const BrowserActionHUD: React.FC<BrowserActionHUDProps> = ({
  action,
  onDismiss,
}) => {
  if (!action) return null;

  const getToolIcon = () => {
    switch (action.toolName) {
      case 'openWebsite':
        return <ExternalLink className="w-5 h-5 text-cyan-400" />;
      case 'searchWeb':
        return <Search className="w-5 h-5 text-emerald-400" />;
      case 'changeThemeMood':
        return <Palette className="w-5 h-5 text-purple-400" />;
      case 'setTimer':
        return <Timer className="w-5 h-5 text-amber-400" />;
      default:
        return <ExternalLink className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="relative rounded-2xl p-4 bg-slate-900/90 border border-cyan-500/40 backdrop-blur-xl shadow-[0_10px_35px_rgba(6,182,212,0.25)] flex flex-col gap-2">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30">
              {getToolIcon()}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/90 block">
                Browser Function Call
              </span>
              <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">
                {action.title}
              </h4>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/60 transition-colors"
            aria-label="Dismiss action notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Details / URL */}
        {action.target && (
          <div className="text-xs font-mono text-slate-300 bg-slate-950/70 p-2 rounded-lg border border-slate-800 break-all flex items-center justify-between gap-2">
            <span className="truncate">{action.target}</span>
            <a
              href={action.target}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-sans px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 shrink-0 font-medium transition-all"
            >
              Open Tab
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Status notice */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          {action.status === 'success' ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{action.details || 'Browser action executed safely.'}</span>
            </>
          ) : action.status === 'blocked' ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{action.details || 'Action blocked for browser safety.'}</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span>{action.details || 'Auron executed action.'}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
