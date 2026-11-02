/**
 * SARVAM AI Provider & Adapter Layer
 *
 * Provides server-side Text-To-Speech (TTS) integration using Sarvam AI's
 * Bulbul v3 model for supported Indian regional languages and Indian English.
 *
 * Used as a high-fidelity server-side TTS fallback when the user's browser
 * or operating system lacks a native speech synthesis voice for the target language.
 *
 * NOTE: The SARVAM_API_KEY is server-only and NEVER exposed to the browser client.
 */

export interface SarvamStatus {
  enabled: boolean;
  configured: boolean;
  provider: "sarvam";
  model: string;
  supportedLanguages: string[];
}

export interface SarvamTtsRequest {
  text: string;
  targetLanguage: string;
  gender?: "female" | "male";
  speaker?: string;
  pace?: number;
}

export interface SarvamTtsResponse {
  success: boolean;
  audioBase64?: string;
  format?: string;
  language?: string;
  provider: "sarvam";
  model?: string;
  error?: string;
}

/**
 * Supported Sarvam Bulbul v3 target languages mapped to standard BCP-47 codes.
 * Sarvam Bulbul v3 supports 11 languages:
 * Gujarati (gu-IN), Bengali (bn-IN), Tamil (ta-IN), Telugu (te-IN),
 * Marathi (mr-IN), Kannada (kn-IN), Malayalam (ml-IN), Punjabi (pa-IN),
 * Odia (od-IN), Hindi (hi-IN), and Indian English (en-IN).
 */
export const SARVAM_SUPPORTED_LANGUAGES: Record<string, string> = {
  // Gujarati
  gu: "gu-IN",
  "gu-in": "gu-IN",
  // Bengali
  bn: "bn-IN",
  "bn-in": "bn-IN",
  // Tamil
  ta: "ta-IN",
  "ta-in": "ta-IN",
  // Telugu
  te: "te-IN",
  "te-in": "te-IN",
  // Marathi
  mr: "mr-IN",
  "mr-in": "mr-IN",
  // Kannada
  kn: "kn-IN",
  "kn-in": "kn-IN",
  // Malayalam
  ml: "ml-IN",
  "ml-in": "ml-IN",
  // Punjabi
  pa: "pa-IN",
  "pa-in": "pa-IN",
  // Odia (supports both 'od' and 'or' ISO variants)
  od: "od-IN",
  "od-in": "od-IN",
  or: "od-IN",
  "or-in": "od-IN",
  // Hindi
  hi: "hi-IN",
  "hi-in": "hi-IN",
  // Hinglish: voiced with natural code-mixing
  hinglish: "hi-IN",
  // English (Indian accent)
  en: "en-IN",
  "en-in": "en-IN",
  "en-us": "en-IN",
  "en-gb": "en-IN",
};

/**
 * Valid speakers supported by Sarvam Bulbul v3.
 * Sourced directly from the official Bulbul v3 model specification.
 */
export const SARVAM_BULBUL_V3_SPEAKERS = [
  "aditya", "ritu", "ashutosh", "priya", "neha", "rahul", "pooja", "rohan",
  "simran", "kavya", "amit", "dev", "ishita", "shreya", "ratan", "varun",
  "manan", "sumit", "roopa", "kabir", "aayan", "shubh", "advait", "anand",
  "tanya", "tarun", "sunny", "mani", "gokul", "vijay", "shruti", "suhani",
  "mohit", "kavitha", "rehan", "soham", "rupali",
] as const;

export type SarvamBulbulV3Speaker = (typeof SARVAM_BULBUL_V3_SPEAKERS)[number];

export const SARVAM_DEFAULT_FEMALE_SPEAKER: SarvamBulbulV3Speaker = "priya";
export const SARVAM_DEFAULT_MALE_SPEAKER: SarvamBulbulV3Speaker = "shubh";

/**
 * Resolves a requested speaker to a valid Sarvam Bulbul v3 speaker.
 * Replaces invalid / unsupported speakers (such as "meera") with valid defaults
 * while preserving the selected gender behavior.
 */
export function resolveSarvamSpeaker(speaker?: string, gender?: "female" | "male"): SarvamBulbulV3Speaker {
  const normalized = speaker?.trim().toLowerCase();
  if (
    normalized &&
    normalized !== "meera" &&
    (SARVAM_BULBUL_V3_SPEAKERS as readonly string[]).includes(normalized)
  ) {
    return normalized as SarvamBulbulV3Speaker;
  }
  return gender === "male" ? SARVAM_DEFAULT_MALE_SPEAKER : SARVAM_DEFAULT_FEMALE_SPEAKER;
}

