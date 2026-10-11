import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  Sliders,
  ShieldCheck,
  Sparkles,
  Info,
  Check,
  Play,
  Key,
  Eye,
  EyeOff,
  User,
  Flame,
} from 'lucide-react';
import { AssistantSettings, AssistantState, CharacterGender } from '../types/assistant';
import { VOICE_CHARACTERS } from '../config/constants';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: AssistantState;
  settings: AssistantSettings;
  onUpdateSettings: (newSettings: AssistantSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  state,
  settings,
  onUpdateSettings,
}) => {
  const [micPermission, setMicPermission] = useState<string>('prompt');
  const [testPlaying, setTestPlaying] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(settings.customApiKey || '');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [keySavedFeedback, setKeySavedFeedback] = useState<boolean>(false);

  useEffect(() => {
    setApiKeyInput(settings.customApiKey || '');
  }, [settings.customApiKey]);

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        // @ts-ignore
        .query({ name: 'microphone' })
        .then((perm) => {
          setMicPermission(perm.state);
          perm.onchange = () => setMicPermission(perm.state);
        })
        .catch(() => {
          setMicPermission('unknown');
        });
    }
  }, []);

  const handleSaveApiKey = () => {
    onUpdateSettings({
      ...settings,
      customApiKey: apiKeyInput.trim(),
    });
    setKeySavedFeedback(true);
    setTimeout(() => setKeySavedFeedback(false), 2500);
  };

  const handleClearApiKey = () => {
    setApiKeyInput('');
    onUpdateSettings({
      ...settings,
      customApiKey: '',
    });
    setKeySavedFeedback(true);
    setTimeout(() => setKeySavedFeedback(false), 2500);
  };

  const handleSelectGender = (gender: CharacterGender) => {
    onUpdateSettings({
      ...settings,
      gender,
      voice: gender === 'female' ? 'Kore' : 'Puck',
    });
  };

  const handleTestSpeaker = () => {
    if (testPlaying) return;
    setTestPlaying(true);
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const baseFreq = settings.gender === 'female' ? 587.33 : 440; // D5 for female, A4 for male
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.2 * settings.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);

      setTimeout(() => {
        setTestPlaying(false);
        ctx.close();
      }, 400);
    } catch {
      setTestPlaying(false);
    }
  };

  if (!isOpen) return null;

  const isFemale = settings.gender === 'female';
  const accentTheme = isFemale ? 'text-red-400 border-red-500/40' : 'text-blue-400 border-blue-500/40';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="relative w-full max-w-md h-full bg-[#070b16] border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto text-slate-100 shadow-2xl animate-in slide-in-from-right duration-300">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-xl border ${
                  isFemale
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                }`}
              >
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-100">Doraemon AI Settings</h3>
                <p className="text-xs text-slate-400">Live Voice Persona & API Setup</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors cursor-pointer"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-5 space-y-6">
            {/* 1. Gemini API Key Option (User explicitly requested) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase font-mono tracking-wider text-amber-400 flex items-center gap-1.5 font-semibold">
                  <Key className="w-3.5 h-3.5" />
                  Gemini API Key
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {settings.customApiKey ? 'Custom Key' : 'Default Key'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <p className="text-xs text-slate-300">
                  Enter your Google Gemini API Key below. If left blank, the app uses the environment key automatically.
                </p>

                <div className="relative flex items-center">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy... (leave blank for default)"
                    className="w-full pr-10 pl-3 py-2 text-xs font-mono rounded-lg bg-slate-950/80 border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-200"
                    aria-label={showApiKey ? 'Hide key' : 'Show key'}
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={handleSaveApiKey}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-medium transition-all cursor-pointer text-center"
                  >
                    {keySavedFeedback ? 'Key Saved!' : 'Save Key'}
                  </button>

                  {apiKeyInput && (
                    <button
                      onClick={handleClearApiKey}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700 text-xs transition-all cursor-pointer"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Character Selection: Male (Blue) vs Sassy Female (Red) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className={`text-xs uppercase font-mono tracking-wider flex items-center gap-1.5 font-semibold ${
                  isFemale ? 'text-red-400' : 'text-blue-400'
                }`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  Voice Character ({isFemale ? 'Red Theme' : 'Blue Theme'})
                </h4>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border ${
                  isFemale
                    ? 'bg-red-950/60 text-red-300 border-red-500/40'
                    : 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                }`}>
                  {isFemale ? 'Female Active' : 'Male Active'}
                </span>
              </div>

              {/* Only 2 Voice Characters: Male & Female */}
              <div className="grid grid-cols-1 gap-3">
                {/* Male Character - Blue */}
                <button
                  onClick={() => handleSelectGender('male')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    !isFemale
                      ? 'bg-blue-950/50 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-xs">
                        ♂
                      </div>
                      <span className="font-bold text-sm text-slate-100">
                        {VOICE_CHARACTERS.male.name}
                      </span>
                    </div>
                    {!isFemale && <Check className="w-4 h-4 text-blue-400" />}
                  </div>

                  <p className="text-xs text-blue-400 font-mono mt-1">
                    Theme: Electric Blue • Voice: {VOICE_CHARACTERS.male.voiceId}
                  </p>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {VOICE_CHARACTERS.male.personality}
                  </p>
                </button>

                {/* Sassy & Spicy Female Character - Red */}
                <button
                  onClick={() => handleSelectGender('female')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    isFemale
                      ? 'bg-red-950/50 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center font-bold text-xs">
                        ♀
                      </div>
                      <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                        {VOICE_CHARACTERS.female.name}
                        <Flame className="w-3.5 h-3.5 text-red-400" />
                      </span>
                    </div>
                    {isFemale && <Check className="w-4 h-4 text-red-400" />}
                  </div>

                  <p className="text-xs text-red-400 font-mono mt-1">
                    Theme: Spicy Crimson Red • Voice: {VOICE_CHARACTERS.female.voiceId}
                  </p>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {VOICE_CHARACTERS.female.personality}
                  </p>
                </button>
              </div>
            </div>

            {/* 3. Audio Diagnostics & Controls */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-wider text-slate-300 flex items-center gap-1.5 font-semibold">
                <Volume2 className="w-3.5 h-3.5" />
                Audio & Hardware Diagnostics
              </h4>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Connection State</span>
                  <span className="capitalize font-mono font-medium text-emerald-400">
                    {state}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Microphone Permission</span>
                  <span className="capitalize font-mono text-cyan-400">
                    {micPermission}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Speaker Output</span>
                  <button
                    onClick={handleTestSpeaker}
                    disabled={testPlaying}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-medium text-xs cursor-pointer transition-all ${
                      isFemale
                        ? 'bg-red-950/60 text-red-300 border-red-500/40 hover:bg-red-900/60'
                        : 'bg-blue-950/60 text-blue-300 border-blue-500/40 hover:bg-blue-900/60'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    {testPlaying ? 'Testing…' : 'Play Sound Chime'}
                  </button>
                </div>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Assistant Volume</span>
                  <span className={`font-mono ${isFemale ? 'text-red-400' : 'text-blue-400'}`}>
                    {Math.round(settings.volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, volume: parseFloat(e.target.value) })
                  }
                  className={`w-full cursor-pointer ${isFemale ? 'accent-red-500' : 'accent-blue-500'}`}
                />
              </div>

              {/* Natural Interruption Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <div>
                  <span className="text-xs font-medium text-slate-200 block">
                    Voice Interruption
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Interrupts Doremon when you speak
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoInterrupt}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, autoInterrupt: e.target.checked })
                  }
                  className={`w-4 h-4 rounded cursor-pointer ${isFemale ? 'accent-red-500' : 'accent-blue-500'}`}
                />
              </div>
            </div>

            {/* 4. Android App & GitHub Export */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-1.5 font-semibold">
                <Smartphone className="w-3.5 h-3.5" />
                Android App & Repository
              </h4>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Android PWA Ready</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-mono">
                    Installable
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  To install as an Android app: open this web URL on your Android device (Chrome or Edge), tap the three dots menu (<span className="text-slate-200">⋮</span>), and choose <strong className="text-slate-200">"Add to Home screen"</strong> or <strong className="text-slate-200">"Install app"</strong>.
                </p>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Exported GitHub Repo:</span>
                  <a
                    href="https://github.com/bluesky10032026-work/doramin-new-ai-"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
                  >
                    doramin-new-ai- ↗
                  </a>
                </div>
              </div>
            </div>

            {/* 5. About */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1">
              <h5 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                About Doraemon AI
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Dual-personality voice and text assistant with Male (Blue) and Sassy Female (Red) modes powered by Google Gemini Live API.
              </p>
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Real-time Audio & Text Architecture
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
