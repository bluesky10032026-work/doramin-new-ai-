import { AssistantState, AssistantSettings, ToolCallPayload } from '../types/assistant';
import { AudioPlayer } from './AudioPlayer';
import { AudioStreamer } from './AudioStreamer';
import { ToolManager } from './ToolManager';
import { getLiveWsUrl } from './apiClient';

export interface LiveSessionCallbacks {
  onStateChange: (state: AssistantState) => void;
  onMicLevel: (level: number) => void;
  onSpeakerLevel: (level: number) => void;
  onError: (errorMsg: string) => void;
}

export class LiveSession {
  private state: AssistantState = 'disconnected';
  private ws: WebSocket | null = null;
  private audioPlayer: AudioPlayer;
  private audioStreamer: AudioStreamer | null = null;
  private toolManager: ToolManager;
  private callbacks: LiveSessionCallbacks;
  private settings: AssistantSettings;
  private pingInterval: number | null = null;
  private animFrameId: number | null = null;
  private isConnecting: boolean = false;

  constructor(
    toolManager: ToolManager,
    settings: AssistantSettings,
    callbacks: LiveSessionCallbacks
  ) {
    this.toolManager = toolManager;
    this.settings = settings;
    this.callbacks = callbacks;
    this.audioPlayer = new AudioPlayer(settings.volume);

    this.audioPlayer.setOnPlaybackStateChange((isPlaying) => {
      if (this.state === 'speaking' && !isPlaying) {
        this.setState('listening');
      } else if (isPlaying && (this.state === 'listening' || this.state === 'thinking')) {
        this.setState('speaking');
      }
    });

    this.startMetricsLoop();
  }

  public getState(): AssistantState {
    return this.state;
  }

  public getAudioPlayer(): AudioPlayer {
    return this.audioPlayer;
  }

  public getAudioStreamer(): AudioStreamer | null {
    return this.audioStreamer;
  }

