import test from "node:test";
import assert from "node:assert/strict";
import { resolveSTTLanguageCode } from "../src/services/voice/speechToTextProvider.js";
import { resolveTTSLanguageCode, findBestVoiceForLanguage } from "../src/services/voice/textToSpeechProvider.js";
import { formatSpokenWeatherResponse, splitIntoSpeechChunks } from "../src/services/voice/speechFormatter.js";
import { VoiceManager } from "../src/services/voice/voiceManager.js";
import { bhashiniProvider } from "../server/providers/bhashiniProvider.js";
import { ALL_LANGUAGES, INDIAN_LANGUAGES, getLanguageConfig } from "../src/languages.js";

// ========================================================================
// 1. Multilingual STT & TTS Language Resolution Tests (16+ languages)
// ========================================================================

test("1. STT: English resolves to en-IN / en-US tag", () => {
  const code = resolveSTTLanguageCode("en");
  assert.equal(code, "en-IN");
});

test("2. STT: Hindi resolves to hi-IN", () => {
  const code = resolveSTTLanguageCode("hi");
  assert.equal(code, "hi-IN");
});

test("3. STT: Hinglish resolves to hi-IN for optimal Indian phonetic capture", () => {
  const code = resolveSTTLanguageCode("hinglish");
  assert.equal(code, "hi-IN");
});

test("4. STT: Bengali resolves to bn-IN", () => {
  const code = resolveSTTLanguageCode("bn");
  assert.equal(code, "bn-IN");
});

test("5. STT: Telugu resolves to te-IN", () => {
  const code = resolveSTTLanguageCode("te");
  assert.equal(code, "te-IN");
});

test("6. STT: Marathi resolves to mr-IN", () => {
  const code = resolveSTTLanguageCode("mr");
  assert.equal(code, "mr-IN");
});

test("7. STT: Tamil resolves to ta-IN", () => {
  const code = resolveSTTLanguageCode("ta");
  assert.equal(code, "ta-IN");
});

test("8. STT: Gujarati resolves to gu-IN", () => {
  const code = resolveSTTLanguageCode("gu");
  assert.equal(code, "gu-IN");
});

test("9. STT: Kannada resolves to kn-IN", () => {
  const code = resolveSTTLanguageCode("kn");
  assert.equal(code, "kn-IN");
});

test("10. STT: Malayalam resolves to ml-IN", () => {
  const code = resolveSTTLanguageCode("ml");
  assert.equal(code, "ml-IN");
});

test("11. STT: Punjabi resolves to pa-IN", () => {
  const code = resolveSTTLanguageCode("pa");
  assert.equal(code, "pa-IN");
});

test("12. STT: Assamese, Odia, Urdu, Nepali, Sindhi resolve to valid locales", () => {
  assert.equal(resolveSTTLanguageCode("as"), "as-IN");
  assert.equal(resolveSTTLanguageCode("or"), "or-IN");
  assert.equal(resolveSTTLanguageCode("ur"), "ur-IN");
  assert.equal(resolveSTTLanguageCode("ne"), "ne-NP");
  assert.equal(resolveSTTLanguageCode("sd"), "sd-IN");
});

test("13. STT: International languages (Spanish, French, German, Japanese) resolve correctly", () => {
  assert.equal(resolveSTTLanguageCode("es"), "es-ES");
  assert.equal(resolveSTTLanguageCode("fr"), "fr-FR");
  assert.equal(resolveSTTLanguageCode("de"), "de-DE");
  assert.equal(resolveSTTLanguageCode("ja"), "ja-JP");
});

test("14. TTS: Language resolution maps Hinglish to Hindi phonetics", () => {
  assert.equal(resolveTTSLanguageCode("hinglish"), "hi-IN");
});

test("15. TTS: Language resolution preserves BCP-47 for Indian languages", () => {
  assert.equal(resolveTTSLanguageCode("hi"), "hi-IN");
  assert.equal(resolveTTSLanguageCode("bn"), "bn-IN");
  assert.equal(resolveTTSLanguageCode("ta"), "ta-IN");
  assert.equal(resolveTTSLanguageCode("te"), "te-IN");
});

