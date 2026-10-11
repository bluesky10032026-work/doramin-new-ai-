import { AUDIO_SPECS } from '../config/constants';

export interface AudioStreamerCallbacks {
  onAudioChunk: (base64Pcm: string) => void;
  onMicLevel: (level: number) => void;
  onVoiceActivity?: () => void;
  onError: (err: Error) => void;
}

export class AudioStreamer {
  private mediaStream: MediaStream | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isStreaming: boolean = false;
  private callbacks: AudioStreamerCallbacks;
  private sensitivity: number = 1.0;
  private consecutiveSpeechFrames: number = 0;

  constructor(callbacks: AudioStreamerCallbacks, sensitivity: number = 1.0) {
    this.callbacks = callbacks;
    this.sensitivity = sensitivity;
  }

  public setSensitivity(val: number) {
    this.sensitivity = Math.max(0.2, Math.min(2.0, val));
  }

  /**
   * Starts capturing microphone audio, initializes 16kHz AudioContext,
   * resamples, converts to PCM16, and streams.
   */
  public async start(): Promise<void> {
    if (this.isStreaming) return;

    try {
      // 1. Request microphone access with echo cancellation & noise suppression
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: AUDIO_SPECS.INPUT_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Initialize AudioContext at 16kHz for Gemini Live
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.inputAudioCtx = new AudioCtxClass({
        sampleRate: AUDIO_SPECS.INPUT_SAMPLE_RATE,
      });

      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }

      // 3. Connect microphone source
      this.sourceNode = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);

      // 4. Analyser node for live mic level visualization & VAD
      this.analyserNode = this.inputAudioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.5;

      // 5. ScriptProcessor for raw audio chunks
      this.processorNode = this.inputAudioCtx.createScriptProcessor(
        AUDIO_SPECS.BUFFER_SIZE,
        1,
        1
      );

      this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isStreaming) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // Calculate RMS for volume level and Voice Activity Detection (VAD)
        let sumSquares = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sumSquares += inputChannelData[i] * inputChannelData[i];
        }
        const rms = Math.sqrt(sumSquares / inputChannelData.length);
        const adjustedLevel = Math.min(1.0, (rms * 4.0) * this.sensitivity);

        this.callbacks.onMicLevel(adjustedLevel);

        // VAD detection: trigger voice activity callback if threshold reached
        if (rms * this.sensitivity > AUDIO_SPECS.VAD_THRESHOLD) {
          this.consecutiveSpeechFrames++;
          if (this.consecutiveSpeechFrames >= AUDIO_SPECS.VAD_MIN_SPEECH_FRAMES) {
            this.callbacks.onVoiceActivity?.();
          }
        } else {
          this.consecutiveSpeechFrames = 0;
        }

        // Resample/convert to 16-bit PCM little-endian
        const pcm16 = this.convertFloat32ToPCM16(
          inputChannelData,
          e.inputBuffer.sampleRate,
          AUDIO_SPECS.INPUT_SAMPLE_RATE
        );

        // Base64 encode
        const base64Audio = this.pcm16ToBase64(pcm16);
        this.callbacks.onAudioChunk(base64Audio);
      };

      this.sourceNode.connect(this.analyserNode);
      this.sourceNode.connect(this.processorNode);
      // ScriptProcessor must connect to destination to process in WebKit/Blink
      this.processorNode.connect(this.inputAudioCtx.destination);

      this.isStreaming = true;
    } catch (err) {
      this.stop();
      this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  /**
   * Resamples if sample rates differ, and converts Float32 to Int16 PCM
   */
  private convertFloat32ToPCM16(
    float32Array: Float32Array,
    fromRate: number,
    toRate: number
  ): Int16Array {
    let input = float32Array;

    if (fromRate !== toRate) {
      // Linear interpolation resampling
      const ratio = fromRate / toRate;
      const targetLength = Math.round(float32Array.length / ratio);
      const resampled = new Float32Array(targetLength);
      for (let i = 0; i < targetLength; i++) {
        const originalIndex = i * ratio;
        const low = Math.floor(originalIndex);
        const high = Math.min(low + 1, float32Array.length - 1);
        const weight = originalIndex - low;
        resampled[i] = float32Array[low] * (1 - weight) + float32Array[high] * weight;
      }
      input = resampled;
    }

    const pcm16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  /**
   * Converts Int16Array to Base64 string
   */
  private pcm16ToBase64(pcm16: Int16Array): string {
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Returns current mic frequency data for waveform visualizer
   */
  public getFrequencyData(outputArray: Uint8Array): void {
    if (this.analyserNode && this.isStreaming) {
      this.analyserNode.getByteFrequencyData(outputArray as any);
    } else {
      outputArray.fill(0);
    }
  }

  /**
   * Stops streaming, releases microphone tracks, closes AudioContext
   */
  public stop(): void {
    this.isStreaming = false;

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
        this.processorNode.onaudioprocess = null;
      } catch {
        // ignore
      }
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch {
        // ignore
      }
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioCtx && this.inputAudioCtx.state !== 'closed') {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }

    this.consecutiveSpeechFrames = 0;
  }

  public getIsStreaming(): boolean {
    return this.isStreaming;
  }
}
