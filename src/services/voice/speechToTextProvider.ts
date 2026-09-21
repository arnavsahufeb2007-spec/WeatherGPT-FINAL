/**
 * Speech-To-Text Provider Architecture
 *
 * Implements browser native SpeechRecognition with graceful error handling,
 * permissions checking, language mapping (Indian languages, Hinglish, international),
 * and provider abstraction.
 */

import { SpeechToTextProvider, STTOptions, VoiceError } from "./types";
import { getLanguageConfig } from "../../languages";

/**
 * Maps WeatherGPT language code to optimal BCP-47 recognition tag
 */
export function resolveSTTLanguageCode(languageCode: string): string {
  if (!languageCode || typeof languageCode !== "string") {
    return "";
  }
  const cleanCode = languageCode.trim().toLowerCase();
  if (cleanCode === "auto" || cleanCode === "all") {
    return "";
  }

  const config = getLanguageConfig(cleanCode);

  // Special handling for Hinglish:
  // hi-IN recognition in Google Speech works exceptionally well for Roman/Spoken Hinglish,
  // and en-IN is also viable. hi-IN captures Hindi phonemes accurately.
  if (config.code === "hinglish") {
    return "hi-IN";
  }

  if (config.bcp47) {
    return config.bcp47;
  }

  // Fallbacks for standard Indian languages
  const indianFallbacks: Record<string, string> = {
    hi: "hi-IN",
    en: "en-IN",
    bn: "bn-IN",
    te: "te-IN",
    mr: "mr-IN",
    ta: "ta-IN",
    gu: "gu-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    pa: "pa-IN",
    as: "as-IN",
    or: "or-IN",
    ur: "ur-IN",
    ne: "ne-NP",
    sd: "sd-IN",
  };

  return indianFallbacks[config.code] || "";
}

/**
 * Browser-native Web Speech API Speech-to-Text Provider
 */
export class WebSpeechSTTProvider implements SpeechToTextProvider {
  public readonly id = "web-speech-stt";
  public readonly name = "Native Web Speech STT";

  private recognition: any = null;
  private isListening = false;
  private hasReceivedFinalTranscript = false;

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const win = window as any;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  public async checkMicrophonePermission(): Promise<"granted" | "denied" | "prompt"> {
    if (typeof navigator === "undefined" || !navigator.permissions) {
      return "prompt";
    }
    try {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      return result.state;
    } catch {
      return "prompt";
    }
  }

