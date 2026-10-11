import { AUDIO_SPECS } from '../config/constants';

export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private volume: number = 1.0;
  private isPlaying: boolean = false;
  private onPlaybackStateChange?: (isPlaying: boolean) => void;

  constructor(volume: number = 1.0) {
    this.volume = volume;
  }

  public setOnPlaybackStateChange(callback: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = callback;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  /**
   * Initializes or resumes the 24kHz AudioContext.
   * Browsers require a user gesture (e.g. tap) to start AudioContext.
   */
  public async initContext(): Promise<AudioContext> {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({
        sampleRate: AUDIO_SPECS.OUTPUT_SAMPLE_RATE,
      });

      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);

      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  /**
   * Decodes Base64 PCM16 little-endian audio to Float32Array
   */
  private decodePCM16(base64Data: string): Float32Array {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    return float32;
  }

  /**
   * Enqueues an audio chunk for gapless streaming playback
   */
  public async playChunk(base64Pcm: string): Promise<void> {
    if (!base64Pcm) return;

    const ctx = await this.initContext();
    const float32Data = this.decodePCM16(base64Pcm);
    if (float32Data.length === 0) return;

    const audioBuffer = ctx.createBuffer(
      1,
      float32Data.length,
      AUDIO_SPECS.OUTPUT_SAMPLE_RATE
    );
    audioBuffer.getChannelData(0).set(float32Data);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    if (this.gainNode) {
      source.connect(this.gainNode);
    } else {
      source.connect(ctx.destination);
    }

    // Gapless scheduling
    const currentTime = ctx.currentTime;
    const startTime = Math.max(currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;

    this.activeSources.add(source);
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onPlaybackStateChange?.(true);
    }

    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0) {
        this.isPlaying = false;
        this.onPlaybackStateChange?.(false);
      }
    };
  }

  /**
   * Immediately stops all playback, clears the queue, and resets schedule.
   * Essential for natural user interruption handling.
   */
  public stop(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source might already have ended
      }
    });
    this.activeSources.clear();

    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    } else {
      this.nextStartTime = 0;
    }

    if (this.isPlaying) {
      this.isPlaying = false;
      this.onPlaybackStateChange?.(false);
    }
  }

  /**
   * Returns normalized audio volume level (0.0 to 1.0) of current speaker playback
   */
  public getAudioLevel(): number {
    if (!this.analyserNode || !this.isPlaying) return 0;
    const buffer = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    const avg = sum / buffer.length;
    return Math.min(1.0, avg / 128.0);
  }

  /**
   * Returns frequency data array for visualizer waveform
   */
  public getFrequencyData(outputArray: Uint8Array): void {
    if (this.analyserNode && this.isPlaying) {
      this.analyserNode.getByteFrequencyData(outputArray as any);
    } else {
      outputArray.fill(0);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public async close(): Promise<void> {
    this.stop();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      await this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
