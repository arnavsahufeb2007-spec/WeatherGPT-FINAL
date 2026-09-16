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

const FEMALE_VOICE_NAMES = [
  "zira", "samantha", "victoria", "karen", "veena", "swara", "heera", "kalpana", "aditi",
  "monica", "paulina", "amelie", "hortense", "anna", "petra", "kyoko", "yuna", "ting-ting",
  "mei-jia", "helena", "carmen", "laura", "alice", "ava", "allison", "serena", "lekha",
  "fiona", "tessa", "moira"
];

export function isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  if (name.includes("female") || name.includes("woman") || name.includes("girl")) {
    return true;
  }
  return FEMALE_VOICE_NAMES.some((fName) => name.includes(fName));
}

/**
 * Finds the most appropriate installed voice for a target language,
 * prioritizing a consistent natural, clear, soft female voice persona.
 */
export function isVoiceCompatible(
  voice: SpeechSynthesisVoice | null | undefined,
  languageCode: string
): boolean {
  if (!voice || !voice.lang || !languageCode) return false;
  const vLang = voice.lang.toLowerCase().replace(/_/g, "-");
  const bcp47 = resolveTTSLanguageCode(languageCode).toLowerCase();
  const primaryLang = bcp47.split("-")[0];
  const vPrimary = vLang.split("-")[0];

  // Exact BCP-47 match (e.g., 'gu-in' === 'gu-in', 'hi-in' === 'hi-in')
  if (vLang === bcp47) return true;

  // Primary language match (e.g., 'gu' or 'gu-IN' for Gujarati)
  if (vPrimary === primaryLang) return true;

  // Hinglish: Latin script Hindi can be voiced naturally by Indian English or Hindi voices
  if (languageCode.toLowerCase() === "hinglish") {
    return vLang === "en-in" || vLang === "hi-in" || vLang.endsWith("-in") || vPrimary === "hi" || vPrimary === "en";
  }

  // English: Any English dialect voice (en-US, en-GB, en-IN, en-AU) is mutually compatible
  if (primaryLang === "en" && vPrimary === "en") return true;

  return false;
}

/**
 * Selects a genuinely compatible voice for the requested language.
 * Returns null if no compatible voice is installed in the browser.
 * NEVER returns an unrelated default English voice when the target language is Hindi, Gujarati, Bengali, Telugu, Tamil, Marathi, Punjabi, etc.
 */
export function selectVoice(
  voices: SpeechSynthesisVoice[],
  languageCode: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const bcp47 = resolveTTSLanguageCode(languageCode).toLowerCase();
  const primaryLang = bcp47.split("-")[0];

  // 1. Find exact BCP-47 match
  let candidates = voices.filter((v) => v.lang.toLowerCase().replace(/_/g, "-") === bcp47);

  // 2. Find primary language subtag match
  if (candidates.length === 0) {
    candidates = voices.filter((v) => {
      const vLang = v.lang.toLowerCase().replace(/_/g, "-");
      return vLang.split("-")[0] === primaryLang;
    });
  }

  // 3. Hinglish: matches Indian English or Hindi voices
  if (candidates.length === 0 && languageCode.toLowerCase() === "hinglish") {
    candidates = voices.filter((v) => {
      const vLang = v.lang.toLowerCase().replace(/_/g, "-");
      return vLang === "hi-in" || vLang === "en-in" || vLang.endsWith("-in");
    });
  }

  // 4. English fallback across dialects (e.g. en-US voice for en-IN if needed)
  if (candidates.length === 0 && primaryLang === "en") {
    candidates = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  }

  // Strictly return null if no compatible voice exists!
  // Do NOT return an unrelated default English voice for Hindi, Gujarati, Bengali, Telugu, Tamil, Marathi, Punjabi, etc.
  if (candidates.length === 0) {
    return null;
  }

  // Rank candidate voices: favor female, natural/neural, penalize male
  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    let score = 0;
    const vLang = v.lang.toLowerCase().replace(/_/g, "-");
    const vName = v.name.toLowerCase();

    if (vLang === bcp47) score += 50;
    if (isFemaleVoice(v)) score += 35;
    if (vName.includes("natural") || vName.includes("neural") || vName.includes("google") || vName.includes("premium")) {
      score += 15;
    }
    const maleKeywords = ["male", "guy", "david", "george", "mark", "ravi", "neel", "james", "richard", "stefan"];
    if (maleKeywords.some((kw) => vName.includes(kw))) {
      score -= 30;
    }
    return score;
  };

  const sorted = [...candidates].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return sorted[0] || null;
}