// ========================================================================
// 2. Spoken Speech Formatter Tests (Markdown, Units, Emojis, Numbers)
// ========================================================================

test("16. Speech Formatter: Strips Markdown headers and bold markers", () => {
  const raw = "### Current Conditions\nToday in **New Delhi**, it is **28°C**.";
  const spoken = formatSpokenWeatherResponse(raw, "en");
  assert.doesNotMatch(spoken, /###/);
  assert.doesNotMatch(spoken, /\*\*/);
  assert.match(spoken, /Today in New Delhi, it is 28 degrees Celsius\./);
});

test("17. Speech Formatter: Strips bullet points and numbered lists", () => {
  const raw = "Forecast points:\n- Morning rain\n- Afternoon clearance\n• Evening breeze";
  const spoken = formatSpokenWeatherResponse(raw, "en");
  assert.doesNotMatch(spoken, /[-•]/);
  assert.match(spoken, /Morning rain/);
  assert.match(spoken, /Evening breeze/);
});

test("18. Speech Formatter: Strips markdown tables cleanly", () => {
  const raw = "| Time | Temp | Rain |\n| 12:00 | 28°C | 96% |\nAfternoon will be wet.";
  const spoken = formatSpokenWeatherResponse(raw, "en");
  assert.doesNotMatch(spoken, /\|/);
  assert.match(spoken, /Afternoon will be wet\./);
});

test("19. Speech Formatter: Strips non-vocal emojis that cause synthesizer stuttering", () => {
  const raw = "🌧️ Heavy Rain Alert! 🌡️ Temp is 28°C. ⚠️ Wind gusts at 45 km/h. ☀️ Sunset at 18:30.";
  const spoken = formatSpokenWeatherResponse(raw, "en");
  assert.doesNotMatch(spoken, /[🌧️🌡️⚠️☀️]/);
  assert.match(spoken, /Heavy Rain Alert!/);
  assert.match(spoken, /28 degrees Celsius/);
  assert.match(spoken, /45 kilometers per hour/);
});

test("20. Speech Formatter: Expands metric units in English (°C, km/h, %, mm)", () => {
  const raw = "Temperature is 31°C with 96% rain chance and 14 km/h wind. Rainfall total 5.2 mm.";
  const spoken = formatSpokenWeatherResponse(raw, "en");
  assert.match(spoken, /31 degrees Celsius/);
  assert.match(spoken, /96 percent/);
  assert.match(spoken, /14 kilometers per hour/);
  assert.match(spoken, /5\.2 millimeters/);
});

test("21. Speech Formatter: Expands Hindi/Hinglish units into Hindi phonetics", () => {
  const raw = "आज तापमान 28°C है और बारिश की 96% संभावना है। हवा की गति 14 km/h है।";
  const spoken = formatSpokenWeatherResponse(raw, "hi");
  assert.match(spoken, /28 डिग्री सेल्सियस/);
  assert.match(spoken, /96 प्रतिशत/);
  assert.match(spoken, /14 किलोमीटर प्रति घंटा/);
});

test("22. Speech Formatter: Strips code blocks and raw JSON metadata", () => {
  const raw = "Weather summary.\n```json\n{\"temp\": 28, \"code\": 63}\n```\nDrive safely.";
  const spoken = formatSpokenWeatherResponse(raw, "en");
  assert.doesNotMatch(spoken, /json/);
  assert.doesNotMatch(spoken, /\{.*\}/);
  assert.match(spoken, /Weather summary\.\s+Drive safely\./);
});

test("23. Speech Formatter: Converts markdown links to plain spoken text", () => {
  const raw = "Check [Open-Meteo](https://open-meteo.com) for details.";
  const spoken = formatSpokenWeatherResponse(raw, "en");
  assert.equal(spoken, "Check Open-Meteo for details.");
});

test("24. Speech Formatter: Preserves exact precipitation probabilities (96% never 100%)", () => {
  const raw = "Verified precipitation probability is 96% with moderate rain.";
  const spoken = formatSpokenWeatherResponse(raw, "en");
  assert.match(spoken, /96 percent/);
  assert.doesNotMatch(spoken, /100 percent/);
});

test("25. Speech Formatter: Preserves exact 0% probability faithfully", () => {
  const raw = "Precipitation probability is 0% under clear skies.";
  const spoken = formatSpokenWeatherResponse(raw, "en");
  assert.match(spoken, /0 percent/);
});

// ========================================================================
// 3. Sentence Chunking Tests for Speech Synthesis
// ========================================================================

test("26. Sentence Chunking: Splits long paragraphs into sub-180 character chunks", () => {
  const longParagraph =
    "Today in New Delhi, moderate rain is expected throughout the afternoon with verified precipitation probability at 96 percent. Temperatures will peak around 28 degrees Celsius with high humidity of 78 percent. Wind gusts may reach 22 kilometers per hour so carry an umbrella.";
  const chunks = splitIntoSpeechChunks(longParagraph, 160);
  assert.ok(chunks.length >= 2, "Long paragraph should be split into multiple chunks");
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 180, `Chunk length (${chunk.length}) exceeds 180 chars`);
  }
});

