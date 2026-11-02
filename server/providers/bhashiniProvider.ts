/**
 * BHASHINI Provider & Adapter Layer
 *
 * Provides optional Indian-language service integration (translation, ASR/TTS, normalization)
 * using the Government of India / MeitY Bhashini ULCA / Dhruva API.
 *
 * NOTE: This is an optional provider/adapter layer. Gemini remains the primary AI reasoning
 * and weather interpretation engine. WeatherGPT directly uses Gemini's native multilingual
 * capabilities when Bhashini is not enabled or credentials are not configured.
 */

export interface BhashiniStatus {
  enabled: boolean;
  configured: boolean;
  provider: "bhashini";
  supportedIndianLanguages: string[];
  pipelineUrl: string;
  features: {
    translation: boolean;
    normalization: boolean;
    tts: boolean;
    asr: boolean;
  };
}

export interface BhashiniTranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface BhashiniTranslationResponse {
  success: boolean;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: "bhashini" | "gemini_native";
  cached?: boolean;
}

export interface BhashiniAsrRequest {
  audioBase64: string;
  sourceLanguage: string;
  audioFormat?: string;
}

export interface BhashiniAsrResponse {
  success: boolean;
  transcript: string;
  sourceLanguage: string;
  provider: "bhashini" | "fallback";
  error?: string;
}

export interface BhashiniTtsRequest {
  text: string;
  sourceLanguage: string;
  gender?: "female" | "male";
}

export interface BhashiniTtsResponse {
  success: boolean;
  audioBase64?: string;
  format?: string;
  sourceLanguage: string;
  provider: "bhashini" | "native_browser";
  error?: string;
}

class BhashiniProvider {
  private enabled: boolean;
  private userId: string | null;
  private apiKey: string | null;
  private inferenceApiKey: string | null;
  private pipelineUrl: string;

  constructor() {
    this.enabled = process.env.BHASHINI_ENABLED === "true";
    this.userId = process.env.BHASHINI_USER_ID || null;
    this.apiKey = process.env.BHASHINI_API_KEY || null;
    this.inferenceApiKey = process.env.BHASHINI_INFERENCE_API_KEY || null;
    this.pipelineUrl =
      process.env.BHASHINI_PIPELINE_URL || "https://dhruva-api.bhashini.gov.in/services/inference/pipeline";
  }

  /**
   * Returns true only when Bhashini is explicitly enabled and keys are configured
   */
  public isAvailable(): boolean {
    return (
      this.enabled &&
      Boolean(this.userId && (this.apiKey || this.inferenceApiKey))
    );
  }

  /**
   * Public capability status (never reveals secret keys)
   */
  public getStatus(): BhashiniStatus {
    const isConfig = Boolean(this.userId && (this.apiKey || this.inferenceApiKey));
    return {
      enabled: this.enabled,
      configured: isConfig,
      provider: "bhashini",
      supportedIndianLanguages: [
        "hi", "bn", "te", "mr", "ta", "gu", "kn", "ml", "pa", "as", "or", "ur", "ne", "sd", "en"
      ],
      pipelineUrl: this.pipelineUrl,
      features: {
        translation: isConfig && this.enabled,
        normalization: isConfig && this.enabled,
        tts: isConfig && this.enabled,
        asr: isConfig && this.enabled,
      },
    };
  }

