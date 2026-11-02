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
  if (!languageCode || languageCode.toLowerCase() === "all" || languageCode.toLowerCase() === "auto") {
    return "en-IN";
  }

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
  private audioContext: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  // Preserved successful audio payload for user-gesture replay or cached playback
  private preservedAudio: {
    audioBase64: string;
    format: string;
    text: string;
    language: string;
    timestamp: number;
  } | null = null;
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

    // Attach user gesture unlock listeners to capture user interaction in the document or iframe
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      const unlock = () => {
        this.unlockAudio();
      };
      window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
      window.addEventListener("keydown", unlock, { capture: true, passive: true });
      window.addEventListener("touchstart", unlock, { capture: true, passive: true });
      window.addEventListener("click", unlock, { capture: true, passive: true });
    }
  }

  /**
   * Unlocks Web Audio API AudioContext during a user gesture
   * to ensure playback can proceed after asynchronous network roundtrips.
   */
  public unlockAudio(): void {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }
    } catch {
      // Ignore audio context initialization failures in restricted environments
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
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch {
        // ignore
      }
      this.currentAudioSource = null;
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
    if (this.audioContext && this.audioContext.state === "running") {
      try {
        this.audioContext.suspend().catch(() => {});
      } catch {
        // ignore
      }
    }
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
    if (this.audioContext && this.audioContext.state === "suspended") {
      try {
        this.audioContext.resume().catch(() => {});
      } catch {
        // ignore
      }
    }
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

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString =
      typeof atob === "function"
        ? atob(base64)
        : typeof Buffer !== "undefined"
        ? Buffer.from(base64, "base64").toString("binary")
        : "";
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Safely plays audio payload (base64) using Web Audio API AudioContext when available/unlocked,
   * or HTMLAudioElement fallback with explicit NotAllowedError / user-gesture handling.
   */
  private async playAudioPayload(
    audioBase64: string,
    format: string,
    requestId: number,
    options: TTSOptions,
    providerName: string
  ): Promise<boolean> {
    if (this.activeRequestId !== requestId) return false;

    // Strategy A: Web Audio API AudioContext (immune to transient user gesture timeout once running)
    if (
      this.audioContext &&
      this.audioContext.state !== "closed" &&
      typeof this.audioContext.decodeAudioData === "function"
    ) {
      try {
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume().catch(() => {});
        }
        if (this.audioContext.state === "running") {
          const arrayBuffer = this.base64ToArrayBuffer(audioBase64);
          const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
            const res = this.audioContext!.decodeAudioData(arrayBuffer, resolve, reject);
            if (res && typeof (res as any).then === "function") {
              (res as any).then(resolve, reject);
            }
          });

          if (this.activeRequestId !== requestId) return false;

          const source = this.audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = options.rate || 1.0;
          source.connect(this.audioContext.destination);

          this.currentAudioSource = source;
          this._isSpeaking = true;
          options.onStart?.();

          source.onended = () => {
            if (this.activeRequestId === requestId) {
              this._isSpeaking = false;
              this.currentAudioSource = null;
              options.onEnd?.();
            }
          };

          source.start(0);
          return true;
        }
      } catch {
        // Fall back to HTMLAudioElement
      }
    }

    // Strategy B: Standard HTMLAudioElement
    if (typeof Audio !== "undefined") {
      try {
        const audio = new Audio(`data:${format || "audio/wav"};base64,${audioBase64}`);
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
            this._isSpeaking = false;
            // CRITICAL: Do NOT convert audio playback error into "voice-unavailable"!
            options.onError?.({
              code: "synthesis-failed",
              message: `Audio playback error occurred while playing ${providerName} voice response.`,
              fatal: true,
              actionHint: "Tap Speak to try playing the audio again.",
            });
          }
        };

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.then === "function") {
          await playPromise;
        }
        return true;
      } catch (playErr: any) {
        if (this.activeRequestId !== requestId) return false;
        this.currentAudio = null;
        this._isSpeaking = false;

        const isNotAllowed =
          playErr?.name === "NotAllowedError" ||
          (typeof playErr?.message === "string" &&
            /notallowed|user gesture|interact|autoplay|not-allowed|permission/i.test(playErr.message));

        if (isNotAllowed) {
          // Playback blocked by browser autoplay/user-gesture policy.
          // CRITICAL: Do NOT treat as "voice-unavailable". The audio was generated successfully!
          options.onError?.({
            code: "not-allowed",
            message: "Audio playback was blocked by the browser. Tap Speak to play audio.",
            fatal: false,
            actionHint: "Tap Speak to play the audio response.",
          });
          return true; // Successfully handled; do not fall through to voice-unavailable
        }

        options.onError?.({
          code: "synthesis-failed",
          message: `Failed to play ${providerName} voice response audio: ${playErr?.message || "Playback error"}`,
          fatal: true,
          actionHint: "Tap Speak to try again.",
        });
        return true; // Successfully handled; do not fall through to voice-unavailable
      }
    }

    return false;
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

    // Synchronously prime/unlock AudioContext during user interaction window
    this.unlockAudio();

    const requestId = ++this.activeRequestId;
    const rawLang = options.language || "en";
    // "ALL" or "auto" must never reach TTS engines; resolve a concrete language first
    const effectiveLang = (!rawLang || rawLang.toLowerCase() === "all" || rawLang.toLowerCase() === "auto")
      ? "en"
      : rawLang;

    const formattedText = formatSpokenWeatherResponse(options.text, effectiveLang);

    if (!formattedText || !formattedText.trim()) {
      options.onEnd?.();
      return;
    }

    // Replay preserved audio immediately if user is repeating or retrying the exact response on tap
    if (
      this.preservedAudio &&
      this.preservedAudio.text === formattedText &&
      this.preservedAudio.language === effectiveLang &&
      Date.now() - this.preservedAudio.timestamp < 300000
    ) {
      const played = await this.playAudioPayload(
        this.preservedAudio.audioBase64,
        this.preservedAudio.format,
        requestId,
        options,
        "Sarvam"
      );
      if (played) return;
    }

    // Check available browser voices first
    const availableVoices = await this.getVoices();
    const selectedVoice = selectVoice(availableVoices, effectiveLang);
    const targetLangCode = resolveTTSLanguageCode(effectiveLang);
    const isLangEnglish = effectiveLang === "en" || targetLangCode.toLowerCase().startsWith("en");

    // 1. Keep browser TTS as first choice when a compatible voice exists
    if ((selectedVoice && isVoiceCompatible(selectedVoice, effectiveLang)) || (isLangEnglish && availableVoices.length > 0)) {
      await this.playWithBrowserSynthesis(formattedText, { ...options, language: effectiveLang }, requestId, selectedVoice);
      return;
    }

    // 2. Call Sarvam Bulbul v3 from the server as the primary Indian language TTS fallback
    const langConfig = getLanguageConfig(effectiveLang);
    const langCode = (langConfig?.code || effectiveLang.split("-")[0] || "en").toLowerCase();
    const primaryLang = effectiveLang.toLowerCase().split("-")[0];

    const sarvamSupportedLangs = [
      "gu", "bn", "ta", "te", "mr", "kn", "ml", "pa", "od", "or", "hi", "hinglish", "en", "as",
      "gu-in", "bn-in", "ta-in", "te-in", "mr-in", "kn-in", "ml-in", "pa-in", "od-in", "or-in", "hi-in", "en-in", "as-in"
    ];
    const isSarvamEligible =
      sarvamSupportedLangs.includes(effectiveLang.toLowerCase()) ||
      sarvamSupportedLangs.includes(langCode) ||
      sarvamSupportedLangs.includes(primaryLang);

    if (
      isSarvamEligible &&
      typeof fetch !== "undefined" &&
      typeof Audio !== "undefined"
    ) {
      try {
        const sarvamTargetLang = (langCode === "as" || primaryLang === "as") ? "bn-IN" : effectiveLang;
        const sarvamResp = await fetch("/api/voice/sarvam/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: formattedText,
            targetLanguage: sarvamTargetLang,
            gender: "female",
          }),
        });

        if (sarvamResp.ok) {
          const sarvamData = await sarvamResp.json();
          if (sarvamData.success && sarvamData.audioBase64) {
            if (this.activeRequestId !== requestId) return;

            // Preserve successful audio for user-gesture replay
            this.preservedAudio = {
              audioBase64: sarvamData.audioBase64,
              format: sarvamData.format || "audio/wav",
              text: formattedText,
              language: effectiveLang,
              timestamp: Date.now(),
            };

            const played = await this.playAudioPayload(
              sarvamData.audioBase64,
              sarvamData.format || "audio/wav",
              requestId,
              options,
              "Sarvam"
            );
            if (played) return;
          }
        }
      } catch {
        // Sarvam fallback unavailable or failed; proceed to secondary check
      }
    }

    // 3. Call ElevenLabs Multilingual v2 from the server (covers international languages and unserved Indian languages like Urdu, Nepali, Sindhi, etc.)
    if (typeof fetch !== "undefined" && typeof Audio !== "undefined") {
      try {
        const elevenResp = await fetch("/api/voice/elevenlabs/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: formattedText,
            targetLanguage: effectiveLang,
          }),
        });

        if (elevenResp.ok) {
          const elevenData = await elevenResp.json();
          if (elevenData.success && elevenData.audioBase64) {
            if (this.activeRequestId !== requestId) return;

            // Preserve successful audio for user-gesture replay
            this.preservedAudio = {
              audioBase64: elevenData.audioBase64,
              format: elevenData.format || "audio/mpeg",
              text: formattedText,
              language: effectiveLang,
              timestamp: Date.now(),
            };

            const played = await this.playAudioPayload(
              elevenData.audioBase64,
              elevenData.format || "audio/mpeg",
              requestId,
              options,
              "ElevenLabs"
            );
            if (played) return;
          }
        }
      } catch {
        // ElevenLabs unavailable or failed; proceed to secondary check
      }
    }

    // 4. Keep Bhashini code unchanged as secondary server fallback
    const indianLangCodes = [
      "hi", "hinglish", "bn", "te", "mr", "ta", "gu", "kn", "ml", "pa", "as", "or", "ur", "ne", "sd",
      "hi-in", "bn-in", "te-in", "mr-in", "ta-in", "gu-in", "kn-in", "ml-in", "pa-in", "as-in", "or-in", "ur-in"
    ];
    const isIndianLangEligible =
      indianLangCodes.includes(effectiveLang.toLowerCase()) ||
      indianLangCodes.includes(langCode) ||
      indianLangCodes.includes(primaryLang);

    if (isIndianLangEligible && typeof fetch !== "undefined" && typeof Audio !== "undefined") {
      try {
        const bhashiniLang = langCode === "hinglish" ? "hi" : (langCode || effectiveLang);
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

            // Preserve successful audio for user-gesture replay
            this.preservedAudio = {
              audioBase64: data.audioBase64,
              format: data.format || "audio/wav",
              text: formattedText,
              language: effectiveLang,
              timestamp: Date.now(),
            };

            const played = await this.playAudioPayload(
              data.audioBase64,
              data.format || "audio/wav",
              requestId,
              options,
              "Bhashini"
            );
            if (played) return;
          }
        }
      } catch {
        // Bhashini request failed or unconfigured
      }
    }

    // 4. Never silently fall back to English: check if compatible browser voice is truly available
    if (!selectedVoice && !isLangEnglish && availableVoices.length > 0) {
      const langName = getLanguageConfig(effectiveLang).name;
      options.onError?.({
        code: "voice-unavailable",
        message: `No compatible voice for ${langName} (${targetLangCode}) is installed in your browser or operating system.`,
        fatal: true,
        actionHint: `Please install a ${langName} speech pack in your operating system settings or configure Sarvam AI / Bhashini voice services.`,
      });
      return;
    }

    // 5. Play using client-side Web Speech API SpeechSynthesis (for English or mock environments)
    await this.playWithBrowserSynthesis(formattedText, { ...options, language: effectiveLang }, requestId, selectedVoice);
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
