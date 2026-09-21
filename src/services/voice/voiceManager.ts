/**
 * Unified Voice Manager for WeatherGPT
 *
 * Coordinates Speech-to-Text and Text-to-Speech pipelines:
 * - Single source of truth for voice state (idle, listening, processing, speaking, error)
 * - Auto-speak preference persistence
 * - Interruption management: new user interaction immediately stops active speech
 * - Stale response rejection
 */

import { VoiceState, VoiceError, STTRecognitionResult, VoiceSettings, SpeechToTextProvider, TextToSpeechProvider } from "./types";
import { defaultSTTProvider, WebSpeechSTTProvider } from "./speechToTextProvider";
import { defaultTTSProvider, WebSpeechTTSProvider } from "./textToSpeechProvider";

const VOICE_SETTINGS_STORAGE_KEY = "weathergpt_voice_settings_v1";

const DEFAULT_SETTINGS: VoiceSettings = {
  autoSpeak: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  inputLanguage: "auto",
  outputLanguage: "auto",
};

export class VoiceManager {
  private sttProvider: SpeechToTextProvider;
  private ttsProvider: TextToSpeechProvider;
  private state: VoiceState = "idle";
  private settings: VoiceSettings;
  private stateListeners: Set<(state: VoiceState) => void> = new Set();
  private errorListeners: Set<(error: VoiceError | null) => void> = new Set();
  private settingsListeners: Set<(settings: VoiceSettings) => void> = new Set();
  private lastSpokenText = "";
  private currentRequestId = 0;

  constructor(sttProvider?: SpeechToTextProvider, ttsProvider?: TextToSpeechProvider) {
    this.sttProvider = sttProvider || defaultSTTProvider;
    this.ttsProvider = ttsProvider || defaultTTSProvider;
    this.settings = this.loadSettings();
  }

  private loadSettings(): VoiceSettings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(VOICE_SETTINGS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  }

