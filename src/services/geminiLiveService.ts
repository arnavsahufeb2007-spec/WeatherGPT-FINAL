/**
 * Gemini Live API Client Service (gemini-3.8-live)
 *
 * Real-time duplex voice conversation with WeatherGPT powered by Gemini Live:
 * - WebSocket streaming to backend /live bridge
 * - Web Audio API capture (16kHz linear PCM, 16-bit mono)
 * - Continuous playback buffer queue for model audio responses
 * - Low-latency interruption and conversational turn-taking
 */

export type LiveConnectionState = "disconnected" | "connecting" | "connected" | "speaking" | "listening" | "error";

export interface LiveTranscriptItem {
  id: string;
  sender: "user" | "gemini";
  text: string;
  timestamp: number;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private playbackSources: AudioBufferSourceNode[] = [];
  private nextPlaybackTime = 0;
  private state: LiveConnectionState = "disconnected";
  private listeners: Set<(state: LiveConnectionState) => void> = new Set();
  private transcriptListeners: Set<(item: LiveTranscriptItem) => void> = new Set();
  private errorListeners: Set<(err: string) => void> = new Set();
  private volumeListeners: Set<(vol: number) => void> = new Set();

  public getState(): LiveConnectionState {
    return this.state;
  }

  public subscribeState(fn: (state: LiveConnectionState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  public subscribeTranscript(fn: (item: LiveTranscriptItem) => void): () => void {
    this.transcriptListeners.add(fn);
    return () => this.transcriptListeners.delete(fn);
  }

  public subscribeError(fn: (err: string) => void): () => void {
    this.errorListeners.add(fn);
    return () => this.errorListeners.delete(fn);
  }

  public subscribeVolume(fn: (vol: number) => void): () => void {
    this.volumeListeners.add(fn);
    return () => this.volumeListeners.delete(fn);
  }

  private setState(newState: LiveConnectionState) {
    this.state = newState;
    this.listeners.forEach((fn) => fn(newState));
  }

  public async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setState("connecting");

    try {
      // 1. Initialize AudioContext
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }

      // 2. Resolve WebSocket URL
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/live`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        this.setState("connected");
        await this.startMicrophoneCapture();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            this.handleError(msg.error);
            return;
          }

          if (msg.interrupted) {
            this.stopCurrentPlayback();
            this.setState("listening");
          }

          if (msg.audio) {
            this.setState("speaking");
            this.queueAudioPlayback(msg.audio);
          }

          if (msg.text) {
            this.transcriptListeners.forEach((fn) =>
              fn({
                id: Math.random().toString(36).substring(2, 9),
                sender: "gemini",
                text: msg.text,
                timestamp: Date.now(),
              })
            );
          }
        } catch (err: any) {
          console.error("Live message parse error:", err);
        }
      };

      this.ws.onclose = () => {
        this.disconnect();
      };

      this.ws.onerror = (err) => {
        console.error("Live WebSocket error:", err);
        this.handleError("WebSocket connection error. Please check internet connection.");
        this.disconnect();
      };
    } catch (err: any) {
      console.error("Failed to establish live session:", err);
      this.handleError(err.message || "Failed to start Gemini Live session");
      this.disconnect();
    }
  }

  private async startMicrophoneCapture() {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Context dedicated to input resampling if needed
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      this.micSource = inputCtx.createMediaStreamSource(this.micStream);
      this.processorNode = inputCtx.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate RMS volume for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.volumeListeners.forEach((fn) => fn(Math.min(1, rms * 5)));

        // Encode to 16-bit linear PCM little-endian
        const pcmBuffer = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert Int16Array buffer to Base64
        let binary = "";
        const bytes = new Uint8Array(pcmBuffer.buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);

        this.ws.send(
          JSON.stringify({
            audio: base64Audio,
          })
        );
      };

      this.micSource.connect(this.processorNode);
      this.processorNode.connect(inputCtx.destination);
      this.setState("listening");
    } catch (err: any) {
      console.error("Microphone capture failed:", err);
      this.handleError("Could not access microphone for live conversation");
    }
  }

  private queueAudioPlayback(base64Audio: string) {
    if (!this.audioCtx) return;

    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
      }

      // Gemini Live models stream at 24000Hz PCM
      const sampleRate = 24000;
      const audioBuffer = this.audioCtx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioCtx.destination);

      const currentTime = this.audioCtx.currentTime;
      const startTime = Math.max(currentTime, this.nextPlaybackTime);
      source.start(startTime);

      this.nextPlaybackTime = startTime + audioBuffer.duration;
      this.playbackSources.push(source);

      source.onended = () => {
        const idx = this.playbackSources.indexOf(source);
        if (idx !== -1) {
          this.playbackSources.splice(idx, 1);
        }
        if (this.playbackSources.length === 0 && this.state === "speaking") {
          this.setState("listening");
        }
      };
    } catch (err) {
      console.error("Error decoding / playing live audio chunk:", err);
    }
  }

  private stopCurrentPlayback() {
    this.playbackSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // ignore
      }
    });
    this.playbackSources = [];
    if (this.audioCtx) {
      this.nextPlaybackTime = this.audioCtx.currentTime;
    }
  }

  public sendTextMessage(text: string) {
    if (!text.trim() || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.transcriptListeners.forEach((fn) =>
      fn({
        id: Math.random().toString(36).substring(2, 9),
        sender: "user",
        text: text.trim(),
        timestamp: Date.now(),
      })
    );

    this.ws.send(
      JSON.stringify({
        text: text.trim(),
      })
    );
  }

  private handleError(err: string) {
    this.setState("error");
    this.errorListeners.forEach((fn) => fn(err));
  }

  public disconnect() {
    this.stopCurrentPlayback();

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch {}
      this.processorNode = null;
    }

    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {}
      this.micSource = null;
    }

    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.micStream = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    if (this.audioCtx && this.audioCtx.state !== "closed") {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }

    this.volumeListeners.forEach((fn) => fn(0));
    this.setState("disconnected");
  }
}

export const geminiLiveService = new GeminiLiveService();
