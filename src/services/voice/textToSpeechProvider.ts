/**
 * Text-To-Speech Provider Architecture
 *
 * Implements browser SpeechSynthesis with multilingual voice selection,
 * sentence chunking (preventing browser timeouts on long responses),
 * voice caching, cancellation of previous utterances, and provider abstraction.
 */

import { TextToSpeechProvider, TTSOptions, VoiceError } from "./types";
import { formatSpokenWeatherResponse, splitIntoSpeechChunks } from "./speechFormatter";
import { getLanguageConfig } from "../../languages";

/**
 * Resolves best matching BCP-47 tag for Text-to-Speech
 */
export function resolveTTSLanguageCode(languageCode: string): string {
  const config = getLanguageConfig(languageCode);

  if (config.code === "hinglish") {
    // Hindi voice gives great natural pronunciation to Hindi roots in Hinglish
    return "hi-IN";
  }

  if (config.bcp47) {
    return config.bcp47;
  }

  return "en-IN";
}

/**
 * Finds the most appropriate installed voice for a target language
 */
export function findBestVoiceForLanguage(
  voices: SpeechSynthesisVoice[],
  languageCode: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const bcp47 = resolveTTSLanguageCode(languageCode).toLowerCase();
  const primaryLang = bcp47.split("-")[0];

  // 1. Exact BCP-47 match (e.g. "hi-IN", "en-IN", "bn-IN")
  const exactMatches = voices.filter((v) => v.lang.toLowerCase().replace("_", "-") === bcp47);
  if (exactMatches.length > 0) {
    // Prefer natural / default / local voices if available
    const preferred = exactMatches.find((v) => !v.localService || v.name.includes("Natural") || v.name.includes("Google"));
    return preferred || exactMatches[0];
  }

  // 2. Primary language match (e.g. "hi", "bn", "ta")
  const primaryMatches = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(primaryLang));
  if (primaryMatches.length > 0) {
    return primaryMatches[0];
  }

  // 3. For Hinglish, prioritize Indian English (en-IN) or Hindi (hi-IN)
  if (languageCode === "hinglish") {
    const enInVoice = voices.find((v) => v.lang.toLowerCase().replace("_", "-") === "en-in");
    if (enInVoice) return enInVoice;
    const hiInVoice = voices.find((v) => v.lang.toLowerCase().replace("_", "-") === "hi-in");
    if (hiInVoice) return hiInVoice;
  }

  // 4. For any Indian language whose specific voice is not installed, fallback to Indian English or Hindi
  const indianCodes = [
    "hi", "hinglish", "bn", "te", "mr", "ta", "gu", "kn", "ml", "pa", "as", "or", "ur", "ne", "sd"
  ];
  if (indianCodes.includes(languageCode) || primaryLang === "hi") {
    const indianVoice = voices.find((v) => {
      const tag = v.lang.toLowerCase().replace("_", "-");
      return tag === "en-in" || tag === "hi-in" || tag.endsWith("-in");
    });
    if (indianVoice) return indianVoice;
  }

  // 5. Fallback to default voice or English
  const defaultVoice = voices.find((v) => v.default) || voices.find((v) => v.lang.startsWith("en"));
  return defaultVoice || voices[0];
}

/**
 * Web Speech Synthesis Text-to-Speech Provider with Bhashini Dhruva integration
 */
export class WebSpeechTTSProvider implements TextToSpeechProvider {
  public readonly id = "web-speech-tts";
  public readonly name = "Native Web Speech TTS";

  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private _isSpeaking = false;
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded = false;
  private activeRequestId = 0;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  public isSupported(): boolean {
    return Boolean(typeof window !== "undefined" && "speechSynthesis" in window);
  }

  private loadVoices(): void {
    if (!this.synth) return;
    try {
      this.voices = this.synth.getVoices();
      if (this.voices.length > 0) {
        this.voicesLoaded = true;
      }
    } catch {
      // ignore
    }
  }

  public async getVoices(): Promise<SpeechSynthesisVoice[]> {
    if (this.voicesLoaded && this.voices.length > 0) {
      return this.voices;
    }
    if (!this.synth) return [];

    return new Promise((resolve) => {
      const v = this.synth?.getVoices() || [];
      if (v.length > 0) {
        this.voices = v;
        this.voicesLoaded = true;
        resolve(v);
        return;
      }

      const onVoices = () => {
        this.voices = this.synth?.getVoices() || [];
        this.voicesLoaded = true;
        resolve(this.voices);
      };

      if (this.synth) {
        this.synth.onvoiceschanged = onVoices;
      }
      setTimeout(() => {
        resolve(this.synth?.getVoices() || []);
      }, 500);
    });
  }

  public isSpeaking(): boolean {
    return this._isSpeaking || Boolean(this.synth?.speaking);
  }