  public updateSettings(newSettings: AssistantSettings) {
    const previousGender = this.settings.gender;
    const previousKey = this.settings.customApiKey;
    this.settings = newSettings;
    this.audioPlayer.setVolume(newSettings.volume);
    if (this.audioStreamer) {
      this.audioStreamer.setSensitivity(newSettings.micSensitivity);
    }
    // If gender changed while connected, re-init character
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (newSettings.gender !== previousGender) {
        this.ws.send(JSON.stringify({ type: 'update_character', gender: newSettings.gender }));
      }
      if (newSettings.customApiKey !== previousKey) {
        this.ws.send(JSON.stringify({ type: 'update_api_key', customApiKey: newSettings.customApiKey }));
      }
    }
  }

  private setState(newState: AssistantState) {
    if (this.state === newState) return;
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  private startMetricsLoop() {
    const loop = () => {
      const spkLevel = this.audioPlayer.getAudioLevel();
      this.callbacks.onSpeakerLevel(spkLevel);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Connects to Gemini Live session and begins microphone streaming
   */
  public async connect(): Promise<void> {
    if (this.state === 'connecting' || this.state === 'listening' || this.state === 'speaking') {
      return;
    }

    this.isConnecting = true;
    this.setState('connecting');

    try {
      // 1. Initialize AudioContext for playback (needs user interaction)
      await this.audioPlayer.initContext();

      // 2. Establish WebSocket connection to backend Live API proxy
      const wsUrl = getLiveWsUrl();

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timed out. Check server and network.'));
        }, 12000);

        try {
          this.ws = new WebSocket(wsUrl);
        } catch (wsErr) {
          clearTimeout(timeout);
          reject(wsErr);
          return;
        }

        this.ws.onopen = () => {
          clearTimeout(timeout);
          // Send handshake configuration with character gender & optional custom API key
          this.ws?.send(
            JSON.stringify({
              type: 'init',
              gender: this.settings.gender,
              voice: this.settings.gender === 'female' ? 'Kore' : 'Puck',
              customApiKey: this.settings.customApiKey,
            })
          );
          resolve();
        };

        this.ws.onerror = (e) => {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection failed.'));
        };

        this.ws.onclose = (e) => {
          clearTimeout(timeout);
          if (this.state !== 'disconnected') {
            this.handleDisconnect('Session ended or disconnected from server.');
          }
        };

        this.ws.onmessage = (event) => {
          this.handleServerMessage(event.data);
        };
      });

      // 3. Start microphone capture
      this.audioStreamer = new AudioStreamer(
        {
          onAudioChunk: (base64) => {
            this.sendAudio(base64);
          },
          onMicLevel: (level) => {
            this.callbacks.onMicLevel(level);
          },
          onVoiceActivity: () => {
            // Natural voice interruption: if Auron is speaking and user speaks
            if (this.settings.autoInterrupt && (this.state === 'speaking' || this.audioPlayer.getIsPlaying())) {
              this.interrupt();
            }
          },
          onError: (err) => {
            this.handleDisconnect(`Microphone error: ${err.message}`);
          },
        },
        this.settings.micSensitivity
      );

      await this.audioStreamer.start();

      this.isConnecting = false;
      this.setState('listening');

      // Keepalive heartbeat
      this.pingInterval = window.setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);
    } catch (err) {
      this.isConnecting = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.callbacks.onError(msg);
      this.handleDisconnect(msg);
    }
  }

  /**
   * Sends 16kHz PCM audio chunk to the server
   */
  public sendAudio(base64Pcm: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'audio',
          audio: base64Pcm,
        })
      );
    }
  }

  /**
   * Natural interruption: clears output audio queue, notifies model, sets state to listening
   */
  public interrupt(): void {
    this.audioPlayer.stop();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }

    if (this.state === 'speaking' || this.state === 'thinking') {
      this.setState('listening');
    }
  }

  /**
   * Processes incoming server messages from Gemini Live
   */
  private async handleServerMessage(rawData: string | ArrayBuffer) {
    try {
      const text = typeof rawData === 'string' ? rawData : new TextDecoder().decode(rawData);
      const msg = JSON.parse(text);

      switch (msg.type) {
        case 'ready': {
          this.setState('listening');
          break;
        }

        case 'audio': {
          if (msg.audio) {
            if (this.state !== 'speaking') {
              this.setState('speaking');
            }
            await this.audioPlayer.playChunk(msg.audio);
          }
          break;
        }

        case 'interrupted': {
          this.audioPlayer.stop();
          this.setState('listening');
          break;
        }

        case 'turn_complete': {
          if (!this.audioPlayer.getIsPlaying()) {
            this.setState('listening');
          }
          break;
        }

        case 'tool_call': {
          this.setState('thinking');
          const calls: ToolCallPayload[] = msg.calls || [];
          for (const call of calls) {
            await this.handleToolCall(call);
          }
          break;
        }

        case 'error': {
          console.warn('Live API Server reported error:', msg.error);
          this.callbacks.onError(msg.error || 'Server error occurred');
          break;
        }

        case 'pong':
          break;

        default:
          break;
      }
    } catch (err) {
      console.error('Failed to parse message from Live API server:', err);
    }
  }

  /**
   * Handles Gemini Live tool call execution and sends response back
   */
  private async handleToolCall(call: ToolCallPayload) {
    try {
      const result = await this.toolManager.executeTool(call.name, call.args);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'tool_response',
            id: call.id,
            name: call.name,
            response: result,
          })
        );
      }
    } catch (err) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'tool_response',
            id: call.id,
            name: call.name,
            response: {
              status: 'error',
              message: err instanceof Error ? err.message : String(err),
            },
          })
        );
      }
    }
  }

  private handleDisconnect(reason?: string) {
    this.cleanup();
    this.setState(reason ? 'error' : 'disconnected');
  }

  public disconnect(): void {
    this.cleanup();
    this.setState('disconnected');
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.audioStreamer) {
      this.audioStreamer.stop();
      this.audioStreamer = null;
    }

    this.audioPlayer.stop();

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  public destroy(): void {
    this.cleanup();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.audioPlayer.close().catch(() => {});
  }
}