  public start(options: STTOptions): void {
    if (!this.isSupported()) {
      options.onError({
        code: "not-supported",
        message: "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or type your query.",
        fatal: true,
        actionHint: "Switch to a supported browser or use keyboard input.",
      });
      return;
    }

    if (this.isListening) {
      this.stop();
    }

    const langParam = options.language?.trim();
    if (!langParam || langParam === "auto" || langParam.toLowerCase() === "all") {
      options.onError({
        code: "language-unavailable",
        message: "Browser speech recognition does not support automatic language detection. Please select an explicit spoken input language.",
        fatal: true,
        actionHint: "Open voice settings and choose your spoken input language.",
      });
      return;
    }

    const targetLang = resolveSTTLanguageCode(langParam);
    if (!targetLang) {
      options.onError({
        code: "language-unavailable",
        message: `Speech recognition is not available for language code "${langParam}". Please select a supported spoken input language.`,
        fatal: true,
        actionHint: "Open voice settings and choose a supported spoken input language.",
      });
      return;
    }

    const win = window as any;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.lang = targetLang;
      this.hasReceivedFinalTranscript = false;

      this.recognition.onstart = () => {
        this.isListening = true;
        options.onStart?.();
        options.onStateChange?.("listening");
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || "";
          if (res.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        const transcriptToSend = (finalTranscript || interimTranscript).trim();
        const isFinal = Boolean(finalTranscript);

        if (isFinal && transcriptToSend) {
          this.hasReceivedFinalTranscript = true;
        }

        if (transcriptToSend) {
          options.onResult({
            transcript: transcriptToSend,
            isFinal,
            confidence: event.results[event.resultIndex]?.[0]?.confidence,
            language: targetLang,
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        const errCode = event.error || "unknown";
        let message = "Speech recognition encountered an issue.";
        let fatal = false;
        let actionHint = "Please try speaking again.";

        switch (errCode) {
          case "not-allowed":
          case "service-not-allowed":
            message = "Microphone access was denied. Please allow microphone permissions in your browser.";
            fatal = true;
            actionHint = "Click the lock icon in the browser address bar to allow microphone access.";
            break;
          case "no-speech":
            message = "No speech detected. Please speak clearly into your microphone.";
            fatal = false;
            actionHint = "Tap the microphone and speak again.";
            break;
          case "audio-capture":
            message = "No microphone was found or audio capture failed.";
            fatal = true;
            actionHint = "Check that your microphone is plugged in and working.";
            break;
          case "network":
            message = "Network connectivity issue with speech recognition service.";
            fatal = false;
            actionHint = "Check your internet connection and retry.";
            break;
          case "aborted":
            // User stopped listening, ignore silently
            return;
          default:
            message = `Speech recognition error (${errCode}).`;
            actionHint = "Please try again.";
        }

        options.onError({
          code: errCode as any,
          message,
          fatal,
          actionHint,
        });

        if (fatal) {
          options.onStateChange?.("error");
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        options.onEnd?.();
        // Return to idle state unless an error occurred
        options.onStateChange?.("idle");
      };

      this.recognition.start();
    } catch (err: any) {
      this.isListening = false;
      options.onError({
        code: "unknown",
        message: err?.message || "Could not start voice recognition.",
        fatal: false,
        actionHint: "Please tap the microphone button to retry.",
      });
      options.onStateChange?.("error");
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
  }

  public abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
  }
}

/**
 * ElevenLabs Speech-to-Text Provider (Scribe v2)
 *
 * Records microphone audio and sends it to ElevenLabs Scribe v2
 * for high-accuracy multilingual transcription (90+ languages, auto language detection).
 * Optionally runs native WebSpeech in parallel for zero-latency interim visual typing feedback.
 */
export class ElevenLabsSTTProvider implements SpeechToTextProvider {
  public readonly id = "elevenlabs-stt";
  public readonly name = "ElevenLabs Scribe v2 STT";

  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isListening = false;
  private interimRecognition: any = null;
  private lastInterimTranscript = "";
  private activeOptions: STTOptions | null = null;

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      typeof MediaRecorder !== "undefined"
    );
  }

  public async start(options: STTOptions): Promise<void> {
    if (!this.isSupported()) {
      options.onError({
        code: "not-supported",
        message: "Audio recording is not supported in this browser. Please use Chrome, Edge, or Safari.",
        fatal: true,
        actionHint: "Switch to a supported browser or use keyboard input.",
      });
      return;
    }

    if (this.isListening) {
      this.stop();
    }

    this.activeOptions = options;
    this.audioChunks = [];
    this.lastInterimTranscript = "";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;

      // Select supported audio recording format
      let mimeType = "";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      this.mediaRecorder = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      recorder.onstart = () => {
        this.isListening = true;
        options.onStart?.();
        options.onStateChange?.("listening");
      };

      recorder.onstop = async () => {
        this.isListening = false;
        this.cleanupStream();

        if (this.audioChunks.length === 0) {
          if (this.lastInterimTranscript) {
            options.onResult({
              transcript: this.lastInterimTranscript,
              isFinal: true,
            });
          }
          options.onEnd?.();
          options.onStateChange?.("idle");
          return;
        }

        const audioBlob = new Blob(this.audioChunks, {
          type: mimeType || recorder.mimeType || "audio/webm",
        });

        // Convert Blob to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const result = reader.result as string;
            const base64Data = result.includes(",") ? result.split(",")[1] : result;

            const response = await fetch("/api/voice/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64: base64Data,
                mimeType: audioBlob.type || "audio/webm",
                language: options.language,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.transcript && data.transcript.trim()) {
                options.onResult({
                  transcript: data.transcript.trim(),
                  isFinal: true,
                  language: data.language,
                  confidence: data.confidence,
                });
                options.onEnd?.();
                options.onStateChange?.("idle");
                return;
              }
            }

            // If ElevenLabs didn't return text but interim WebSpeech has text, use it
            if (this.lastInterimTranscript && this.lastInterimTranscript.trim()) {
              options.onResult({
                transcript: this.lastInterimTranscript.trim(),
                isFinal: true,
              });
              options.onEnd?.();
              options.onStateChange?.("idle");
              return;
            }

            const errData = await response.json().catch(() => ({}));
            options.onError({
              code: "no-speech",
              message: errData.error || "No speech detected in audio recording.",
              fatal: false,
              actionHint: "Tap the microphone and speak again.",
            });
            options.onStateChange?.("idle");
          } catch (err: any) {
            if (this.lastInterimTranscript && this.lastInterimTranscript.trim()) {
              options.onResult({
                transcript: this.lastInterimTranscript.trim(),
                isFinal: true,
              });
            } else {
              options.onError({
                code: "network",
                message: err?.message || "Failed to transcribe audio via voice service.",
                fatal: false,
                actionHint: "Check your internet connection or try again.",
              });
            }
            options.onStateChange?.("idle");
          } finally {
            options.onEnd?.();
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      // Start recording slices
      recorder.start(250);

      // Optional: Start parallel WebSpeech solely for instant visual typing feedback
      this.startInterimWebSpeechFeedback(options);
    } catch (err: any) {
      this.cleanupStream();
      this.isListening = false;
      const isDenied =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.message?.includes("denied");

      options.onError({
        code: isDenied ? "not-allowed" : "audio-capture",
        message: isDenied
          ? "Microphone access was denied. Please allow microphone permissions."
          : err?.message || "Could not start microphone recording.",
        fatal: isDenied,
        actionHint: isDenied
          ? "Click the lock or camera/mic icon in your browser address bar to allow microphone access."
          : "Check that your microphone is connected and not in use by another app.",
      });
      options.onStateChange?.("error");
    }
  }

  private startInterimWebSpeechFeedback(options: STTOptions): void {
    if (typeof window === "undefined") return;
    const win = window as any;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const langCode = resolveSTTLanguageCode(options.language || "en");
      if (langCode) {
        recognition.lang = langCode;
      }

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interim += event.results[i][0]?.transcript || "";
        }
        if (interim.trim()) {
          this.lastInterimTranscript = interim;
          // Emit interim preview so user sees instant live typing
          options.onResult({
            transcript: interim,
            isFinal: false,
          });
        }
      };

