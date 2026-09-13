/**
 * Complete Multilingual Voice Architecture Types
 */

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

export interface VoiceError {
  code:
    | "not-allowed"
    | "no-speech"
    | "audio-capture"
    | "network"
    | "not-supported"
    | "aborted"
    | "synthesis-failed"
    | "unknown";
  message: string;
  fatal: boolean;
  actionHint?: string;
}

export interface STTRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
  language?: string;
}

export interface STTOptions {
  language: string; // BCP-47 e.g. 'en-IN', 'hi-IN', etc.
  onResult: (result: STTRecognitionResult) => void;
  onError: (error: VoiceError) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onStateChange?: (state: VoiceState) => void;
}

export interface SpeechToTextProvider {
  readonly id: string;
  readonly name: string;
  isSupported(): boolean;
  start(options: STTOptions): Promise<void> | void;
  stop(): void;
  abort(): void;
}

export interface TTSOptions {
  text: string;
  language: string; // BCP-47 e.g. 'hi-IN', 'en-IN', etc.
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: VoiceError) => void;
  onPause?: () => void;
  onResume?: () => void;
}

export interface TextToSpeechProvider {
  readonly id: string;
  readonly name: string;
  isSupported(): boolean;
  speak(options: TTSOptions): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  isSpeaking(): boolean;
  getVoices(): Promise<SpeechSynthesisVoice[] | Array<{ name: string; lang: string }>>;
}

export interface VoiceSettings {
  autoSpeak: boolean;
  speechRate: number; // 0.8 - 1.2 default 1.0
  speechPitch: number;
  preferredVoice?: string;
  inputLanguage: string; // 'auto' or specific language code (e.g. 'hi', 'hinglish', 'en', 'ta')
  outputLanguage: string; // 'auto' or specific language code (e.g. 'en', 'hi', 'bn', 'te')
}

export interface VoiceStatusResponse {
  sttAvailable: boolean;
  ttsAvailable: boolean;
  bhashini: {
    enabled: boolean;
    configured: boolean;
    provider: string;
    supportedIndianLanguages: string[];
    features: {
      translation: boolean;
      asr: boolean;
      tts: boolean;
    };
  };
  supportedLanguages: string[];
}