  /**
   * Translate text through Bhashini Dhruva pipeline if configured
   */
  public async translate(req: BhashiniTranslationRequest): Promise<BhashiniTranslationResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        translatedText: req.text,
        sourceLanguage: req.sourceLanguage,
        targetLanguage: req.targetLanguage,
        provider: "gemini_native",
      };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.userId) headers["userID"] = this.userId;
      if (this.apiKey) headers["ulcaApiKey"] = this.apiKey;
      if (this.inferenceApiKey) headers["Authorization"] = this.inferenceApiKey;

      const payload = {
        pipelineTasks: [
          {
            taskType: "translation",
            config: {
              language: {
                sourceLanguage: req.sourceLanguage,
                targetLanguage: req.targetLanguage,
              },
            },
          },
        ],
        inputData: {
          input: [{ source: req.text }],
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(this.pipelineUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Bhashini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const outputText =
        data?.pipelineResponse?.[0]?.output?.[0]?.target ||
        data?.output?.[0]?.target;

      if (!outputText) {
        throw new Error("No target translation returned from Bhashini pipeline");
      }

      return {
        success: true,
        translatedText: outputText,
        sourceLanguage: req.sourceLanguage,
        targetLanguage: req.targetLanguage,
        provider: "bhashini",
      };
    } catch (err: any) {
      console.warn("Bhashini translation failed, falling back to Gemini native:", err.message);
      return {
        success: false,
        translatedText: req.text,
        sourceLanguage: req.sourceLanguage,
        targetLanguage: req.targetLanguage,
        provider: "gemini_native",
      };
    }
  }

  /**
   * Automatic Speech Recognition (ASR) through Bhashini Dhruva pipeline if configured
   */
  public async asr(req: BhashiniAsrRequest): Promise<BhashiniAsrResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        transcript: "",
        sourceLanguage: req.sourceLanguage,
        provider: "fallback",
        error: "Bhashini is not configured or disabled; client-side STT is used.",
      };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.userId) headers["userID"] = this.userId;
      if (this.apiKey) headers["ulcaApiKey"] = this.apiKey;
      if (this.inferenceApiKey) headers["Authorization"] = this.inferenceApiKey;

      const payload = {
        pipelineTasks: [
          {
            taskType: "asr",
            config: {
              language: {
                sourceLanguage: req.sourceLanguage,
              },
              audioFormat: req.audioFormat || "wav",
            },
          },
        ],
        inputData: {
          audio: [{ audioContent: req.audioBase64 }],
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(this.pipelineUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Bhashini ASR error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const outputText =
        data?.pipelineResponse?.[0]?.output?.[0]?.source ||
        data?.output?.[0]?.source;

      if (!outputText) {
        throw new Error("No transcription returned from Bhashini ASR pipeline");
      }

      return {
        success: true,
        transcript: outputText.trim(),
        sourceLanguage: req.sourceLanguage,
        provider: "bhashini",
      };
    } catch (err: any) {
      console.warn("Bhashini ASR failed, fallback to browser native:", err.message);
      return {
        success: false,
        transcript: "",
        sourceLanguage: req.sourceLanguage,
        provider: "fallback",
        error: err.message,
      };
    }
  }

  /**
   * Text-to-Speech (TTS) through Bhashini Dhruva pipeline if configured
   */
  public async tts(req: BhashiniTtsRequest): Promise<BhashiniTtsResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        sourceLanguage: req.sourceLanguage,
        provider: "native_browser",
        error: "Bhashini is not configured; native browser TTS is used.",
      };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.userId) headers["userID"] = this.userId;
      if (this.apiKey) headers["ulcaApiKey"] = this.apiKey;
      if (this.inferenceApiKey) headers["Authorization"] = this.inferenceApiKey;

      const payload = {
        pipelineTasks: [
          {
            taskType: "tts",
            config: {
              language: {
                sourceLanguage: req.sourceLanguage,
              },
              gender: req.gender || "female",
            },
          },
        ],
        inputData: {
          input: [{ source: req.text }],
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(this.pipelineUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Bhashini TTS error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const audioBase64 =
        data?.pipelineResponse?.[0]?.audio?.[0]?.audioContent ||
        data?.audio?.[0]?.audioContent;

      if (!audioBase64) {
        throw new Error("No audio content returned from Bhashini TTS pipeline");
      }

      return {
        success: true,
        audioBase64,
        format: "audio/wav",
        sourceLanguage: req.sourceLanguage,
        provider: "bhashini",
      };
    } catch (err: any) {
      console.warn("Bhashini TTS failed, fallback to native browser TTS:", err.message);
      return {
        success: false,
        sourceLanguage: req.sourceLanguage,
        provider: "native_browser",
        error: err.message,
      };
    }
  }

  /**
   * Normalizes Indian language input text (handling zero-width joiners, diacritics, script normalization)
   */
  public normalizeInput(text: string): string {
    if (!text) return "";
    // NFC Unicode normalization for standard Indian script representations
    return text.normalize("NFC").trim();
  }
}

export const bhashiniProvider = new BhashiniProvider();