test("27. Sentence Chunking: Returns single chunk when text is short", () => {
  const shortText = "Clear skies and 24 degrees Celsius.";
  const chunks = splitIntoSpeechChunks(shortText, 160);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0], shortText);
});

test("28. Sentence Chunking: Handles empty or whitespace text gracefully", () => {
  assert.deepEqual(splitIntoSpeechChunks("", 160), []);
  assert.deepEqual(splitIntoSpeechChunks("   ", 160), []);
});

// ========================================================================
// 4. Voice Matching & Fallback Logic
// ========================================================================

test("29. Voice Selection: Finds exact BCP-47 match when available", () => {
  const mockVoices = [
    { name: "Google US English", lang: "en-US", localService: false, default: true },
    { name: "Google हिन्दी", lang: "hi-IN", localService: false, default: false },
    { name: "Google বাংলা", lang: "bn-IN", localService: false, default: false },
  ] as any[];

  const hindiVoice = findBestVoiceForLanguage(mockVoices, "hi");
  assert.equal(hindiVoice?.name, "Google हिन्दी");

  const bengaliVoice = findBestVoiceForLanguage(mockVoices, "bn");
  assert.equal(bengaliVoice?.name, "Google বাংলা");
});

test("30. Voice Selection: Matches primary language tag prefix when regional dialect is missing", () => {
  const mockVoices = [
    { name: "Tamil Generic", lang: "ta", localService: false, default: false },
    { name: "Default Voice", lang: "en-US", localService: false, default: true },
  ] as any[];

  const voice = findBestVoiceForLanguage(mockVoices, "ta");
  assert.equal(voice?.name, "Tamil Generic");
});

test("31. Voice Selection: Hinglish matches Hindi voice or Indian English voice", () => {
  const mockVoices = [
    { name: "Google हिन्दी", lang: "hi-IN", localService: false, default: false },
    { name: "English India", lang: "en-IN", localService: false, default: false },
  ] as any[];

  const voice = findBestVoiceForLanguage(mockVoices, "hinglish");
  assert.ok(voice?.lang === "hi-IN" || voice?.lang === "en-IN");
});

test("32. Voice Selection: Gracefully falls back to default voice when language voice missing", () => {
  const mockVoices = [
    { name: "Default English", lang: "en-US", localService: true, default: true },
  ] as any[];

  const voice = findBestVoiceForLanguage(mockVoices, "kn"); // Kannada not in list
  assert.equal(voice?.name, "Default English");
});

test("33. Voice Selection: Handles empty voice array gracefully without throwing", () => {
  const voice = findBestVoiceForLanguage([], "hi");
  assert.equal(voice, null);
});

// ========================================================================
// 5. Voice Manager State & Interruption Management
// ========================================================================

test("34. Voice Manager: Initializes in idle state", () => {
  const manager = new VoiceManager();
  assert.equal(manager.getState(), "idle");
});

