import { AssistantSettings } from '../types/assistant';

export const REMOTE_API_BASE = 'https://ais-dev-j4z7jd44myqnzy5i6bwjy6-750640534111.asia-east1.run.app';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  if (window.location.protocol === 'file:' || !window.location.host) {
    return REMOTE_API_BASE;
  }
  return '';
}

export function getLiveWsUrl(): string {
  if (typeof window === 'undefined') return '';
  if (window.location.protocol === 'file:' || !window.location.host) {
    return 'wss://ais-dev-j4z7jd44myqnzy5i6bwjy6-750640534111.asia-east1.run.app/api/live';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/live`;
}

export interface DirectGeminiResponse {
  replyText: string;
  audioBase64?: string | null;
}

/**
 * Send text input either via direct Gemini API (if user entered custom key or inside APK)
 * or through the backend proxy.
 */
export async function sendTextInput(
  text: string,
  settings: AssistantSettings
): Promise<DirectGeminiResponse> {
  const isFemale = settings.gender === 'female';
  const customKey = settings.customApiKey?.trim();

  // If user entered a custom Gemini API Key in Settings, call Google Gemini REST API directly
  // This guarantees 100% offline-from-proxy independence on any Android phone!
  if (customKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        customKey
      )}`;
      const promptInstruction = isFemale
        ? 'You are Doraemon AI (Female), a sassy, spicy, confident and witty AI persona. Keep responses short and punchy (1 to 2 sentences max).'
        : 'You are Doraemon AI (Male), a smart, charismatic, confident and friendly buddy. Keep responses short and punchy (1 to 2 sentences max).';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: promptInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text }],
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const replyText =
          data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
          (isFemale
            ? "Oh darling, I'm right here!"
            : "Got it buddy, let's make it happen!");
        return { replyText };
      }
    } catch (e) {
      console.warn('Direct Gemini call fallback to backend:', e);
    }
  }

  // Otherwise, use the backend proxy endpoint
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/interact-text`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      gender: settings.gender,
      customApiKey: settings.customApiKey,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server responded with status ${response.status}`);
  }

  const data = await response.json();
  return {
    replyText: data.replyText,
    audioBase64: data.audioBase64,
  };
}
