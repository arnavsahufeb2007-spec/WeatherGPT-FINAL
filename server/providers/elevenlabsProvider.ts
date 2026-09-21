/**
 * ELEVENLABS AI Provider & Adapter Layer
 *
 * Provides server-side Speech-To-Text (STT) via ElevenLabs Scribe v2
 * and Text-To-Speech (TTS) via ElevenLabs Multilingual v2 models.
 *
 * ElevenLabs Scribe v2 provides state-of-the-art speech recognition across 90+ languages
 * with automatic language detection, high accent resilience, and word-level accuracy.
 *
 * NOTE: The ELEVENLABS_API_KEY is server-only and NEVER exposed to the browser client.
 */

export interface ElevenLabsStatus {
  enabled: boolean;
  configured: boolean;
  provider: "elevenlabs";
  sttModel: string;
  ttsModel: string;
  defaultVoiceId: string;
  features: {
    stt: boolean;
    tts: boolean;
  };
}

export interface ElevenLabsTranscribeRequest {
  audioBuffer: Buffer;
  mimeType?: string;
  languageCode?: string;
}

export interface ElevenLabsTranscribeResponse {
  success: boolean;
  transcript?: string;
  language?: string;
  confidence?: number;
  words?: Array<{
    text: string;
    start?: number;
    end?: number;
    type?: string;
  }>;
  provider: "elevenlabs";
  model?: string;
  error?: string;
  code?: string;
}

export interface ElevenLabsTtsRequest {
  text: string;
  voiceId?: string;
  targetLanguage?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface ElevenLabsTtsResponse {
  success: boolean;
  audioBase64?: string;
  format?: string;
  provider: "elevenlabs";
  model?: string;
  error?: string;
  code?: string;
}

export const ELEVENLABS_DEFAULT_STT_MODEL = "scribe_v2";
export const ELEVENLABS_DEFAULT_TTS_MODEL = "eleven_multilingual_v2";
// "21m00Tcm4TlvDq8ikWAM" is Rachel - the signature high-clarity voice in ElevenLabs
export const ELEVENLABS_DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export function normalizeElevenLabsTtsModel(raw?: string): string {
  if (!raw) return ELEVENLABS_DEFAULT_TTS_MODEL;
  const clean = raw.trim();
  const lower = clean.toLowerCase();
  if (
    lower.includes("multilingual") ||
    lower.includes("v2") ||
    lower.includes("v3") ||
    lower.includes("eleven v3") ||
    lower.includes("turbo") ||
    lower.includes("flash")
  ) {
    if (lower === "eleven_turbo_v2_5" || lower === "eleven_turbo_v2") return lower;
    if (lower === "eleven_flash_v2_5" || lower === "eleven_flash_v2") return lower;
    if (lower === "eleven_multilingual_v2") return lower;
    return ELEVENLABS_DEFAULT_TTS_MODEL;
  }
  return clean || ELEVENLABS_DEFAULT_TTS_MODEL;
}

export function normalizeElevenLabsSttModel(raw?: string): string {
  if (!raw) return ELEVENLABS_DEFAULT_STT_MODEL;
  const clean = raw.trim();
  const lower = clean.toLowerCase();
  if (lower.includes("scribe") || lower.includes("realtime") || lower.includes("v2")) {
    return "scribe_v2";
  }
  return clean || ELEVENLABS_DEFAULT_STT_MODEL;
}

/**
 * Maps standard language codes (e.g., 'en', 'hi', 'gu', 'bn', 'te', 'ta')
 * to ElevenLabs Scribe v2 compatible ISO 639 codes, or returns undefined for auto-detection.
 */
export function resolveElevenLabsLanguageCode(languageCode?: string): string | undefined {
  if (!languageCode || typeof languageCode !== "string") {
    return undefined;
  }
  const clean = languageCode.trim().toLowerCase();
  if (clean === "auto" || clean === "all" || clean === "") {
    return undefined;
  }

  const mapping: Record<string, string> = {
    en: "en",
    "en-in": "en",
    "en-us": "en",
    "en-gb": "en",
    hi: "hi",
    "hi-in": "hi",
    hinglish: "hi",
    gu: "gu",
    "gu-in": "gu",
    bn: "bn",
    "bn-in": "bn",
    te: "te",
    "te-in": "te",
    ta: "ta",
    "ta-in": "ta",
    mr: "mr",
    "mr-in": "mr",
    kn: "kn",
    "kn-in": "kn",
    ml: "ml",
    "ml-in": "ml",
    pa: "pa",
    "pa-in": "pa",
    as: "as",
    "as-in": "as",
    or: "or",
    "or-in": "or",
    ur: "ur",
    "ur-in": "ur",
    ne: "ne",
    "ne-np": "ne",
    sd: "sd",
    "sd-in": "sd",
    es: "es",
    "es-es": "es",
    fr: "fr",
    "fr-fr": "fr",
    de: "de",
    "de-de": "de",
    ja: "ja",
    "ja-jp": "ja",
    ko: "ko",
    "ko-kr": "ko",
    zh: "zh",
    "zh-cn": "zh",
    it: "it",
    pt: "pt",
    ru: "ru",
    ar: "ar",
  };

  return mapping[clean] || (clean.length === 2 || clean.length === 3 ? clean : undefined);
}

export class ElevenLabsProvider {
  private apiKeyOverride?: string;
  private sttModelOverride?: string;
  private ttsModelOverride?: string;
  private defaultVoiceIdOverride?: string;