test("35. Voice Manager: Settings default autoSpeak to true", () => {
  const manager = new VoiceManager();
  const settings = manager.getSettings();
  assert.equal(settings.autoSpeak, true);
  assert.equal(settings.speechRate, 1.0);
});

test("36. Voice Manager: Updating settings persists properly", () => {
  const manager = new VoiceManager();
  manager.saveSettings({ autoSpeak: false, speechRate: 1.1 });
  assert.equal(manager.getSettings().autoSpeak, false);
  assert.equal(manager.getSettings().speechRate, 1.1);
});

test("37. Voice Manager: Stop speaking resets state from speaking to idle", () => {
  const manager = new VoiceManager();
  manager.stopSpeaking();
  assert.equal(manager.getState(), "idle");
});

// ========================================================================
// 6. Bhashini Integration & Security Tests
// ========================================================================

test("38. Bhashini Provider: getStatus() never exposes secret API keys or auth tokens", () => {
  const status = bhashiniProvider.getStatus();
  assert.equal(typeof status.enabled, "boolean");
  assert.equal(typeof status.configured, "boolean");
  assert.equal(status.provider, "bhashini");
  // Check no secret properties leaked
  const statusKeys = Object.keys(status);
  assert.ok(!statusKeys.includes("apiKey"));
  assert.ok(!statusKeys.includes("inferenceApiKey"));
  assert.ok(!statusKeys.includes("userId"));
});

test("39. Bhashini Provider: Normalizes Unicode Indian text with NFC normalization", () => {
  const decomposed = "हिन्दी\u093C"; // text with combining diacritics
  const normalized = bhashiniProvider.normalizeInput(decomposed);
  assert.equal(typeof normalized, "string");
  assert.equal(normalized, decomposed.normalize("NFC").trim());
});

test("40. Bhashini Provider: Handles unconfigured ASR gracefully without uncaught rejection", async () => {
  const asrResult = await bhashiniProvider.asr({
    audioBase64: "dummy_base64",
    sourceLanguage: "hi",
  });
  // Since Bhashini is not configured in local environment, it must fall back gracefully
  assert.equal(asrResult.success, false);
  assert.ok(asrResult.provider === "fallback" || asrResult.provider === "bhashini");
  assert.ok(typeof asrResult.error === "string");
});

test("41. Bhashini Provider: Handles unconfigured TTS gracefully without uncaught rejection", async () => {
  const ttsResult = await bhashiniProvider.tts({
    text: "आज दिल्ली में बारिश की 96% संभावना है।",
    sourceLanguage: "hi",
  });
  assert.equal(ttsResult.success, false);
  assert.equal(ttsResult.provider, "native_browser");
});

test("42. STT & TTS: Complete coverage for all 15 specified Indian languages + Hinglish", () => {
  const targetLanguages = [
    "hi", "hinglish", "bn", "te", "mr", "ta", "gu", "kn", "ml", "pa", "as", "or", "ur", "ne", "sd"
  ];

  targetLanguages.forEach((lang) => {
    const sttCode = resolveSTTLanguageCode(lang);
    const ttsCode = resolveTTSLanguageCode(lang);
    assert.ok(sttCode && sttCode.length >= 2, `STT code should exist for ${lang}`);
    assert.ok(ttsCode && ttsCode.length >= 2, `TTS code should exist for ${lang}`);
  });
});

test("43. Speech Formatter: Multilingual unit enunciation for Bengali, Telugu, Tamil, Marathi, Punjabi, Gujarati", () => {
  const testSample = "28°C and 96% rain with 14 km/h winds";

  const bn = formatSpokenWeatherResponse(testSample, "bn");
  assert.ok(bn.includes("ডিগ্রি সেলসিয়াস"));
  assert.ok(bn.includes("শতাংশ"));

  const te = formatSpokenWeatherResponse(testSample, "te");
  assert.ok(te.includes("డిగ్రీల సెల్సియస్"));
  assert.ok(te.includes("శాతం"));

  const ta = formatSpokenWeatherResponse(testSample, "ta");
  assert.ok(ta.includes("டிகிரி செல்சியஸ்"));
  assert.ok(ta.includes("சதவீதம்"));

  const mr = formatSpokenWeatherResponse(testSample, "mr");
  assert.ok(mr.includes("डिग्री सेल्सिअस"));
  assert.ok(mr.includes("टक्के"));

  const gu = formatSpokenWeatherResponse(testSample, "gu");
  assert.ok(gu.includes("ડિગ્રી સેલ્સિયસ"));
  assert.ok(gu.includes("ટકા"));

  const pa = formatSpokenWeatherResponse(testSample, "pa");
  assert.ok(pa.includes("ਡਿਗਰੀ ਸੈਲਸੀਅਸ"));
  assert.ok(pa.includes("ਪ੍ਰਤੀਸ਼ਤ"));
});