  public saveSettings(newSettings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(VOICE_SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        // ignore
      }
    }
    this.settingsListeners.forEach((fn) => fn(this.settings));
  }

  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public setInputLanguage(language: string): void {
    this.saveSettings({ inputLanguage: language || "auto" });
  }

  public setOutputLanguage(language: string): void {
    this.saveSettings({ outputLanguage: language || "auto" });
  }

  public getEffectiveInputLanguage(appLanguage: string): string {
    if (this.settings.inputLanguage && this.settings.inputLanguage !== "auto" && this.settings.inputLanguage.toLowerCase() !== "all") {
      return this.settings.inputLanguage;
    }
    const fallback = appLanguage && appLanguage.toLowerCase() !== "all" && appLanguage !== "auto" ? appLanguage : "en";
    return fallback;
  }

  public getEffectiveOutputLanguage(appLanguage: string): string {
    if (this.settings.outputLanguage && this.settings.outputLanguage !== "auto" && this.settings.outputLanguage.toLowerCase() !== "all") {
      return this.settings.outputLanguage;
    }
    const fallback = appLanguage && appLanguage.toLowerCase() !== "all" && appLanguage !== "auto" ? appLanguage : "en";
    return fallback;
  }

  public subscribeSettings(listener: (settings: VoiceSettings) => void): () => void {
    this.settingsListeners.add(listener);
    listener(this.settings);
    return () => this.settingsListeners.delete(listener);
  }

  public getState(): VoiceState {
    return this.state;
  }

  public isVoiceSupported(): { stt: boolean; tts: boolean } {
    return {
      stt: this.sttProvider.isSupported(),
      tts: this.ttsProvider.isSupported(),
    };
  }

  public subscribeState(listener: (state: VoiceState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeError(listener: (error: VoiceError | null) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private setState(newState: VoiceState): void {
    this.state = newState;
    this.stateListeners.forEach((fn) => fn(newState));
  }

  private notifyError(error: VoiceError | null): void {
    this.errorListeners.forEach((fn) => fn(error));
  }

  /**
   * Starts listening to user speech with language resolution (inputLanguage setting or app fallback)
   */
  public startListening(
    language: string,
    onResult: (result: STTRecognitionResult) => void,
    onError?: (error: VoiceError) => void,
    explicitOverrideLang?: string
  ): void {
    // If currently speaking, immediately stop playback before listening
    this.stopSpeaking();
    this.notifyError(null);

    const safeOverride = typeof explicitOverrideLang === "string" ? explicitOverrideLang.trim() : undefined;
    const effectiveLanguage =
      (safeOverride && safeOverride !== "auto" && safeOverride.toLowerCase() !== "all")
        ? safeOverride
        : (this.settings.inputLanguage && this.settings.inputLanguage !== "auto" && this.settings.inputLanguage.toLowerCase() !== "all")
        ? this.settings.inputLanguage
        : (language && language !== "auto" && language.toLowerCase() !== "all")
        ? language
        : "";

    const requestId = ++this.currentRequestId;

    this.sttProvider.start({
      language: effectiveLanguage,
      onStart: () => {
        if (this.currentRequestId === requestId) {
          this.setState("listening");
        }
      },
      onResult: (result) => {
        if (this.currentRequestId === requestId) {
          onResult(result);
        }
      },
      onError: (error) => {
        if (this.currentRequestId === requestId) {
          this.setState("error");
          this.notifyError(error);
          onError?.(error);
        }
      },
      onEnd: () => {
        if (this.currentRequestId === requestId && this.state === "listening") {
          this.setState("idle");
        }
      },
    });
  }

  /**
   * Stops listening to user speech
   */
  public stopListening(): void {
    this.sttProvider.stop();
    if (this.state === "listening") {
      this.setState("idle");
    }
  }

  /**
   * Sets voice manager into processing state (e.g. while WeatherGPT query is resolving)
   */
  public setProcessing(): void {
    this.stopSpeaking();
    this.setState("processing");
  }

  /**
   * Speaks WeatherGPT response aloud with language resolution (outputLanguage setting or app fallback)
   */
  public async speakResponse(
    text: string,
    language: string,
    force: boolean = false,
    explicitOverrideLang?: string
  ): Promise<void> {
    if (!force && !this.settings.autoSpeak) {
      if (this.state === "processing") {
        this.setState("idle");
      }
      return;
    }

    if (!text || !text.trim()) {
      this.setState("idle");
      return;
    }

    const effectiveLanguage =
      (explicitOverrideLang && explicitOverrideLang !== "auto" && explicitOverrideLang.toLowerCase() !== "all")
        ? explicitOverrideLang
        : (this.settings.outputLanguage && this.settings.outputLanguage !== "auto" && this.settings.outputLanguage.toLowerCase() !== "all")
        ? this.settings.outputLanguage
        : (language && language !== "auto" && language.toLowerCase() !== "all")
        ? language
        : "en";

    // Stop previous speech
    this.stopSpeaking();
    this.lastSpokenText = text;
    const requestId = ++this.currentRequestId;

    this.setState("speaking");

    await this.ttsProvider.speak({
      text,
      language: effectiveLanguage,
      rate: this.settings.speechRate,
      pitch: this.settings.speechPitch,
      onStart: () => {
        if (this.currentRequestId === requestId) {
          this.setState("speaking");
        }
      },
      onEnd: () => {
        if (this.currentRequestId === requestId) {
          this.setState("idle");
        }
      },
      onError: (error) => {
        if (this.currentRequestId === requestId) {
          console.warn("TTS playback error:", error.message);
          this.notifyError(error);
          this.setState("idle");
        }
      },
    });
  }

  /**
   * Halts active speech synthesis immediately
   */
  public stopSpeaking(): void {
    this.ttsProvider.stop();
    if (this.state === "speaking") {
      this.setState("idle");
    }
  }

  /**
   * Unlocks audio during a user gesture
   */
  public unlockAudio(): void {
    this.ttsProvider.unlockAudio?.();
  }

  /**
   * Replays the last spoken response
   */
  public replayLast(language: string): void {
    if (this.lastSpokenText) {
      this.speakResponse(this.lastSpokenText, language, true);
    }
  }
}

export const defaultVoiceManager = new VoiceManager();