/**
 * Resolves a language identifier into a valid Sarvam BCP-47 language code.
 * Rejects "all", "ALL", "auto", or empty values with null.
 */
export function resolveSarvamLanguageCode(lang: string | null | undefined): string | null {
  if (!lang) return null;
  const normalized = lang.trim().toLowerCase();
  // "ALL" or "auto" must never reach Sarvam as a language code
  if (normalized === "all" || normalized === "auto") {
    return null;
  }
  return SARVAM_SUPPORTED_LANGUAGES[normalized] || null;
}

export class SarvamProvider {
  private apiKey: string | null;
  private endpoint: string;
  private model: string;

  constructor(apiKey?: string, endpoint?: string, model?: string) {
    this.apiKey = apiKey !== undefined ? apiKey : (process.env.SARVAM_API_KEY || null);
    this.endpoint = endpoint || process.env.SARVAM_TTS_ENDPOINT || "https://api.sarvam.ai/text-to-speech";
    this.model = model || process.env.SARVAM_TTS_MODEL || "bulbul:v3";
  }

  /**
   * Returns true only when a valid server-side API key is configured
   */
  public isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Safe status object for public inspection (NEVER reveals secret API key)
   */
  public getStatus(): SarvamStatus {
    const isConfig = this.isAvailable();
    return {
      enabled: isConfig,
      configured: isConfig,
      provider: "sarvam",
      model: this.model,
      supportedLanguages: [
        "gu-IN", "bn-IN", "ta-IN", "te-IN", "mr-IN",
        "kn-IN", "ml-IN", "pa-IN", "od-IN", "hi-IN", "en-IN"
      ],
    };
  }

  /**
   * Checks if a language code can be mapped to a supported Sarvam Bulbul v3 language
   */
  public isLanguageSupported(language: string): boolean {
    return resolveSarvamLanguageCode(language) !== null;
  }

  /**
   * Synthesizes speech using Sarvam Bulbul v3 API
   */
  public async tts(params: SarvamTtsRequest): Promise<SarvamTtsResponse> {
    if (!params.text || !params.text.trim()) {
      return {
        success: false,
        error: "Text content is required for speech synthesis.",
        provider: "sarvam",
      };
    }

    if (!this.isAvailable()) {
      return {
        success: false,
        error: "SARVAM_API_KEY is not configured on the server.",
        provider: "sarvam",
      };
    }

    const targetLangCode = resolveSarvamLanguageCode(params.targetLanguage);
    if (!targetLangCode) {
      return {
        success: false,
        error: `Language '${params.targetLanguage}' is not supported by Sarvam Bulbul v3.`,
        provider: "sarvam",
      };
    }

    // Resolve valid Bulbul v3 speaker (default female: "priya", default male: "shubh")
    // Ensures invalid speakers such as legacy "meera" are strictly rejected/mapped to a valid speaker.
    const speaker = resolveSarvamSpeaker(params.speaker, params.gender);

    try {
      // Bulbul v3 supports up to 2500 characters per request
      const safeText = params.text.trim().slice(0, 2500);

      const requestPayload = {
        inputs: [safeText],
        target_language_code: targetLangCode,
        speaker,
        pitch: 0,
        pace: params.pace || 1.0,
        loudness: 1.0,
        speech_sample_rate: 24000,
        enable_preprocessing: true,
        model: this.model,
      };

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": this.apiKey!,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        let errMessage = `Sarvam API error: HTTP ${response.status} ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData?.message) {
            errMessage = errData.message;
          } else if (errData?.detail) {
            errMessage = typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch {
          // ignore json parse error
        }

        return {
          success: false,
          error: errMessage,
          provider: "sarvam",
        };
      }

      const data = await response.json();
      if (data?.audios && Array.isArray(data.audios) && data.audios.length > 0 && data.audios[0]) {
        return {
          success: true,
          audioBase64: data.audios[0],
          format: "audio/wav",
          language: targetLangCode,
          provider: "sarvam",
          model: this.model,
        };
      }

      return {
        success: false,
        error: "No audio stream returned in Sarvam API response.",
        provider: "sarvam",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to reach Sarvam text-to-speech service.",
        provider: "sarvam",
      };
    }
  }
}

export const sarvamProvider = new SarvamProvider();
