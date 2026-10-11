import React, { useState, useRef } from 'react';
import {
  Settings,
  AlertCircle,
  Flame,
  Send,
  Loader2,
  Volume2,
  Sparkles,
  Smartphone,
  X,
} from 'lucide-react';
import { useLiveSession } from './hooks/useLiveSession';
import { AuronAvatar } from './components/AuronAvatar';
import { MicButton } from './components/MicButton';
import { Waveform } from './components/Waveform';
import { StatusIndicator } from './components/StatusIndicator';
import { SettingsPanel } from './components/SettingsPanel';
import { BrowserActionHUD } from './components/BrowserActionHUD';
import { GENDER_THEMES } from './config/constants';

interface TextFeedbackMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSubmittingText, setIsSubmittingText] = useState(false);
  const [latestFeedback, setLatestFeedback] = useState<TextFeedbackMessage | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    state,
    micLevel,
    speakerLevel,
    settings,
    updateSettings,
    switchGender,
    activeAction,
    dismissActiveAction,
    errorMessage,
    startSession,
    stopSession,
    interrupt,
  } = useLiveSession();

  const isFemale = settings.gender === 'female';
  const currentTheme = isFemale ? GENDER_THEMES.female : GENDER_THEMES.male;

  // Handle text input submission & instant feedback from Doraemon AI
  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = inputText.trim();
    if (!prompt || isSubmittingText) return;

    setInputText('');
    setIsSubmittingText(true);

    // Set user feedback preview
    setLatestFeedback({
      id: `user_${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: Date.now(),
    });

    try {
      const response = await fetch('/api/interact-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: prompt,
          gender: settings.gender,
          customApiKey: settings.customApiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get feedback.');
      }

      const replyText = data.replyText || "I'm right here with you!";

      setLatestFeedback({
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: Date.now(),
      });

      // Play synthesized audio feedback if available
      if (data.audioBase64) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        audioRef.current = audio;
        setIsAudioPlaying(true);
        audio.onended = () => setIsAudioPlaying(false);
        audio.onerror = () => setIsAudioPlaying(false);
        await audio.play().catch(() => setIsAudioPlaying(false));
      }
    } catch (err) {
      console.error('Error getting text feedback:', err);
      setLatestFeedback({
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: isFemale
          ? "Oops, something tripped up my circuits, honey. Try again!"
          : "Sorry buddy, I had a momentary connection hiccup. Let's try that again!",
        timestamp: Date.now(),
      });
    } finally {
      setIsSubmittingText(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between bg-[#04060d] text-slate-100 font-sans select-none overflow-hidden relative transition-colors duration-700 bg-radial-[at_50%_40%] ${currentTheme.bgGradient}`}
    >
      {/* Dynamic Cybernetic Grid & Ambient Atmospheric Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem]"
        aria-hidden="true"
      />
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[650px] rounded-full pointer-events-none blur-[140px] opacity-30 transition-all duration-700"
        style={{ backgroundColor: currentTheme.primary }}
        aria-hidden="true"
      />

      {/* Top Header: Doraemon AI Branding + Gender Switcher (Male Blue / Female Red) + Settings */}
      <header className="relative z-30 w-full px-4 sm:px-6 py-4 flex items-center justify-between backdrop-blur-md border-b border-slate-800/40">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse transition-colors duration-500 shadow-sm"
              style={{ backgroundColor: currentTheme.primary }}
            />
            <h1 className="text-sm sm:text-base font-bold tracking-wider uppercase font-mono text-slate-100">
              Doraemon AI
            </h1>
          </div>

          <span
            className={`hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-full border transition-colors duration-300 ${
              isFemale
                ? 'bg-red-950/60 border-red-500/40 text-red-300'
                : 'bg-blue-950/60 border-blue-500/40 text-blue-300'
            }`}
          >
            {isFemale ? 'Sassy Red Mode' : 'Electric Blue Mode'}
          </span>
        </div>

        {/* Center/Right Character Gender Toggle: Male (Blue) vs Female (Red) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800 backdrop-blur-md">
            {/* Male Blue Toggle */}
            <button
              onClick={() => switchGender('male')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !isFemale
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.6)]'
                  : 'text-slate-400 hover:text-blue-300'
              }`}
              title="Select Male Character (Electric Blue Theme)"
              aria-label="Select Male Character"
            >
              <span>♂ Male</span>
            </button>

            {/* Sassy Female Red Toggle */}
            <button
              onClick={() => switchGender('female')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isFemale
                  ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.6)]'
                  : 'text-slate-400 hover:text-red-300'
              }`}
              title="Select Sassy & Spicy Female Character (Crimson Red Theme)"
              aria-label="Select Sassy Female Character"
            >
              <span>♀ Sassy</span>
              <Flame className="w-3 h-3 text-red-200" />
            </button>
          </div>

          {/* Status Badge */}
          <StatusIndicator state={state} />

          {/* Settings Trigger with API Key indicator */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900/70 hover:bg-slate-800/80 border transition-all cursor-pointer shadow-sm relative ${
              isFemale
                ? 'hover:border-red-500/60 border-slate-800'
                : 'hover:border-blue-500/60 border-slate-800'
            }`}
            aria-label="Open Settings and API Key Configuration"
            title="Settings & API Key"
          >
            <Settings className="w-4 h-4" />
            {settings.customApiKey && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-[#070b16]" />
            )}
          </button>
        </div>
      </header>

      {/* Holographic Tool Action Notification HUD */}
      <BrowserActionHUD action={activeAction} onDismiss={dismissActiveAction} />

      {/* Connection Failure Error Banner */}
      {state === 'error' && errorMessage && (
        <div className="relative z-20 mx-4 mt-2 p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 backdrop-blur-md flex items-center justify-between gap-3 text-xs text-rose-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={startSession}
            className="px-3 py-1 rounded-lg bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors shrink-0 cursor-pointer"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Central Visual Character Area (Avatar + Floating Feedback Banner) */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 min-h-0">
        <AuronAvatar
          state={isAudioPlaying ? 'speaking' : isSubmittingText ? 'thinking' : state}
          gender={settings.gender}
          micLevel={micLevel}
          speakerLevel={isAudioPlaying ? 0.6 : speakerLevel}
          primaryColor={currentTheme.primary}
          accentColor={currentTheme.accent}
          glowColor={currentTheme.glow}
        />

        {/* Live Text Feedback Speech Card from Doraemon AI */}
        {latestFeedback && (
          <div className="absolute top-4 sm:top-8 max-w-md w-11/12 z-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div
              className={`p-3.5 rounded-2xl backdrop-blur-xl border shadow-xl flex items-start gap-3 ${
                latestFeedback.sender === 'assistant'
                  ? isFemale
                    ? 'bg-red-950/85 border-red-500/50 text-red-100 shadow-[0_8px_30px_rgba(239,68,68,0.25)]'
                    : 'bg-blue-950/85 border-blue-500/50 text-blue-100 shadow-[0_8px_30px_rgba(59,130,246,0.25)]'
                  : 'bg-slate-900/90 border-slate-700 text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  latestFeedback.sender === 'assistant'
                    ? isFemale
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-blue-500/20 text-blue-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {latestFeedback.sender === 'assistant' ? (
                  isAudioPlaying ? (
                    <Volume2 className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )
                ) : (
                  <span className="text-xs font-mono font-bold">YOU</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${
                      latestFeedback.sender === 'assistant'
                        ? isFemale
                          ? 'text-red-400'
                          : 'text-blue-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {latestFeedback.sender === 'assistant'
                      ? isFemale
                        ? 'Doraemon (Sassy Female)'
                        : 'Doraemon (Male)'
                      : 'You wrote'}
                  </span>
                  <button
                    onClick={() => setLatestFeedback(null)}
                    className="text-slate-400 hover:text-white p-0.5"
                    aria-label="Dismiss feedback"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs sm:text-sm font-medium leading-relaxed break-words">
                  {latestFeedback.text}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Command Area: Interactive Textbox + Waveform + Mic Button */}
      <footer className="relative z-20 w-full pb-6 pt-2 px-4 flex flex-col items-center justify-center gap-3">
        {/* Real-time Voice Waveform */}
        <Waveform
          state={isAudioPlaying ? 'speaking' : state}
          micLevel={micLevel}
          speakerLevel={isAudioPlaying ? 0.7 : speakerLevel}
          primaryColor={currentTheme.primary}
          accentColor={currentTheme.accent}
        />

        {/* Central Futuristic Microphone Button */}
        <MicButton
          state={isAudioPlaying ? 'speaking' : state}
          gender={settings.gender}
          micLevel={micLevel}
          speakerLevel={isAudioPlaying ? 0.8 : speakerLevel}
          onStart={startSession}
          onStop={stopSession}
          onInterrupt={() => {
            if (audioRef.current) {
              audioRef.current.pause();
              setIsAudioPlaying(false);
            }
            interrupt();
          }}
        />

        {/* Text Box for Direct Text Input & Feedback */}
        <div className="w-full max-w-md pt-1">
          <form
            onSubmit={handleSendText}
            className="relative flex items-center shadow-lg"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isFemale
                  ? 'Message Sassy Doraemon... (or speak anytime)'
                  : 'Message Doraemon AI... (or speak anytime)'
              }
              disabled={isSubmittingText}
              className={`w-full py-2.5 pl-4 pr-12 rounded-2xl text-xs bg-slate-900/80 border text-slate-100 placeholder:text-slate-500 backdrop-blur-xl transition-all duration-300 focus:outline-none ${
                isFemale
                  ? 'border-red-500/40 focus:border-red-400 focus:ring-2 focus:ring-red-500/30'
                  : 'border-blue-500/40 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30'
              }`}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSubmittingText}
              aria-label="Send message"
              className={`absolute right-1.5 p-2 rounded-xl text-white transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer ${
                isFemale
                  ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_12px_rgba(220,38,38,0.5)]'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.5)]'
              }`}
            >
              {isSubmittingText ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>
          <div className="text-[10px] text-center text-slate-500 mt-1 font-mono">
            Type or speak anytime • Real-time voice & text feedback
          </div>
        </div>
      </footer>

      {/* Slide-in Settings Drawer with Gemini API Key & Character Config */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        state={state}
        settings={settings}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
}
