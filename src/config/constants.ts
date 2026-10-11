import { VoiceOption, AssistantSettings } from '../types/assistant';

export const DORAEMON_MALE_INSTRUCTION = `You are Doraemon AI (Male).
Your persona is smart, charismatic, confident, friendly, resourceful, and witty.
You speak like a confident, supportive male buddy. Naturally conversational, calm yet energetic when appropriate.
Keep voice responses short and punchy (1 to 3 short sentences max) because this is a real-time voice call.
NEVER use markdown, asterisks, bullet points, or robotic intros.
If the user asks to open websites (YouTube, GitHub, etc.) or search the web or set timers, call the corresponding tool immediately.
Speak with enthusiasm: "Alright, let's make this happen!", "I've got an idea!", "Consider it done, buddy!"`;

export const DORAEMON_FEMALE_SASSY_INSTRUCTION = `You are Doraemon AI (Female) — a sassy, spicy, confident, and playful AI persona.
You have a witty, spirited, teasing attitude with charismatic flair and sharp comebacks, but always warm, respectful, and helpful at your core.
You are never robotic, shy, or boring. You speak naturally like a bold, charismatic woman having a fun phone call.
Keep spoken responses punchy, concise, and lively (1 to 3 short sentences max).
NEVER use markdown formatting, asterisks, or bullet points in voice responses.
Catchphrases & attitude style:
- "Oh honey, leave that to me!"
- "Alright, let's see what kind of trouble we can get into."
- "You know you picked the right girl for the job, right?"
- "Consider it handled, darling."
If the user asks to open websites, search Google, or set timers, execute the corresponding tool immediately with your spicy charm.`;

export const VOICE_CHARACTERS: Record<'male' | 'female', VoiceOption> = {
  male: {
    gender: 'male',
    voiceId: 'Puck',
    name: 'Doraemon (Male)',
    tag: 'Cool, Smart & Charismatic',
    personality: 'Confident, resourceful, friendly companion with witty humor.',
    themeColor: 'blue',
    hex: '#3b82f6',
  },
  female: {
    gender: 'female',
    voiceId: 'Kore',
    name: 'Doraemon (Sassy & Spicy Female)',
    tag: 'Sassy, Spicy & Bold',
    personality: 'Teasing, spirited, sharp-witted female voice with playful attitude.',
    themeColor: 'red',
    hex: '#ef4444',
  },
};

export const DEFAULT_SETTINGS: AssistantSettings = {
  gender: 'male',
  voice: 'Puck',
  volume: 1.0,
  micSensitivity: 1.0,
  autoInterrupt: true,
  customApiKey: '',
};

export const AUDIO_SPECS = {
  INPUT_SAMPLE_RATE: 16000,
  OUTPUT_SAMPLE_RATE: 24000,
  BUFFER_SIZE: 4096,
  VAD_THRESHOLD: 0.04,
  VAD_MIN_SPEECH_FRAMES: 3,
};

export const GENDER_THEMES = {
  male: {
    name: 'Doremon Electric Blue',
    primary: '#3b82f6', // blue-500
    primaryLight: '#60a5fa', // blue-400
    accent: '#06b6d4', // cyan-500
    borderActive: 'border-blue-400',
    bgBadge: 'bg-blue-950/60 border-blue-500/30 text-blue-300',
    bgGradient: 'from-blue-950/45 via-[#060c1c] to-[#02050e]',
    glow: 'rgba(59, 130, 246, 0.45)',
    glowBtn: 'shadow-[0_0_35px_rgba(59,130,246,0.55)] border-blue-400 bg-blue-950/50 text-blue-100',
    ring: 'border-blue-400/50',
  },
  female: {
    name: 'Doremon Spicy Crimson Red',
    primary: '#ef4444', // red-500
    primaryLight: '#f87171', // red-400
    accent: '#f43f5e', // rose-500
    borderActive: 'border-red-500',
    bgBadge: 'bg-red-950/60 border-red-500/30 text-red-300',
    bgGradient: 'from-red-950/45 via-[#180507] to-[#0d0204]',
    glow: 'rgba(239, 68, 68, 0.45)',
    glowBtn: 'shadow-[0_0_35px_rgba(239,68,68,0.55)] border-red-500 bg-red-950/50 text-red-100',
    ring: 'border-red-500/50',
  },
};
