import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveSarvamLanguageCode,
  SARVAM_SUPPORTED_LANGUAGES,
  SARVAM_BULBUL_V3_SPEAKERS,
  SARVAM_DEFAULT_FEMALE_SPEAKER,
  SARVAM_DEFAULT_MALE_SPEAKER,
  resolveSarvamSpeaker,
  sarvamProvider,
  SarvamProvider,
} from "../../../../server/providers/sarvamProvider.js";
import {
  ALL_LANGUAGES,
  INDIAN_LANGUAGES,
  INTERNATIONAL_LANGUAGES,
  SPECIAL_LANGUAGES,
  getLanguageConfig,
} from "../../../languages.js";
import { resolveTTSLanguageCode } from "../textToSpeechProvider.js";
import { VoiceManager } from "../voiceManager.js";

// ============================================================================
// Sarvam Bulbul v3 Language-Code Mapping & Filtering Tests
// ============================================================================

test("1. Sarvam Bulbul v3 Requirements: Exactly 11 target language BCP-47 codes supported", () => {
  const expectedBulbulV3BCP47Codes = new Set([
    "gu-IN", // Gujarati
    "bn-IN", // Bengali
    "ta-IN", // Tamil
    "te-IN", // Telugu
    "mr-IN", // Marathi
    "kn-IN", // Kannada
    "ml-IN", // Malayalam
    "pa-IN", // Punjabi
    "od-IN", // Odia
    "hi-IN", // Hindi
    "en-IN", // Indian English
  ]);

  const registeredValues = new Set(Object.values(SARVAM_SUPPORTED_LANGUAGES));
  assert.equal(
    registeredValues.size,
    expectedBulbulV3BCP47Codes.size,
    "Sarvam provider should register exactly the 11 Bulbul v3 language target codes"
  );

  for (const code of expectedBulbulV3BCP47Codes) {
    assert.ok(
      registeredValues.has(code),
      `Expected Bulbul v3 BCP-47 code '${code}' should be in SARVAM_SUPPORTED_LANGUAGES`
    );
  }
});

test("2. Language Mapping: Direct ISO codes map to valid Bulbul v3 BCP-47 tags", () => {
  const directMappings: Record<string, string> = {
    gu: "gu-IN",
    bn: "bn-IN",
    ta: "ta-IN",
    te: "te-IN",
    mr: "mr-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    pa: "pa-IN",
    od: "od-IN",
    or: "od-IN", // ISO 639-1 code for Odia in app registry
    hi: "hi-IN",
    en: "en-IN",
    hinglish: "hi-IN",
  };

  for (const [inputCode, expectedBcp47] of Object.entries(directMappings)) {
    const resolved = resolveSarvamLanguageCode(inputCode);
    assert.equal(
      resolved,
      expectedBcp47,
      `Language '${inputCode}' should map to Sarvam Bulbul v3 code '${expectedBcp47}'`
    );
    assert.equal(
      sarvamProvider.isLanguageSupported(inputCode),
      true,
      `sarvamProvider.isLanguageSupported('${inputCode}') should be true`
    );
  }
});

test("3. Language Mapping: Case-insensitivity and regional suffix handling", () => {
  assert.equal(resolveSarvamLanguageCode("GU"), "gu-IN");
  assert.equal(resolveSarvamLanguageCode("gu-in"), "gu-IN");
  assert.equal(resolveSarvamLanguageCode("GU-IN"), "gu-IN");
  assert.equal(resolveSarvamLanguageCode("bn-in"), "bn-IN");
  assert.equal(resolveSarvamLanguageCode("TA-IN"), "ta-IN");
  assert.equal(resolveSarvamLanguageCode("Hinglish"), "hi-IN");
  assert.equal(resolveSarvamLanguageCode("HINGLISH"), "hi-IN");
  assert.equal(resolveSarvamLanguageCode("en-US"), "en-IN");
  assert.equal(resolveSarvamLanguageCode("en-GB"), "en-IN");
  assert.equal(resolveSarvamLanguageCode("or-IN"), "od-IN");
  assert.equal(resolveSarvamLanguageCode("OD-IN"), "od-IN");
});

test("4. Filtering Out 'all' Mode: Must be rejected and never resolve to a Sarvam code", () => {
  const allVariations = ["all", "ALL", "All", "aLl", "  all  ", " ALL "];

  for (const variation of allVariations) {
    const resolved = resolveSarvamLanguageCode(variation);
    assert.equal(
      resolved,
      null,
      `'${variation}' mode must resolve to null for Sarvam Bulbul v3`
    );
    assert.equal(
      sarvamProvider.isLanguageSupported(variation),
      false,
      `sarvamProvider.isLanguageSupported('${variation}') must return false`
    );
  }
});