      recognition.onerror = () => {
        // Silently ignore interim recognition errors; ElevenLabs audio recording continues
      };

      recognition.onend = () => {
        this.interimRecognition = null;
      };

      recognition.start();
      this.interimRecognition = recognition;
    } catch {
      // Ignore if WebSpeech fails to launch; MediaRecorder still functions
    }
  }

  private stopInterimWebSpeech(): void {
    if (this.interimRecognition) {
      try {
        this.interimRecognition.stop();
      } catch {
        // ignore
      }
      this.interimRecognition = null;
    }
  }

  private cleanupStream(): void {
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      this.mediaStream = null;
    }
  }

  public stop(): void {
    this.stopInterimWebSpeech();
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
  }

  public abort(): void {
    this.stopInterimWebSpeech();
    this.cleanupStream();
    this.audioChunks = [];
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
  }
}

/**
 * Gemini 3.5 Transcribe Speech-To-Text Provider
 * Captures microphone audio using MediaRecorder and transcribes with gemini-3.5-transcribe
 */
export class GeminiTranscribeSTTProvider implements SpeechToTextProvider {
  public readonly id = "gemini-3.5-transcribe";
  public readonly name = "Gemini 3.5 Transcribe";

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private isListening = false;
  private currentOptions: STTOptions | null = null;

  public isSupported(): boolean {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    return Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
  }

  public async start(options: STTOptions): Promise<void> {
    if (!this.isSupported()) {
      options.onError({
        code: "not-supported",
        message: "Microphone recording is not supported in this browser.",
        fatal: true,
      });
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.currentOptions = options;
      this.audioChunks = [];
      this.isListening = true;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.mediaStream, { mimeType })
        : new MediaRecorder(this.mediaStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const streamToClean = this.mediaStream;
        const chunks = [...this.audioChunks];
        const recordedMime = this.mediaRecorder?.mimeType || "audio/webm";

        this.cleanup();

        if (chunks.length === 0) return;

        try {
          const audioBlob = new Blob(chunks, { type: recordedMime });
          const reader = new FileReader();

          reader.onloadend = async () => {
            try {
              const base64Audio = (reader.result as string)?.split(",")[1];
              if (!base64Audio) return;

              options.onResult({
                transcript: "Transcribing with Gemini 3.5...",
                isFinal: false,
                confidence: 0.5,
              });

              const res = await fetch("/api/voice/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audioBase64: base64Audio,
                  mimeType: recordedMime,
                  language: options.language,
                }),
              });

              const data = await res.json();
              if (data.success && data.text) {
                options.onResult({
                  transcript: data.text,
                  isFinal: true,
                  confidence: 0.99,
                });
              } else {
                options.onError({
                  code: "network",
                  message: data.error || "Gemini transcription failed",
                  fatal: false,
                });
              }
            } catch (err: any) {
              options.onError({
                code: "network",
                message: err.message || "Failed to transcribe audio",
                fatal: false,
              });
            }
          };

