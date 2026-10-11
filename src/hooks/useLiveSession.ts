import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AssistantState,
  AssistantSettings,
  BrowserActionItem,
  CharacterGender,
  SystemStats,
} from '../types/assistant';
import { DEFAULT_SETTINGS } from '../config/constants';
import { ToolManager } from '../services/ToolManager';
import { LiveSession } from '../services/LiveSession';

const API_KEY_STORAGE_KEY = 'doremon_gemini_api_key';
const GENDER_STORAGE_KEY = 'doremon_character_gender';

export function useLiveSession() {
  const [state, setState] = useState<AssistantState>('disconnected');
  const [micLevel, setMicLevel] = useState<number>(0);
  const [speakerLevel, setSpeakerLevel] = useState<number>(0);

  // Initialize settings with localStorage values if available
  const [settings, setSettings] = useState<AssistantSettings>(() => {
    const savedKey = typeof window !== 'undefined' ? localStorage.getItem(API_KEY_STORAGE_KEY) || '' : '';
    const savedGender = (typeof window !== 'undefined' ? localStorage.getItem(GENDER_STORAGE_KEY) : null) as CharacterGender | null;
    const gender = savedGender === 'female' ? 'female' : 'male';
    return {
      ...DEFAULT_SETTINGS,
      gender,
      voice: gender === 'female' ? 'Kore' : 'Puck',
      customApiKey: savedKey,
    };
  });

  const [actionsHistory, setActionsHistory] = useState<BrowserActionItem[]>([]);
  const [activeAction, setActiveAction] = useState<BrowserActionItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<SystemStats>({
    connectedSince: null,
    turnsCount: 0,
    toolsCalledCount: 0,
  });

  const toolManagerRef = useRef<ToolManager | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);

  // Initialize ToolManager and LiveSession instance once
  useEffect(() => {
    const tm = new ToolManager();
    toolManagerRef.current = tm;

    // Listen for browser actions (e.g. open website)
    const unsubscribe = tm.onAction((action) => {
      setActiveAction(action);
      setActionsHistory((prev) => [action, ...prev].slice(0, 20));
      setStats((prev) => ({ ...prev, toolsCalledCount: prev.toolsCalledCount + 1 }));

      // Auto-hide HUD notification after 8 seconds
      setTimeout(() => {
        setActiveAction((curr) => (curr?.id === action.id ? null : curr));
      }, 8000);
    });

    const session = new LiveSession(tm, settings, {
      onStateChange: (newState) => {
        setState(newState);
        if (newState === 'listening') {
          setErrorMessage(null);
        }
        if (newState === 'speaking') {
          setStats((prev) => ({ ...prev, turnsCount: prev.turnsCount + 1 }));
        }
      },
      onMicLevel: (lvl) => {
        setMicLevel(lvl);
      },
      onSpeakerLevel: (lvl) => {
        setSpeakerLevel(lvl);
      },
      onError: (err) => {
        setErrorMessage(err);
      },
    });

    liveSessionRef.current = session;

    return () => {
      unsubscribe();
      session.destroy();
    };
  }, []);

  const updateSettings = useCallback((newSettings: AssistantSettings) => {
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      localStorage.setItem(API_KEY_STORAGE_KEY, newSettings.customApiKey || '');
      localStorage.setItem(GENDER_STORAGE_KEY, newSettings.gender);
    }
    if (liveSessionRef.current) {
      liveSessionRef.current.updateSettings(newSettings);
    }
  }, []);

  const switchGender = useCallback((gender: CharacterGender) => {
    const updated: AssistantSettings = {
      ...settings,
      gender,
      voice: gender === 'female' ? 'Kore' : 'Puck',
    };
    updateSettings(updated);
  }, [settings, updateSettings]);

  const setCustomApiKey = useCallback((key: string) => {
    const updated: AssistantSettings = {
      ...settings,
      customApiKey: key,
    };
    updateSettings(updated);
  }, [settings, updateSettings]);

  const startSession = useCallback(async () => {
    setErrorMessage(null);
    if (!liveSessionRef.current) return;
    try {
      await liveSessionRef.current.connect();
      setStats((prev) => ({ ...prev, connectedSince: Date.now() }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  }, []);

  const stopSession = useCallback(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.disconnect();
    }
  }, []);

  const interrupt = useCallback(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.interrupt();
    }
  }, []);

  const dismissActiveAction = useCallback(() => {
    setActiveAction(null);
  }, []);

  return {
    state,
    micLevel,
    speakerLevel,
    settings,
    updateSettings,
    switchGender,
    setCustomApiKey,
    actionsHistory,
    activeAction,
    dismissActiveAction,
    errorMessage,
    stats,
    startSession,
    stopSession,
    interrupt,
    toolManager: toolManagerRef.current,
    audioPlayer: liveSessionRef.current?.getAudioPlayer() || null,
  };
}