test("5. Filtering Out 'auto', empty, null, and whitespace inputs", () => {
  const nonTargetInputs = ["auto", "AUTO", "Auto", "", "   ", null, undefined];

  for (const input of nonTargetInputs) {
    const resolved = resolveSarvamLanguageCode(input as any);
    assert.equal(
      resolved,
      null,
      `'${String(input)}' must resolve to null for Sarvam Bulbul v3`
    );
    if (typeof input === "string") {
      assert.equal(
        sarvamProvider.isLanguageSupported(input),
        false,
        `sarvamProvider.isLanguageSupported('${input}') must return false`
      );
    }
  }
});

test("6. App Registry Cross-Check: Verifies which of ALL_LANGUAGES are supported by Sarvam", () => {
  // App languages that have a direct Bulbul v3 counterpart
  const supportedAppLanguageCodes = new Set([
    "en",
    "hi",
    "hinglish",
    "bn",
    "te",
    "mr",
    "ta",
    "gu",
    "kn",
    "ml",
    "pa",
    "or", // Odia in app registry
  ]);

  for (const lang of ALL_LANGUAGES) {
    const isExpectedSupported = supportedAppLanguageCodes.has(lang.code);
    const resolved = resolveSarvamLanguageCode(lang.code);

    if (isExpectedSupported) {
      assert.ok(
        resolved !== null,
        `App language '${lang.code}' (${lang.name}) should be mapped to a Sarvam code, but got null`
      );
      assert.equal(
        sarvamProvider.isLanguageSupported(lang.code),
        true,
        `sarvamProvider.isLanguageSupported('${lang.code}') should be true`
      );
    } else {
      assert.equal(
        resolved,
        null,
        `App language '${lang.code}' (${lang.name}) should NOT be mapped to Sarvam Bulbul v3, but got '${resolved}'`
      );
      assert.equal(
        sarvamProvider.isLanguageSupported(lang.code),
        false,
        `sarvamProvider.isLanguageSupported('${lang.code}') should be false`
      );
    }
  }
});

test("7. Indian Languages Not in Bulbul v3: Correctly identified as unsupported", () => {
  // Assamese (as), Urdu (ur), Nepali (ne), Sindhi (sd) are in the app's Indian language list
  // but are not supported by Sarvam Bulbul v3
  const nonBulbulIndianLangs = ["as", "ur", "ne", "sd"];

  for (const code of nonBulbulIndianLangs) {
    assert.equal(
      resolveSarvamLanguageCode(code),
      null,
      `Indian language '${code}' should return null for Sarvam Bulbul v3`
    );
    assert.equal(
      sarvamProvider.isLanguageSupported(code),
      false,
      `sarvamProvider.isLanguageSupported('${code}') should return false`
    );
  }
});

test("8. International Languages: All return null and false for Sarvam Bulbul v3", () => {
  for (const lang of INTERNATIONAL_LANGUAGES) {
    assert.equal(
      resolveSarvamLanguageCode(lang.code),
      null,
      `International language '${lang.code}' (${lang.name}) must resolve to null for Sarvam`
    );
    assert.equal(
      sarvamProvider.isLanguageSupported(lang.code),
      false,
      `sarvamProvider.isLanguageSupported('${lang.code}') must return false`
    );
  }
});

test("9. SarvamProvider.tts(): Validates and rejects 'all' mode without calling API", async () => {
  // Create an instance with dummy key to verify validation happens before network call
  const provider = new SarvamProvider("dummy-key");

  const resultAllLower = await provider.tts({
    text: "Current weather is 25°C",
    targetLanguage: "all",
  });

  assert.equal(resultAllLower.success, false);
  assert.equal(resultAllLower.provider, "sarvam");
  assert.match(resultAllLower.error || "", /Language 'all' is not supported/i);

  const resultAllUpper = await provider.tts({
    text: "Current weather is 25°C",
    targetLanguage: "ALL",
  });

  assert.equal(resultAllUpper.success, false);
  assert.match(resultAllUpper.error || "", /Language 'ALL' is not supported/i);

  const resultAuto = await provider.tts({
    text: "Current weather is 25°C",
    targetLanguage: "auto",
  });

  assert.equal(resultAuto.success, false);
  assert.match(resultAuto.error || "", /Language 'auto' is not supported/i);
});

test("10. SarvamProvider.tts(): Validates empty and whitespace text inputs", async () => {
  const provider = new SarvamProvider("dummy-key");

  const emptyResult = await provider.tts({
    text: "",
    targetLanguage: "gu",
  });
  assert.equal(emptyResult.success, false);
  assert.match(emptyResult.error || "", /Text content is required/i);

  const whitespaceResult = await provider.tts({
    text: "   ",
    targetLanguage: "gu",
  });
  assert.equal(whitespaceResult.success, false);
  assert.match(whitespaceResult.error || "", /Text content is required/i);
});