          reader.readAsDataURL(audioBlob);
        } catch (err: any) {
          options.onError({
            code: "audio-capture",
            message: err.message || "Error reading recorded audio",
            fatal: false,
          });
        }
      };

      this.mediaRecorder.start(250);
      options.onStart?.();
    } catch (err: any) {
      this.cleanup();
      options.onError({
        code: "not-allowed",
        message: err.message || "Microphone access denied",
        fatal: true,
      });
    }
  }

  public stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
  }

  public abort(): void {
    this.audioChunks = [];
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.cleanup();
    this.isListening = false;
  }

  private cleanup(): void {
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
  }
}

/**
 * Hybrid Speech-To-Text Provider
 *
 * Checks Gemini 3.5 Transcribe first for modern high-accuracy multimodal STT.
 * Falls back to ElevenLabs Scribe or native WebSpeech when needed.
 */
export class HybridSpeechToTextProvider implements SpeechToTextProvider {
  public readonly id = "hybrid-stt";
  public readonly name = "WeatherGPT Multimodal STT (Gemini + ElevenLabs + WebSpeech)";

  private geminiSTT = new GeminiTranscribeSTTProvider();
  private elevenLabsSTT = new ElevenLabsSTTProvider();
  private webSpeechSTT = new WebSpeechSTTProvider();
  private activeProvider: SpeechToTextProvider = this.geminiSTT;
  private serverElevenLabsAvailable: boolean | null = null;
  private lastCheckTimestamp = 0;

  public isSupported(): boolean {
    return this.geminiSTT.isSupported() || this.elevenLabsSTT.isSupported() || this.webSpeechSTT.isSupported();
  }

  /**
   * Checks server capabilities to determine if ElevenLabs is configured
   */
  public async checkElevenLabsAvailability(): Promise<boolean> {
    const now = Date.now();
    if (this.serverElevenLabsAvailable !== null && now - this.lastCheckTimestamp < 30000) {
      return this.serverElevenLabsAvailable;
    }

    try {
      const res = await fetch("/api/voice/status");
      if (res.ok) {
        const data = await res.json();
        this.serverElevenLabsAvailable = Boolean(data.elevenlabs?.enabled || data.elevenlabs?.configured);
        this.lastCheckTimestamp = now;
        return this.serverElevenLabsAvailable;
      }
    } catch {
      // ignore
    }

    this.serverElevenLabsAvailable = false;
    this.lastCheckTimestamp = now;
    return false;
  }

  public async start(options: STTOptions): Promise<void> {
    // 1. Prioritize Gemini 3.5 Transcribe
    if (this.geminiSTT.isSupported()) {
      this.activeProvider = this.geminiSTT;
      await this.geminiSTT.start(options);
      return;
    }

    // 2. Fallback to WebSpeech if supported
    if (this.webSpeechSTT.isSupported()) {
      this.activeProvider = this.webSpeechSTT;
      this.webSpeechSTT.start(options);
      return;
    }

    // If none is supported
    options.onError({
      code: "not-supported",
      message: "Speech recognition is not supported in this browser.",
      fatal: true,
      actionHint: "Switch to a modern browser or use keyboard input.",
    });
  }

  public stop(): void {
    this.activeProvider.stop();
  }

  public abort(): void {
    this.activeProvider.abort();
  }
}

// Singleton STT provider instances
export const webSpeechSTTProvider = new WebSpeechSTTProvider();
export const elevenLabsSTTProvider = new ElevenLabsSTTProvider();
export const geminiTranscribeSTTProvider = new GeminiTranscribeSTTProvider();
export const defaultSTTProvider = new HybridSpeechToTextProvider();