  constructor(options?: {
    apiKey?: string;
    sttModel?: string;
    ttsModel?: string;
    defaultVoiceId?: string;
  }) {
    if (options?.apiKey !== undefined) this.apiKeyOverride = options.apiKey;
    if (options?.sttModel !== undefined) this.sttModelOverride = options.sttModel;
    if (options?.ttsModel !== undefined) this.ttsModelOverride = options.ttsModel;
    if (options?.defaultVoiceId !== undefined) this.defaultVoiceIdOverride = options.defaultVoiceId;
  }

  private getApiKey(): string | null {
    const key = this.apiKeyOverride !== undefined ? this.apiKeyOverride : process.env.ELEVENLABS_API_KEY;
    if (!key || typeof key !== "string" || !key.trim()) {
      return null;
    }
    return key.trim();
  }

  public isAvailable(): boolean {
    return Boolean(this.getApiKey());
  }

  public getStatus(): ElevenLabsStatus {
    const isConfigured = this.isAvailable();
    return {
      enabled: isConfigured,
      configured: isConfigured,
      provider: "elevenlabs",
      sttModel: normalizeElevenLabsSttModel(this.sttModelOverride || process.env.ELEVENLABS_STT_MODEL),
      ttsModel: normalizeElevenLabsTtsModel(this.ttsModelOverride || process.env.ELEVENLABS_TTS_MODEL),
      defaultVoiceId: this.defaultVoiceIdOverride || process.env.ELEVENLABS_VOICE_ID || ELEVENLABS_DEFAULT_VOICE_ID,
      features: {
        stt: isConfigured,
        tts: isConfigured,
      },
    };
  }