test("11. Integration with Voice Resolution: 'all' mode safely resolved before TTS execution", () => {
  // resolveTTSLanguageCode should never return "all" or "ALL"
  assert.equal(resolveTTSLanguageCode("all"), "en-IN");
  assert.equal(resolveTTSLanguageCode("ALL"), "en-IN");
  assert.equal(resolveTTSLanguageCode("auto"), "en-IN");

  // VoiceManager should filter out "all" / "ALL" when calculating effective output language
  const manager = new VoiceManager();
  assert.equal(manager.getEffectiveOutputLanguage("all"), "en");
  assert.equal(manager.getEffectiveOutputLanguage("ALL"), "en");
  assert.equal(manager.getEffectiveOutputLanguage("auto"), "en");

  // getLanguageConfig should treat "all" as default English config rather than throwing
  const configAll = getLanguageConfig("all");
  assert.equal(configAll.code, "en");
  const configUpperAll = getLanguageConfig("ALL");
  assert.equal(configUpperAll.code, "en");
});

test("12. Regression Test: 'meera' speaker can NEVER be sent to Sarvam Bulbul v3", () => {
  // 1. Direct invalid 'meera' resolves to valid female speaker (priya)
  assert.notEqual(resolveSarvamSpeaker("meera"), "meera");
  assert.equal(resolveSarvamSpeaker("meera"), "priya");
  assert.equal(resolveSarvamSpeaker("MEERA"), "priya");
  assert.equal(resolveSarvamSpeaker("  meera  "), "priya");
  assert.equal(resolveSarvamSpeaker("Meera"), "priya");

  // 2. If male gender requested with 'meera', resolves to valid male speaker (shubh)
  assert.equal(resolveSarvamSpeaker("meera", "male"), "shubh");

  // 3. 'meera' must NOT be in the official SARVAM_BULBUL_V3_SPEAKERS list
  assert.equal(
    (SARVAM_BULBUL_V3_SPEAKERS as readonly string[]).includes("meera"),
    false,
    "'meera' must NOT be in SARVAM_BULBUL_V3_SPEAKERS"
  );
});

test("13. Bulbul v3 Speakers: Valid speakers preserved and normalized to lowercase", () => {
  // Test common valid speakers
  assert.equal(resolveSarvamSpeaker("Priya"), "priya");
  assert.equal(resolveSarvamSpeaker("SHUBH"), "shubh");
  assert.equal(resolveSarvamSpeaker("aditya"), "aditya");
  assert.equal(resolveSarvamSpeaker("Kavya"), "kavya");
  assert.equal(resolveSarvamSpeaker("ritu"), "ritu");

  // Default female is priya
  assert.equal(resolveSarvamSpeaker(undefined, "female"), "priya");
  assert.equal(resolveSarvamSpeaker(undefined), "priya");

  // Default male is shubh
  assert.equal(resolveSarvamSpeaker(undefined, "male"), "shubh");

  // Unknown speaker falls back safely
  assert.equal(resolveSarvamSpeaker("unknown_voice", "female"), "priya");
  assert.equal(resolveSarvamSpeaker("unknown_voice", "male"), "shubh");
});

test("14. SarvamProvider.tts() Payload: Replaces 'meera' with valid speaker in outbound payload", async () => {
  const secretKey = "test-secret-sarvam-key-99999";
  let capturedPayload: any = null;
  const origFetch = globalThis.fetch;

  try {
    (globalThis as any).fetch = async (_url: string, init: any) => {
      capturedPayload = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          audios: ["bW9jay1hdWRpbw=="],
        }),
      };
    };

    const provider = new SarvamProvider(secretKey, "https://mock.sarvam.ai/tts");

    // Explicitly pass speaker: "meera"
    const result = await provider.tts({
      text: "અમદાવાદમાં આજે તાપમાન ૨૮ ડિગ્રી સેલ્સિયસ છે",
      targetLanguage: "gu",
      speaker: "meera",
    });

    assert.equal(result.success, true);
    assert.ok(capturedPayload, "Outbound API request payload must be sent");
    // CRITICAL: speaker in payload MUST NOT be "meera"
    assert.notEqual(capturedPayload.speaker, "meera");
    assert.equal(capturedPayload.speaker, "priya");
    assert.equal(capturedPayload.model, "bulbul:v3");
    assert.equal(capturedPayload.target_language_code, "gu-IN");
  } finally {
    (globalThis as any).fetch = origFetch;
  }
});