  public stop(): void {
    this.activeRequestId++;
    this._isSpeaking = false;
    this.currentUtterance = null;
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // ignore
      }
    }
  }

  public pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      try {
        this.currentAudio.pause();
      } catch {
        // ignore
      }
    }
    if (this.synth && this.synth.speaking) {
      try {
        this.synth.pause();
      } catch {
        // ignore
      }
    }
  }

  public resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      try {
        this.currentAudio.play();
      } catch {
        // ignore
      }
    }
    if (this.synth && this.synth.paused) {
      try {
        this.synth.resume();
      } catch {
        // ignore
      }
    }
  }

  public async speak(options: TTSOptions): Promise<void> {
    if (!this.isSupported() && typeof Audio === "undefined") {
      options.onError?.({
        code: "not-supported",
        message: "Speech synthesis is not supported in this browser.",
        fatal: true,
      });
      return;
    }

    // Always stop and cancel previous speech before speaking anew (prevents overlap)
    this.stop();

    const requestId = ++this.activeRequestId;
    const formattedText = formatSpokenWeatherResponse(options.text, options.language);

    if (!formattedText || !formattedText.trim()) {
      options.onEnd?.();
      return;
    }

    // 1. Try Bhashini Server-Side Neural TTS for Indian Languages if available
    const indianLangCodes = [
      "hi", "hinglish", "bn", "te", "mr", "ta", "gu", "kn", "ml", "pa", "as", "or", "ur", "ne", "sd"
    ];
    if (indianLangCodes.includes(options.language) && typeof fetch !== "undefined" && typeof Audio !== "undefined") {
      try {
        const bhashiniLang = options.language === "hinglish" ? "hi" : options.language;
        const resp = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: formattedText,
            language: bhashiniLang,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data.success && data.audioBase64) {
            if (this.activeRequestId !== requestId) return;

            const audio = new Audio(`data:${data.format || "audio/wav"};base64,${data.audioBase64}`);
            this.currentAudio = audio;
            audio.playbackRate = options.rate || 1.0;

            audio.onplay = () => {
              if (this.activeRequestId === requestId) {
                this._isSpeaking = true;
                options.onStart?.();
              }
            };

            audio.onended = () => {
              if (this.activeRequestId === requestId) {
                this._isSpeaking = false;
                this.currentAudio = null;
                options.onEnd?.();
              }
            };

            audio.onerror = () => {
              if (this.activeRequestId === requestId) {
                this.currentAudio = null;
                // Fallback directly to native browser speech synthesis
                this.playWithBrowserSynthesis(formattedText, options, requestId);
              }
            };

            await audio.play();
            return;
          }
        }
      } catch {
        // Fallback seamlessly to native browser speech synthesis
      }
    }

    // 2. Play using client-side Web Speech API SpeechSynthesis
    await this.playWithBrowserSynthesis(formattedText, options, requestId);
  }

  private async playWithBrowserSynthesis(
    formattedText: string,
    options: TTSOptions,
    requestId: number
  ): Promise<void> {
    if (!this.synth) {
      options.onError?.({
        code: "not-supported",
        message: "Speech synthesis is not supported in this browser.",
        fatal: true,
      });
      return;
    }

    const availableVoices = await this.getVoices();
    const selectedVoice = findBestVoiceForLanguage(availableVoices, options.language);
    const targetLangCode = resolveTTSLanguageCode(options.language);

    // Split text into natural sentence chunks to prevent browser playback timeouts
    const chunks = splitIntoSpeechChunks(formattedText, 160);
    if (chunks.length === 0) {
      options.onEnd?.();
      return;
    }

    this._isSpeaking = true;
    options.onStart?.();

    let chunkIndex = 0;

    const playNextChunk = () => {
      if (this.activeRequestId !== requestId) {
        this._isSpeaking = false;
        return;
      }

      if (chunkIndex >= chunks.length) {
        this._isSpeaking = false;
        this.currentUtterance = null;
        options.onEnd?.();
        return;
      }

      const chunkText = chunks[chunkIndex++];
      const utterance = new SpeechSynthesisUtterance(chunkText);

      utterance.lang = targetLangCode;
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume !== undefined ? options.volume : 1.0;

      utterance.onend = () => {
        if (this.activeRequestId === requestId) {
          playNextChunk();
        }
      };

      utterance.onerror = (event: any) => {
        if (this.activeRequestId !== requestId) return;
        if (event.error === "canceled" || event.error === "interrupted") {
          this._isSpeaking = false;
          return;
        }

        console.warn("Speech synthesis chunk error:", event.error);
        playNextChunk();
      };

      this.currentUtterance = utterance;

      try {
        this.synth?.speak(utterance);
      } catch (err: any) {
        this._isSpeaking = false;
        options.onError?.({
          code: "synthesis-failed",
          message: err?.message || "Speech synthesis failed.",
          fatal: false,
        });
      }
    };

    playNextChunk();
  }
}

// Singleton TTS provider instance
export const defaultTTSProvider = new WebSpeechTTSProvider();