test("44. Speech Formatter: Hinglish expands units into natural bilingual speech", () => {
  const hinglishText = "Aaj Delhi me 28°C temperature rahega aur barish ke 96% chances hain.";
  const spoken = formatSpokenWeatherResponse(hinglishText, "hinglish");
  assert.ok(spoken.includes("28 degree Celsius"));
  assert.ok(spoken.includes("96 percent"));
  assert.ok(spoken.includes("Delhi"));
});

test("45. Dual Voice Languages: Default settings initialize with auto for input and output", () => {
  const manager = new VoiceManager();
  const settings = manager.getSettings();
  assert.equal(settings.inputLanguage, "auto");
  assert.equal(settings.outputLanguage, "auto");
  assert.equal(manager.getEffectiveInputLanguage("hi"), "hi");
  assert.equal(manager.getEffectiveOutputLanguage("ta"), "ta");
});

test("46. Dual Voice Languages: Decoupling input language independently from app language", () => {
  const manager = new VoiceManager();
  manager.setInputLanguage("te"); // Telugu input
  assert.equal(manager.getSettings().inputLanguage, "te");
  // When app language is English, effective input language is Telugu
  assert.equal(manager.getEffectiveInputLanguage("en"), "te");
  // Output language remains unchanged (auto fallback to app language)
  assert.equal(manager.getEffectiveOutputLanguage("en"), "en");
});

test("47. Dual Voice Languages: Decoupling output language independently from app language", () => {
  const manager = new VoiceManager();
  manager.setOutputLanguage("bn"); // Bengali output
  assert.equal(manager.getSettings().outputLanguage, "bn");
  // When app language is English, effective output language is Bengali
  assert.equal(manager.getEffectiveOutputLanguage("en"), "bn");
  // Input language remains unchanged (auto fallback to app language)
  assert.equal(manager.getEffectiveInputLanguage("en"), "en");
});

test("48. Dual Voice Languages: Asymmetrical pairing (e.g. Hindi input with English output)", () => {
  const manager = new VoiceManager();
  manager.setInputLanguage("hi");
  manager.setOutputLanguage("en");

  assert.equal(manager.getEffectiveInputLanguage("es"), "hi");
  assert.equal(manager.getEffectiveOutputLanguage("es"), "en");
});

test("49. Dual Voice Languages: Settings subscribers receive notifications upon language update", () => {
  const manager = new VoiceManager();
  let receivedInputLang = "";
  const unsub = manager.subscribeSettings((s) => {
    receivedInputLang = s.inputLanguage;
  });

  manager.setInputLanguage("mr");
  assert.equal(receivedInputLang, "mr");
  unsub();
});

test("50. Dual Voice Languages: Resetting returns input and output to auto", () => {
  const manager = new VoiceManager();
  manager.setInputLanguage("gu");
  manager.setOutputLanguage("pa");
  assert.equal(manager.getSettings().inputLanguage, "gu");
  assert.equal(manager.getSettings().outputLanguage, "pa");

  manager.saveSettings({ inputLanguage: "auto", outputLanguage: "auto" });
  assert.equal(manager.getSettings().inputLanguage, "auto");
  assert.equal(manager.getSettings().outputLanguage, "auto");
  assert.equal(manager.getEffectiveInputLanguage("kn"), "kn");
  assert.equal(manager.getEffectiveOutputLanguage("ml"), "ml");
});