  /**
   * Transcribe an audio buffer using ElevenLabs Scribe v2
   */
  public async transcribe(req: ElevenLabsTranscribeRequest): Promise<ElevenLabsTranscribeResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: "ELEVENLABS_API_KEY is not configured on the server.",
        code: "elevenlabs-not-configured",
        provider: "elevenlabs",
      };
    }

    if (!req.audioBuffer || req.audioBuffer.length === 0) {
      return {
        success: false,
        error: "Audio buffer is empty or missing.",
        code: "invalid-audio",
        provider: "elevenlabs",
      };
    }

    const mimeType = req.mimeType || "audio/webm";
    // Choose file extension based on mimeType
    let extension = "webm";
    if (mimeType.includes("wav")) extension = "wav";
    else if (mimeType.includes("mp4") || mimeType.includes("m4a")) extension = "m4a";
    else if (mimeType.includes("mp3") || mimeType.includes("mpeg")) extension = "mp3";
    else if (mimeType.includes("ogg")) extension = "ogg";

    const modelId = normalizeElevenLabsSttModel(this.sttModelOverride || process.env.ELEVENLABS_STT_MODEL);
    const resolvedLang = resolveElevenLabsLanguageCode(req.languageCode);

    try {
      const blob = new Blob([req.audioBuffer], { type: mimeType });
      const formData = new FormData();
      formData.append("file", blob, `voice_recording.${extension}`);
      formData.append("model_id", modelId);
      if (resolvedLang) {
        formData.append("language_code", resolvedLang);
      }

      const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMessage =
          errJson.detail?.message ||
          errJson.message ||
          `ElevenLabs Speech-to-Text failed with status ${response.status}`;
        return {
          success: false,
          error: errMessage,
          code: `elevenlabs-http-${response.status}`,
          provider: "elevenlabs",
          model: modelId,
        };
      }

      const data = await response.json();
      const transcript = typeof data.text === "string" ? data.text.trim() : "";

      return {
        success: true,
        transcript,
        language: data.language_code || resolvedLang,
        confidence: typeof data.language_probability === "number" ? data.language_probability : undefined,
        words: Array.isArray(data.words) ? data.words : undefined,
        provider: "elevenlabs",
        model: modelId,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to communicate with ElevenLabs Speech-to-Text API",
        code: "elevenlabs-network-error",
        provider: "elevenlabs",
      };
    }
  }

  /**
   * Synthesize speech using ElevenLabs Multilingual v2
   */
  public async tts(req: ElevenLabsTtsRequest): Promise<ElevenLabsTtsResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: "ELEVENLABS_API_KEY is not configured on the server.",
        code: "elevenlabs-not-configured",
        provider: "elevenlabs",
      };
    }

    if (!req.text || !req.text.trim()) {
      return {
        success: false,
        error: "Text is empty or missing.",
        code: "empty-text",
        provider: "elevenlabs",
      };
    }

    const voiceId = req.voiceId || this.defaultVoiceIdOverride || process.env.ELEVENLABS_VOICE_ID || ELEVENLABS_DEFAULT_VOICE_ID;
    const modelId = normalizeElevenLabsTtsModel(this.ttsModelOverride || process.env.ELEVENLABS_TTS_MODEL);
    const langCode = resolveElevenLabsLanguageCode(req.targetLanguage);

    const payload: Record<string, any> = {
      text: req.text.trim(),
      model_id: modelId,
      voice_settings: {
        stability: req.stability ?? 0.5,
        similarity_boost: req.similarityBoost ?? 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    };
    if (langCode) {
      payload.language_code = langCode;
    }

    try {
      let response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // If ElevenLabs rejects because the model does not support this specific language_code string,
      // retry once without language_code so eleven_multilingual_v2 automatically synthesizes from text
      if (!response.ok && payload.language_code) {
        const peekErr = await response.clone().json().catch(() => ({}));
        const errMsg = peekErr.detail?.message || peekErr.message || "";
        if (errMsg.includes("does not support language_code")) {
          delete payload.language_code;
          response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
        }
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMessage =
          errJson.detail?.message ||
          errJson.message ||
          `ElevenLabs TTS failed with status ${response.status}`;
        return {
          success: false,
          error: errMessage,
          code: `elevenlabs-http-${response.status}`,
          provider: "elevenlabs",
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(arrayBuffer).toString("base64");

      return {
        success: true,
        audioBase64,
        format: "audio/mpeg",
        provider: "elevenlabs",
        model: modelId,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to communicate with ElevenLabs Text-to-Speech API",
        code: "elevenlabs-network-error",
        provider: "elevenlabs",
      };
    }
  }
}

export const elevenlabsProvider = new ElevenLabsProvider();
