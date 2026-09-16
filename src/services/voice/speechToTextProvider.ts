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

// Singleton STT provider instance
export const defaultSTTProvider = new WebSpeechSTTProvider();
