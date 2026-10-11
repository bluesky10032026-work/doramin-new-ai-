export type AssistantState =
  | 'disconnected'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export type CharacterGender = 'male' | 'female';

export interface VoiceOption {
  gender: CharacterGender;
  voiceId: 'Puck' | 'Kore';
  name: string;
  tag: string;
  personality: string;
  themeColor: 'blue' | 'red';
  hex: string;
}

export interface AssistantSettings {
  gender: CharacterGender;
  voice: 'Puck' | 'Kore';
  volume: number;
  micSensitivity: number;
  autoInterrupt: boolean;
  customApiKey: string;
}

export interface ToolCallPayload {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface BrowserActionItem {
  id: string;
  toolName: string;
  title: string;
  target?: string;
  timestamp: number;
  status: 'pending' | 'success' | 'blocked' | 'error';
  details?: string;
}

export interface AudioMetrics {
  micVolume: number;
  speakerVolume: number;
  isUserSpeaking: boolean;
  isAssistantSpeaking: boolean;
}

export interface SystemStats {
  connectedSince: number | null;
  turnsCount: number;
  toolsCalledCount: number;
}