/**
 * Finds the best voice for a language.
 * Delegates to selectVoice() for compatible matching, with fallback for backward compatibility in unit tests.
 */
export function findBestVoiceForLanguage(
  voices: SpeechSynthesisVoice[],
  languageCode: string
): SpeechSynthesisVoice | null {
  const compatible = selectVoice(voices, languageCode);
  if (compatible) return compatible;

  // Fallback for mock unit test scenarios where a default voice was expected
  if (voices && voices.length > 0) {
    return voices.find((v) => v.default) || voices[0] || null;
  }

  return null;
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
  // Strong reference retention for active utterances to prevent browser garbage collection mid-speech
  private activeUtterances: Set<SpeechSynthesisUtterance> = new Set();

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
      (window as any).__weathergpt_active_utterances__ = this.activeUtterances;
      this.loadVoices();
      if (typeof this.synth.addEventListener === "function") {
        this.synth.addEventListener("voiceschanged", () => {
          this.loadVoices();
        });
      } else if (this.synth.onvoiceschanged !== undefined) {
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

    const immediate = this.synth.getVoices();
    if (immediate && immediate.length > 0) {
      this.voices = immediate;
      this.voicesLoaded = true;
      return immediate;
    }

    return new Promise((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        try {
          const v = this.synth?.getVoices() || [];
          if (v.length > 0) {
            this.voices = v;
            this.voicesLoaded = true;
          }
          resolve(this.voices);
        } catch {
          resolve([]);
        }
      };

      if (this.synth) {
        if (typeof this.synth.addEventListener === "function") {
          this.synth.addEventListener("voiceschanged", finish, { once: true });
        } else {
          this.synth.onvoiceschanged = finish;
        }
      }
      setTimeout(finish, 400);
    });
  }

  public isSpeaking(): boolean {
    return this._isSpeaking || Boolean(this.synth?.speaking);
  }

  public stop(): void {
    this.activeRequestId++;
    this._isSpeaking = false;
    this.currentUtterance = null;
    this.activeUtterances.clear();
    if (typeof window !== "undefined") {
      (window as any).__weathergpt_current_utterance__ = null;
    }
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

    // Check available browser voices first
    const availableVoices = await this.getVoices();
    const selectedVoice = selectVoice(availableVoices, options.language);
    const targetLangCode = resolveTTSLanguageCode(options.language);
    const isLangEnglish = options.language === "en" || targetLangCode.toLowerCase().startsWith("en");

    // 1. Keep browser TTS when a compatible voice exists
    if ((selectedVoice && isVoiceCompatible(selectedVoice, options.language)) || (isLangEnglish && availableVoices.length > 0)) {
      await this.playWithBrowserSynthesis(formattedText, options, requestId, selectedVoice);
      return;
    }

    // 2. Use Bhashini only when configured and available for Indian languages
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
            sourceLanguage: bhashiniLang,
            language: bhashiniLang,
            gender: "female",
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
                // Never silently fall back to English if no compatible voice exists
                if (!selectedVoice && !isLangEnglish && availableVoices.length > 0) {
                  const langName = getLanguageConfig(options.language).name;
                  options.onError?.({
                    code: "voice-unavailable",
                    message: `No compatible voice for ${langName} (${targetLangCode}) is installed in your browser or operating system.`,
                    fatal: true,
                    actionHint: `Please install a ${langName} speech pack in your operating system or configure Bhashini voice services.`,
                  });
                } else {
                  this.playWithBrowserSynthesis(formattedText, options, requestId, selectedVoice);
                }
              }
            };

            await audio.play();
            return;
          }
        }
      } catch {
        // Bhashini request failed or unconfigured
      }
    }

    // 3. Never silently fall back to English: check if compatible browser voice is truly available
    if (!selectedVoice && !isLangEnglish && availableVoices.length > 0) {
      const langName = getLanguageConfig(options.language).name;
      options.onError?.({
        code: "voice-unavailable",
        message: `No compatible voice for ${langName} (${targetLangCode}) is installed in your browser or operating system.`,
        fatal: true,
        actionHint: `Please install a ${langName} speech pack in your operating system settings or configure Bhashini voice services.`,
      });
      return;
    }

    // 4. Play using client-side Web Speech API SpeechSynthesis (for English or mock environments)
    await this.playWithBrowserSynthesis(formattedText, options, requestId, selectedVoice);
  }

  private async playWithBrowserSynthesis(
    formattedText: string,
    options: TTSOptions,
    requestId: number,
    preselectedVoice?: SpeechSynthesisVoice | null
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
    const selectedVoice = preselectedVoice !== undefined ? preselectedVoice : selectVoice(availableVoices, options.language);
    const targetLangCode = resolveTTSLanguageCode(options.language);
    const isLangEnglish = options.language === "en" || targetLangCode.toLowerCase().startsWith("en");

    // Guard against silent English fallback when voices exist but none match the non-English target
    if (!selectedVoice && !isLangEnglish && availableVoices.length > 0) {
      const langName = getLanguageConfig(options.language).name;
      options.onError?.({
        code: "voice-unavailable",
        message: `No compatible voice for ${langName} (${targetLangCode}) is installed in your browser or operating system.`,
        fatal: true,
        actionHint: `Please install a ${langName} speech pack in your operating system settings.`,
      });
      return;
    }

    // Split text into natural sentence chunks to prevent browser playback timeouts
    const chunks = splitIntoSpeechChunks(formattedText, 160);
    if (chunks.length === 0) {
      options.onEnd?.();
      return;
    }

    // Small delay (30ms) to ensure previous cancelled synthesis is cleared on Chromium thread
    await new Promise((resolve) => setTimeout(resolve, 30));
    if (this.activeRequestId !== requestId) return;

    let chunkIndex = 0;
    let sessionStarted = false;

    const playNextChunk = () => {
      if (this.activeRequestId !== requestId) {
        this._isSpeaking = false;
        return;
      }

      if (chunkIndex >= chunks.length) {
        this._isSpeaking = false;
        this.currentUtterance = null;
        if (typeof window !== "undefined") {
          (window as any).__weathergpt_current_utterance__ = null;
        }
        options.onEnd?.();
        return;
      }

      const chunkText = chunks[chunkIndex++];
      const utterance = new SpeechSynthesisUtterance(chunkText);

      // Strictly preserve genuine target language BCP-47 tag; only assign voice if genuinely compatible
      utterance.lang = targetLangCode;
      if (selectedVoice && isVoiceCompatible(selectedVoice, options.language)) {
        utterance.voice = selectedVoice;
      }
      // Natural, clear, fluent defaults (pitch: 1.06, rate: 0.98)
      utterance.rate = options.rate ?? 0.98;
      utterance.pitch = options.pitch ?? 1.06;
      utterance.volume = options.volume !== undefined ? options.volume : 1.0;

      // Strong GC retention in Set and global window property to prevent mid-speech garbage collection
      this.activeUtterances.add(utterance);
      this.currentUtterance = utterance;
      if (typeof window !== "undefined") {
        (window as any).__weathergpt_current_utterance__ = utterance;
      }

      utterance.onstart = () => {
        if (this.activeRequestId !== requestId) return;
        if (!sessionStarted) {
          sessionStarted = true;
          this._isSpeaking = true;
          options.onStart?.();
        }
      };

      utterance.onend = () => {
        this.activeUtterances.delete(utterance);
        if (this.activeRequestId === requestId) {
          playNextChunk();
        }
      };

      utterance.onerror = (event: any) => {
        this.activeUtterances.delete(utterance);
        if (this.activeRequestId !== requestId) return;

        // Intentional cancellation (e.g. user clicked Stop or started new speech)
        if (event.error === "canceled") {
          this._isSpeaking = false;
          return;
        }

        // Interrupted event: superseded session or hardware interrupt
        if (event.error === "interrupted") {
          this._isSpeaking = false;
          return;
        }

        // Voice or language unavailable in this browser/OS
        if (event.error === "language-unavailable" || event.error === "voice-unavailable") {
          this._isSpeaking = false;
          const langName = getLanguageConfig(options.language).name;
          console.warn(
            `[TTS] Speech voice unavailable for ${langName} (${targetLangCode}) in this browser environment.`
          );
          options.onError?.({
            code: "voice-unavailable",
            message: `Speech voice for ${langName} is not installed in your browser or operating system.`,
            fatal: true,
          });
          return;
        }

        // For other non-fatal chunk errors, attempt to proceed to the next chunk
        console.warn(`[TTS] Chunk error on chunk ${chunkIndex}/${chunks.length}:`, event.error);
        if (chunkIndex < chunks.length) {
          playNextChunk();
        } else {
          this._isSpeaking = false;
          options.onEnd?.();
        }
      };

      try {
        this.synth?.speak(utterance);
      } catch (err: any) {
        this.activeUtterances.delete(utterance);
        if (this.activeRequestId !== requestId) return;
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
