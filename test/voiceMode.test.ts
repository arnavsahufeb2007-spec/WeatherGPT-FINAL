import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveSTTLanguageCode,
  WebSpeechSTTProvider,
  ElevenLabsSTTProvider,
  HybridSpeechToTextProvider,
  defaultSTTProvider,
} from "../src/services/voice/speechToTextProvider.js";
import {
  resolveTTSLanguageCode,
  findBestVoiceForLanguage,
  WebSpeechTTSProvider,
  selectVoice,
  isVoiceCompatible,
} from "../src/services/voice/textToSpeechProvider.js";
import { formatSpokenWeatherResponse, splitIntoSpeechChunks } from "../src/services/voice/speechFormatter.js";
import { VoiceManager } from "../src/services/voice/voiceManager.js";
import { bhashiniProvider } from "../server/providers/bhashiniProvider.js";
import {
  sarvamProvider,
  SarvamProvider,
  resolveSarvamLanguageCode,
  SARVAM_SUPPORTED_LANGUAGES,
} from "../server/providers/sarvamProvider.js";
import {
  elevenlabsProvider,
  ElevenLabsProvider,
  resolveElevenLabsLanguageCode,
} from "../server/providers/elevenlabsProvider.js";
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

test("21. Speech Formatter: Expands Hindi/Hinglish units into Hindi phonetics and converts numbers to Hindi words", () => {
  const raw = "आज तापमान 28°C है और बारिश की 96% संभावना है। हवा की गति 14 km/h है।";
  const spoken = formatSpokenWeatherResponse(raw, "hi");
  assert.match(spoken, /अट्ठाईस डिग्री सेल्सियस/);
  assert.match(spoken, /छियानवे प्रतिशत/);
  assert.match(spoken, /चौदह किलोमीटर प्रति घंटा/);
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

test("44. Speech Formatter: Hinglish expands units into natural bilingual speech and converts numeric data to Hindi words", () => {
  const hinglishText = "Aaj Delhi me 28°C temperature rahega aur barish ke 96% chances hain.";
  const spoken = formatSpokenWeatherResponse(hinglishText, "hinglish");
  assert.ok(spoken.includes("अट्ठाईस degree Celsius"));
  assert.ok(spoken.includes("छियानवे percent"));
  assert.ok(spoken.includes("Delhi"));
});

test("44b. Speech Formatter: Wind speed 20 km/h enunciation and Indian language numeric conversion", () => {
  // 1. English: Pronounces full kilometer per hour, English numbers intact
  const enInput = "The wind blowing is 20 km/h and temperature is 28°C.";
  const enSpoken = formatSpokenWeatherResponse(enInput, "en");
  assert.match(enSpoken, /20 kilometers per hour/);
  assert.match(enSpoken, /28 degrees Celsius/);
  assert.doesNotMatch(enSpoken, /बीस/);

  // 2. Hindi: Pronounces full kilometer (किलोमीटर प्रति घंटा) and 20 converted to बीस
  const hiInput = "The wind blowing is 20 km/h";
  const hiSpoken = formatSpokenWeatherResponse(hiInput, "hi");
  assert.match(hiSpoken, /बीस किलोमीटर प्रति घंटा/);

  // 3. Hinglish: Pronounces full kilometer (kilometer per hour) and 20 converted to बीस
  const hinglishInput = "The wind blowing is 20 km/h";
  const hinglishSpoken = formatSpokenWeatherResponse(hinglishInput, "hinglish");
  assert.match(hinglishSpoken, /बीस kilometer per hour/);

  // 4. Bengali: Converted into Bengali units while retaining natural-language numeric text (no Hindi number words)
  const bnInput = "বাতাস ২০ km/h বেগে বইছে এবং তাপমাত্রা ২৬°C";
  const bnSpoken = formatSpokenWeatherResponse(bnInput, "bn");
  assert.doesNotMatch(bnSpoken, /बीस/);
  assert.match(bnSpoken, /20\s+কিলোমিটার প্রতি ঘণ্টা/);
  assert.match(bnSpoken, /26\s+ডিগ্রি সেলসিয়াস/);

  // 5. Gujarati: Converted into Gujarati units while retaining natural-language numeric text (no Hindi number words)
  const guInput = "પવન ૨૦ km/h ની ઝડપે ફૂંકાઈ રહ્યો છે અને તાપમાન ૨૮°C છે";
  const guSpoken = formatSpokenWeatherResponse(guInput, "gu");
  assert.doesNotMatch(guSpoken, /बीस/);
  assert.match(guSpoken, /20\s+કિલોમીટર પ્રતિ કલાક/);
  assert.match(guSpoken, /28\s+ડિગ્રી સેલ્સિયસ/);

  // 6. Marathi: Converted into Marathi units while retaining natural-language numeric text (no Hindi number words)
  const mrInput = "वारा 20 km/h वेगाने वाहत आहे आणि तापमान 28°C आहे";
  const mrSpoken = formatSpokenWeatherResponse(mrInput, "mr");
  assert.doesNotMatch(mrSpoken, /बीस/);
  assert.match(mrSpoken, /20\s+किलोमीटर प्रति तास/);
  assert.match(mrSpoken, /28\s+डिग्री सेल्सिअस/);

  // 7. Telugu: Converted into Telugu units while retaining natural-language numeric text (no Hindi number words)
  const teInput = "గాలి 20 km/h వేగంతో వీస్తోంది మరియు ఉష్णోగ్రత 28°C ఉంది";
  const teSpoken = formatSpokenWeatherResponse(teInput, "te");
  assert.doesNotMatch(teSpoken, /बीस/);
  assert.match(teSpoken, /20\s+కిలోమీటర్ల వేగం/);

  // 8. Tamil: Converted into Tamil units while retaining natural-language numeric text (no Hindi number words)
  const taInput = "காற்று 20 km/h வேகத்தில் வீசுகிறது மற்றும் வெப்பநிலை 28°C";
  const taSpoken = formatSpokenWeatherResponse(taInput, "ta");
  assert.doesNotMatch(taSpoken, /बीस/);
  assert.match(taSpoken, /20\s+கிலோமீட்டர் வேகம்/);

  // 9. Punjabi: Converted into Punjabi units while retaining natural-language numeric text (no Hindi number words)
  const paInput = "ਹਵਾ 20 km/h ਦੀ ਰਫ਼ਤਾਰ ਨਾਲ ਚੱਲ ਰਹੀ ਹੈ";
  const paSpoken = formatSpokenWeatherResponse(paInput, "pa");
  assert.doesNotMatch(paSpoken, /बीस/);
  assert.match(paSpoken, /20\s+ਕਿਲੋਮੀਟਰ ਪ੍ਰਤੀ ਘੰਟਾ/);

  // 10. Non-Indian languages (Spanish, German, French) preserve ASCII numbers
  const esInput = "El viento sopla a 20 km/h";
  const esSpoken = formatSpokenWeatherResponse(esInput, "es");
  assert.match(esSpoken, /20 kilómetros por hora/);
  assert.doesNotMatch(esSpoken, /बीस/);
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

class MockSpeechSynthesisUtterance {
  public lang = "";
  public voice: any = null;
  public rate = 1;
  public pitch = 1;
  public volume = 1;
  public onstart: any = null;
  public onend: any = null;
  public onerror: any = null;
  constructor(public text: string) {}
}

test("51. TTS Queue: Sequential multi-chunk playback executes completely without 8s cutoffs", async () => {
  (globalThis as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  const spokenChunks: string[] = [];
  let onStartFired = false;
  let onEndFired = false;

  // Mock synthesis environment
  const mockSynth = {
    speaking: false,
    paused: false,
    speak: (utterance: any) => {
      spokenChunks.push(utterance.text);
      // Simulate browser firing onstart then onend asynchronously
      setTimeout(() => {
        utterance.onstart?.();
        setTimeout(() => {
          utterance.onend?.();
        }, 5);
      }, 5);
    },
    cancel: () => {},
    getVoices: () => [],
  };

  (globalThis as any).window = {
    speechSynthesis: mockSynth,
    SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
  };

  const provider = new WebSpeechTTSProvider();
  const longHindiText =
    "नई दिल्ली में आज का मौसम सुहावना है। तापमान 28 डिग्री सेल्सियस है। हवा में नमी 65 प्रतिशत दर्ज की गई है। हवा की गति 14 किलोमीटर प्रति घंटा है। शाम के समय हल्की बारिश की संभावना है।";

  await provider.speak({
    text: longHindiText,
    language: "hi",
    onStart: () => {
      onStartFired = true;
    },
    onEnd: () => {
      onEndFired = true;
    },
  });

  // Wait for all chunks to finish playback
  await new Promise((resolve) => setTimeout(resolve, 150));

  assert.equal(onStartFired, true);
  assert.equal(onEndFired, true);
  assert.ok(spokenChunks.length >= 2, "Long text was divided into multiple chunks");
  assert.equal(provider.isSpeaking(), false);
});

test("52. TTS Error Handling: language-unavailable or voice-unavailable reports error and does not loop", async () => {
  let errorReported: any = null;
  let speakCallCount = 0;

  const mockSynth = {
    speaking: false,
    paused: false,
    speak: (utterance: any) => {
      speakCallCount++;
      setTimeout(() => {
        utterance.onerror?.({ error: "language-unavailable" });
      }, 5);
    },
    cancel: () => {},
    getVoices: () => [],
  };

  (globalThis as any).window = {
    speechSynthesis: mockSynth,
  };

  const provider = new WebSpeechTTSProvider();
  await provider.speak({
    text: "અમદાવાદમાં આજે ભારે વરસાદની શક્યતા છે. સાવચેત રહેવું.",
    language: "gu",
    onError: (err) => {
      errorReported = err;
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.ok(errorReported, "Error callback was invoked");
  assert.equal(errorReported.code, "voice-unavailable");
  assert.equal(speakCallCount, 1, "Playback halted immediately without re-trying remaining chunks");
  assert.equal(provider.isSpeaking(), false);
});

test("53. TTS Cancellation: Rapid speech triggers cancel previous speech session cleanly", async () => {
  let cancelCount = 0;
  const mockSynth = {
    speaking: false,
    paused: false,
    speak: () => {},
    cancel: () => {
      cancelCount++;
    },
    getVoices: () => [],
  };

  (globalThis as any).window = {
    speechSynthesis: mockSynth,
  };

  const provider = new WebSpeechTTSProvider();
  provider.speak({ text: "Sentence one", language: "en" });
  provider.speak({ text: "Sentence two", language: "hi" });
  provider.stop();

  assert.ok(cancelCount >= 2, "cancel was called on old synthesis sessions");
  assert.equal(provider.isSpeaking(), false);
});

test("54. VoiceManager: speakResponse prioritizes explicitOverrideLang from message language", async () => {
  let spokenLang = "";
  const mockProvider = {
    id: "mock-tts",
    name: "Mock TTS",
    isSupported: () => true,
    isSpeaking: () => false,
    speak: async (options: any) => {
      spokenLang = options.language;
      options.onEnd?.();
    },
    stop: () => {},
    pause: () => {},
    resume: () => {},
    getVoices: async () => [],
  };

  const manager = new VoiceManager(undefined, mockProvider as any);
  // User selected global output language as English
  manager.setOutputLanguage("en");

  // A specific message arrived in Gujarati (gu)
  await manager.speakResponse("અમદાવાદમાં તાપમાન 30 ડિગ્રી છે", "gu", true, "gu");

  // The spoken language MUST be Gujarati (gu), NOT the global English setting
  assert.equal(spokenLang, "gu", "Message language takes precedence for per-message speech playback");
});

test("55. Voice Selection: Never assigns English voice when targeting Indian regional language", () => {
  const mockVoices = [
    { name: "Google US English", lang: "en-US" },
    { name: "Microsoft David - English (United States)", lang: "en-US" },
    { name: "Google UK English Female", lang: "en-GB" },
  ] as SpeechSynthesisVoice[];

  // When searching for Hindi or Gujarati in an English-only voice environment
  const hindiVoice = selectVoice(mockVoices, "hi");
  const gujaratiVoice = selectVoice(mockVoices, "gu");
  const bengaliVoice = selectVoice(mockVoices, "bn");

  // Non-matching voices MUST return null (not an English voice)
  assert.equal(hindiVoice, null, "Hindi must not be assigned an English voice");
  assert.equal(gujaratiVoice, null, "Gujarati must not be assigned an English voice");
  assert.equal(bengaliVoice, null, "Bengali must not be assigned an English voice");
});

test("56. Voice Selection: Matches Hindi voice correctly when installed", () => {
  const mockVoices = [
    { name: "Google US English", lang: "en-US" },
    { name: "Google हिन्दी", lang: "hi-IN" },
  ] as SpeechSynthesisVoice[];

  const hindiVoice = selectVoice(mockVoices, "hi");
  assert.ok(hindiVoice);
  assert.equal(hindiVoice?.lang, "hi-IN");
  assert.equal(isVoiceCompatible(hindiVoice!, "hi"), true);
});

test("57. Auto ASR: Speech recognition rejects auto/empty/ALL mode with clear error rather than English default", () => {
  // 1. resolveSTTLanguageCode returns "" for auto, ALL, or empty
  assert.equal(resolveSTTLanguageCode("auto"), "");
  assert.equal(resolveSTTLanguageCode("ALL"), "");
  assert.equal(resolveSTTLanguageCode(""), "");

  // 2. WebSpeechSTTProvider start() triggers language-unavailable error
  const origWindow = (globalThis as any).window;
  try {
    (globalThis as any).window = {
      SpeechRecognition: class MockSpeechRecognition {
        lang = "";
      },
    };

    const stt = new WebSpeechSTTProvider();
    let capturedError: any = null;

    stt.start({
      language: "auto",
      onResult: () => {},
      onError: (err: any) => {
        capturedError = err;
      },
    });

    assert.ok(capturedError, "Error must be reported when language is auto");
    assert.equal(capturedError.code, "language-unavailable");
    assert.match(capturedError.message, /does not support automatic language detection/i);
  } finally {
    (globalThis as any).window = origWindow;
  }
});

test("58. TTS Fallback: Reports voice-unavailable error rather than silently defaulting to English voice", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;
  const origAudio = (globalThis as any).Audio;

  try {
    const mockVoices = [
      { name: "Google US English", lang: "en-US" },
      { name: "Microsoft David", lang: "en-US" },
    ];

    let speakCalls = 0;
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => mockVoices,
        speak: () => {
          speakCalls++;
        },
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {
      lang = "";
      text = "";
    };
    // Simulate Bhashini unconfigured or failing
    (globalThis as any).fetch = async () => ({
      ok: false,
      status: 503,
      json: async () => ({ success: false }),
    });

    const tts = new WebSpeechTTSProvider();
    let capturedError: any = null;

    await tts.speak({
      text: "અમદાવાદમાં આજે ભારે વરસાદની આગાહી છે",
      language: "gu",
      onError: (err) => {
        capturedError = err;
      },
    });

    assert.ok(capturedError, "Error callback must be called when no Gujarati voice exists");
    assert.equal(capturedError.code, "voice-unavailable");
    assert.match(capturedError.message, /Gujarati/i);
    assert.equal(speakCalls, 0, "Browser synthesis must NOT speak Gujarati using an English voice");
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
    (globalThis as any).Audio = origAudio;
  }
});

test("59. TTS: Compatible browser voice is used directly when available", async () => {
  const origWindow = (globalThis as any).window;

  try {
    const mockVoices = [
      { name: "Google हिन्दी", lang: "hi-IN" },
      { name: "Google US English", lang: "en-US" },
    ];

    let spokenUtterance: any = null;
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => mockVoices,
        speak: (utterance: any) => {
          spokenUtterance = utterance;
          setTimeout(() => utterance.onend?.(), 5);
        },
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {
      lang = "";
      text = "";
      voice = null;
      constructor(text: string) {
        this.text = text;
      }
    };

    const tts = new WebSpeechTTSProvider();
    let completed = false;

    await tts.speak({
      text: "आज दिल्ली में मौसम साफ रहेगा",
      language: "hi",
      onEnd: () => {
        completed = true;
      },
    });

    assert.ok(spokenUtterance, "Utterance must be sent to synthesis");
    assert.equal(spokenUtterance.lang, "hi-IN");
    assert.equal(spokenUtterance.voice?.name, "Google हिन्दी");
  } finally {
    (globalThis as any).window = origWindow;
  }
});

// ========================================================================
// 10. Sarvam Bulbul v3 TTS Fallback Integration Tests (Tests 60 - 70)
// ========================================================================

test("60. Sarvam Language-Code Mapping: All 11 supported languages and BCP-47 tags", () => {
  // 1. Gujarati
  assert.equal(resolveSarvamLanguageCode("gu"), "gu-IN");
  assert.equal(resolveSarvamLanguageCode("gu-IN"), "gu-IN");

  // 2. Bengali
  assert.equal(resolveSarvamLanguageCode("bn"), "bn-IN");
  assert.equal(resolveSarvamLanguageCode("bn-IN"), "bn-IN");

  // 3. Tamil
  assert.equal(resolveSarvamLanguageCode("ta"), "ta-IN");
  assert.equal(resolveSarvamLanguageCode("ta-IN"), "ta-IN");

  // 4. Telugu
  assert.equal(resolveSarvamLanguageCode("te"), "te-IN");
  assert.equal(resolveSarvamLanguageCode("te-IN"), "te-IN");

  // 5. Marathi
  assert.equal(resolveSarvamLanguageCode("mr"), "mr-IN");
  assert.equal(resolveSarvamLanguageCode("mr-IN"), "mr-IN");

  // 6. Kannada
  assert.equal(resolveSarvamLanguageCode("kn"), "kn-IN");
  assert.equal(resolveSarvamLanguageCode("kn-IN"), "kn-IN");

  // 7. Malayalam
  assert.equal(resolveSarvamLanguageCode("ml"), "ml-IN");
  assert.equal(resolveSarvamLanguageCode("ml-IN"), "ml-IN");

  // 8. Punjabi
  assert.equal(resolveSarvamLanguageCode("pa"), "pa-IN");
  assert.equal(resolveSarvamLanguageCode("pa-IN"), "pa-IN");

  // 9. Odia (both od and or codes)
  assert.equal(resolveSarvamLanguageCode("od"), "od-IN");
  assert.equal(resolveSarvamLanguageCode("or"), "od-IN");
  assert.equal(resolveSarvamLanguageCode("od-IN"), "od-IN");
  assert.equal(resolveSarvamLanguageCode("or-IN"), "od-IN");

  // 10. Hindi and Hinglish
  assert.equal(resolveSarvamLanguageCode("hi"), "hi-IN");
  assert.equal(resolveSarvamLanguageCode("hi-IN"), "hi-IN");
  assert.equal(resolveSarvamLanguageCode("hinglish"), "hi-IN");

  // 11. English (Indian accent)
  assert.equal(resolveSarvamLanguageCode("en"), "en-IN");
  assert.equal(resolveSarvamLanguageCode("en-IN"), "en-IN");
  assert.equal(resolveSarvamLanguageCode("en-US"), "en-IN");

  // Non-supported or control modes MUST return null (never sent to Sarvam)
  assert.equal(resolveSarvamLanguageCode("ALL"), null);
  assert.equal(resolveSarvamLanguageCode("all"), null);
  assert.equal(resolveSarvamLanguageCode("auto"), null);
  assert.equal(resolveSarvamLanguageCode(""), null);
  assert.equal(resolveSarvamLanguageCode("fr"), null);
  assert.equal(resolveSarvamLanguageCode("es"), null);
});

test("61. Server-Only API Key Usage: Key is never exposed in status or transmitted to client", async () => {
  // Default singleton without key in test environment
  const unconfiguredProvider = new SarvamProvider("");
  assert.equal(unconfiguredProvider.isAvailable(), false);
  const status = unconfiguredProvider.getStatus();
  assert.equal(status.provider, "sarvam");
  assert.equal(status.model, "bulbul:v3");
  assert.equal(status.configured, false);
  // Ensure no apiKey field exists in status object
  assert.equal((status as any).apiKey, undefined);

  // Configured provider
  const secretKey = "test-secret-sarvam-key-12345";
  let capturedHeaders: any = null;
  const mockEndpoint = "https://mock-sarvam.test/text-to-speech";

  const origFetch = globalThis.fetch;
  try {
    (globalThis as any).fetch = async (url: string, init: any) => {
      capturedHeaders = init.headers;
      return {
        ok: true,
        json: async () => ({
          audios: ["bW9jay1zYXJ2YW0tYXVkaW8="],
        }),
      };
    };

    const providerWithKey = new SarvamProvider(secretKey, mockEndpoint);
    assert.equal(providerWithKey.isAvailable(), true);
    const result = await providerWithKey.tts({
      text: "હવામાન અપડેટ",
      targetLanguage: "gu",
    });

    assert.equal(result.success, true);
    assert.equal(result.provider, "sarvam");
    assert.equal(result.model, "bulbul:v3");
    // Verify secret key was sent in server-side request header
    assert.equal(capturedHeaders["api-subscription-key"], secretKey);
  } finally {
    (globalThis as any).fetch = origFetch;
  }
});

test("62. Gujarati TTS Fallback: Calls Sarvam Bulbul v3 server fallback when no browser voice exists", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;
  const origAudio = (globalThis as any).Audio;

  try {
    // Browser only has English voices
    const mockVoices = [
      { name: "Google US English", lang: "en-US" },
      { name: "Microsoft David", lang: "en-US" },
    ];

    let speakCalls = 0;
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => mockVoices,
        speak: () => {
          speakCalls++;
        },
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {
      lang = "";
      text = "";
    };

    let requestedEndpoint = "";
    let requestPayload: any = null;

    (globalThis as any).fetch = async (url: string, init: any) => {
      requestedEndpoint = url;
      requestPayload = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          audioBase64: "bW9jay1ndWphcmF0aS1hdWRpbw==",
          format: "audio/wav",
          provider: "sarvam",
        }),
      };
    };

    let audioPlayed = false;
    class MockAudio {
      src = "";
      playbackRate = 1.0;
      onplay: any = null;
      onended: any = null;
      onerror: any = null;
      constructor(src: string) {
        this.src = src;
      }
      play() {
        audioPlayed = true;
        this.onplay?.();
        setTimeout(() => this.onended?.(), 5);
        return Promise.resolve();
      }
      pause() {}
    }
    (globalThis as any).Audio = MockAudio;

    const tts = new WebSpeechTTSProvider();
    let speechCompleted = false;

    await tts.speak({
      text: "અમદાવાદમાં તાપમાન ૨૮°C છે અને ભેજ ૭૫% છે.",
      language: "gu",
      onEnd: () => {
        speechCompleted = true;
      },
    });

    await new Promise((r) => setTimeout(r, 20));

    // Assertions
    assert.equal(requestedEndpoint, "/api/voice/sarvam/tts");
    assert.equal(requestPayload.targetLanguage, "gu");
    // Verify Gujarati numbers & units were converted properly without Hindi words
    assert.match(requestPayload.text, /૨૮|28/);
    assert.doesNotMatch(requestPayload.text, /बीस|अट्ठाईस/);
    assert.equal(audioPlayed, true, "Sarvam audio was played via Audio");
    assert.equal(speechCompleted, true, "Playback completed successfully");
    assert.equal(speakCalls, 0, "English browser voice was NOT called");
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
    (globalThis as any).Audio = origAudio;
  }
});

test("63. Bengali TTS Fallback: Calls Sarvam Bulbul v3 and preserves Bengali text without Hindi injection", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;
  const origAudio = (globalThis as any).Audio;

  try {
    // English-only browser voices
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => [{ name: "Google US English", lang: "en-US" }],
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {};

    let capturedPayload: any = null;
    (globalThis as any).fetch = async (url: string, init: any) => {
      capturedPayload = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          audioBase64: "YmVuZ2FsaS1hdWRpbw==",
          format: "audio/wav",
          provider: "sarvam",
        }),
      };
    };

    let audioPlayed = false;
    class MockAudio {
      onplay: any = null;
      onended: any = null;
      play() {
        audioPlayed = true;
        this.onplay?.();
        setTimeout(() => this.onended?.(), 5);
        return Promise.resolve();
      }
      pause() {}
    }
    (globalThis as any).Audio = MockAudio;

    const tts = new WebSpeechTTSProvider();
    await tts.speak({
      text: "কলকাতায় আজ ভারী বৃষ্টির সম্ভাবনা আছে। তাপমাত্রা ২৬°C",
      language: "bn",
    });

    await new Promise((r) => setTimeout(r, 20));

    assert.ok(capturedPayload);
    assert.equal(capturedPayload.targetLanguage, "bn");
    assert.doesNotMatch(capturedPayload.text, /डिग्री|सेल्सियस|बीस/);
    assert.match(capturedPayload.text, /২৬|26/);
    assert.equal(audioPlayed, true);
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
    (globalThis as any).Audio = origAudio;
  }
});

test("64. Tamil TTS Fallback: Calls Sarvam Bulbul v3 and preserves Tamil text and units", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;
  const origAudio = (globalThis as any).Audio;

  try {
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => [{ name: "Google US English", lang: "en-US" }],
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {};

    let capturedPayload: any = null;
    (globalThis as any).fetch = async (url: string, init: any) => {
      capturedPayload = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          audioBase64: "dGFtaWwtYXVkaW8=",
          format: "audio/wav",
          provider: "sarvam",
        }),
      };
    };

    let played = false;
    (globalThis as any).Audio = class {
      onplay: any = null;
      onended: any = null;
      play() {
        played = true;
        this.onplay?.();
        setTimeout(() => this.onended?.(), 5);
        return Promise.resolve();
      }
      pause() {}
    };

    const tts = new WebSpeechTTSProvider();
    await tts.speak({
      text: "சென்னையில் இன்று மிதமான மழை பெய்யக்கூடும். வெப்பநிலை 28°C",
      language: "ta",
    });

    await new Promise((r) => setTimeout(r, 20));

    assert.ok(capturedPayload);
    assert.equal(capturedPayload.targetLanguage, "ta");
    assert.doesNotMatch(capturedPayload.text, /बीस|तापमान/);
    assert.equal(played, true);
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
    (globalThis as any).Audio = origAudio;
  }
});

test("65. Telugu TTS Fallback: Calls Sarvam Bulbul v3 and preserves Telugu text and units", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;
  const origAudio = (globalThis as any).Audio;

  try {
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => [{ name: "Google US English", lang: "en-US" }],
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {};

    let capturedPayload: any = null;
    (globalThis as any).fetch = async (url: string, init: any) => {
      capturedPayload = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          audioBase64: "dGVsdWd1LWF1ZGlv",
          format: "audio/wav",
          provider: "sarvam",
        }),
      };
    };

    let played = false;
    (globalThis as any).Audio = class {
      onplay: any = null;
      onended: any = null;
      play() {
        played = true;
        this.onplay?.();
        setTimeout(() => this.onended?.(), 5);
        return Promise.resolve();
      }
      pause() {}
    };

    const tts = new WebSpeechTTSProvider();
    await tts.speak({
      text: "హైదరాబాద్‌లో నేడు వాతావరణం పొడిగా ఉంటుంది. ఉష్ణోగ్రత 30 డిగ్రీలు.",
      language: "te",
    });

    await new Promise((r) => setTimeout(r, 20));

    assert.ok(capturedPayload);
    assert.equal(capturedPayload.targetLanguage, "te");
    assert.doesNotMatch(capturedPayload.text, /बीस|तापमान/);
    assert.equal(played, true);
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
    (globalThis as any).Audio = origAudio;
  }
});

test("66. Marathi TTS Fallback: Calls Sarvam Bulbul v3 and preserves Marathi text and units", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;
  const origAudio = (globalThis as any).Audio;

  try {
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => [{ name: "Google US English", lang: "en-US" }],
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {};

    let capturedPayload: any = null;
    (globalThis as any).fetch = async (url: string, init: any) => {
      capturedPayload = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          audioBase64: "bWFyYXRoaS1hdWRpbw==",
          format: "audio/wav",
          provider: "sarvam",
        }),
      };
    };

    let played = false;
    (globalThis as any).Audio = class {
      onplay: any = null;
      onended: any = null;
      play() {
        played = true;
        this.onplay?.();
        setTimeout(() => this.onended?.(), 5);
        return Promise.resolve();
      }
      pause() {}
    };

    const tts = new WebSpeechTTSProvider();
    await tts.speak({
      text: "पुण्यात आज हलका पाऊस पडण्याची शक्यता आहे. तापमान 26 अंश सेल्सिअस राहील.",
      language: "mr",
    });

    await new Promise((r) => setTimeout(r, 20));

    assert.ok(capturedPayload);
    assert.equal(capturedPayload.targetLanguage, "mr");
    assert.doesNotMatch(capturedPayload.text, /बीस/);
    assert.equal(played, true);
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
    (globalThis as any).Audio = origAudio;
  }
});

test("66b. Supported Indian Languages (mr-IN, as-IN, bn-IN, gu-IN, etc.): Successfully route to Sarvam Bulbul v3 exactly like Bengali without requiring installed browser voices", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;
  const origAudio = (globalThis as any).Audio;

  try {
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => [{ name: "Google US English", lang: "en-US" }],
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {};

    const payloads: any[] = [];
    (globalThis as any).fetch = async (url: string, init: any) => {
      payloads.push(JSON.parse(init.body));
      return {
        ok: true,
        json: async () => ({
          success: true,
          audioBase64: "c2FydmFtLWF1ZGlv",
          format: "audio/wav",
          provider: "sarvam",
        }),
      };
    };

    let playCount = 0;
    (globalThis as any).Audio = class {
      onplay: any = null;
      onended: any = null;
      play() {
        playCount++;
        this.onplay?.();
        setTimeout(() => this.onended?.(), 2);
        return Promise.resolve();
      }
      pause() {}
    };

    const tts = new WebSpeechTTSProvider();

    // 1. Marathi with mr-IN (previously threw voice-unavailable)
    let mrError: any = null;
    await tts.speak({
      text: "मुंबईत आज ढगाळ वातावरण राहील. तापमान 29°C",
      language: "mr-IN",
      onError: (err) => { mrError = err; },
    });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(mrError, null, "mr-IN must not produce error when Sarvam is available");
    assert.equal(payloads[payloads.length - 1]?.targetLanguage, "mr-IN");

    // 2. Assamese with as-IN
    let asError: any = null;
    await tts.speak({
      text: "গুৱাহাটীত আজি বৰষুণৰ সম্ভাৱনা আছে।",
      language: "as-IN",
      onError: (err) => { asError = err; },
    });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(asError, null, "as-IN must not produce error when Sarvam is available");
    assert.equal(payloads[payloads.length - 1]?.targetLanguage, "bn-IN");

    // 3. Bengali with bn-IN
    let bnError: any = null;
    await tts.speak({
      text: "কলকাতায় আবহাওয়া ভালো।",
      language: "bn-IN",
      onError: (err) => { bnError = err; },
    });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(bnError, null, "bn-IN must not produce error");

    // 4. Gujarati with gu-IN
    let guError: any = null;
    await tts.speak({
      text: "સુરતમાં આજે ગરમી રહેશે.",
      language: "gu-IN",
      onError: (err) => { guError = err; },
    });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(guError, null, "gu-IN must not produce error");

    assert.equal(playCount >= 4, true, "All four languages must have played audio successfully");
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
    (globalThis as any).Audio = origAudio;
  }
});

test("67. No Silent English Fallback: Regional Indian requests reject English voice when Sarvam fails", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;
  const origAudio = (globalThis as any).Audio;

  try {
    // English-only environment
    let speakCalls = 0;
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => [{ name: "Google US English", lang: "en-US" }],
        speak: () => {
          speakCalls++;
        },
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {};

    // Both Sarvam and Bhashini fail
    (globalThis as any).fetch = async () => ({
      ok: false,
      status: 503,
      json: async () => ({ success: false, error: "Server unavailable" }),
    });

    const tts = new WebSpeechTTSProvider();

    // Gujarati request
    let guError: any = null;
    await tts.speak({
      text: "અમદાવાદમાં હવામાન સ્વચ્છ રહેશે",
      language: "gu",
      onError: (e) => {
        guError = e;
      },
    });

    assert.ok(guError);
    assert.equal(guError.code, "voice-unavailable");
    assert.match(guError.message, /Gujarati/i);
    assert.equal(speakCalls, 0, "Must NEVER speak Gujarati using English voice");

    // Tamil request
    let taError: any = null;
    await tts.speak({
      text: "சென்னையில் மழை பெய்யும்",
      language: "ta",
      onError: (e) => {
        taError = e;
      },
    });

    assert.ok(taError);
    assert.equal(taError.code, "voice-unavailable");
    assert.match(taError.message, /Tamil/i);
    assert.equal(speakCalls, 0, "Must NEVER speak Tamil using English voice");
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
    (globalThis as any).Audio = origAudio;
  }
});

test("68. Sarvam Failure → Clear Voice-Unavailable Error: Does not hang or loop", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;

  try {
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => [{ name: "Google US English", lang: "en-US" }],
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {};

    // Network error on fetch
    (globalThis as any).fetch = async () => {
      throw new Error("Network connection lost");
    };

    const tts = new WebSpeechTTSProvider();
    let caughtError: any = null;

    await tts.speak({
      text: "কলকাতায় বৃষ্টি হচ্ছে",
      language: "bn",
      onError: (err) => {
        caughtError = err;
      },
    });

    assert.ok(caughtError);
    assert.equal(caughtError.code, "voice-unavailable");
    assert.match(caughtError.message, /Bengali/i);
    assert.equal(caughtError.fatal, true);
    assert.equal(tts.isSpeaking(), false);
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
  }
});

test("69. Existing English, Hindi & Hinglish Behavior Remains Unchanged", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;

  try {
    let fetchCalled = false;
    (globalThis as any).fetch = async () => {
      fetchCalled = true;
      return { ok: false };
    };

    // Installed voices include both English and Hindi
    const voices = [
      { name: "Google हिन्दी", lang: "hi-IN" },
      { name: "Google US English", lang: "en-US" },
    ];

    let spokenUtterance: any = null;
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => voices,
        speak: (utt: any) => {
          spokenUtterance = utt;
          setTimeout(() => utt.onend?.(), 5);
        },
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {
      lang = "";
      text = "";
      voice = null;
      constructor(text: string) {
        this.text = text;
      }
    };

    const tts = new WebSpeechTTSProvider();

    // 1. English synthesis directly uses browser voice without server fetch
    await tts.speak({
      text: "Current weather in Mumbai is 28°C with clear skies.",
      language: "en",
    });
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(fetchCalled, false, "Browser English voice used directly without calling server");
    assert.equal(spokenUtterance.lang, "en-IN");

    // 2. Hindi synthesis directly uses browser Hindi voice without server fetch
    spokenUtterance = null;
    await tts.speak({
      text: "दिल्ली में आज तापमान 30 डिग्री सेल्सियस है।",
      language: "hi",
    });
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(fetchCalled, false, "Browser Hindi voice used directly without calling server");
    assert.equal(spokenUtterance.voice?.name, "Google हिन्दी");

    // 3. Hinglish speech formatting keeps numbers and pronunciation natural
    const hinglishFormatted = formatSpokenWeatherResponse("Aaj Mumbai mein temperature 28°C hai with 14 km/h wind.", "hinglish");
    assert.match(hinglishFormatted, /अट्ठाईस|28/);
    assert.match(hinglishFormatted, /degree(s)? Celsius/i);
    assert.match(hinglishFormatted, /kilometer per hour/i);
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
  }
});

test("70. ALL/auto Resolution: 'ALL' must never reach Sarvam, ASR, or TTS", async () => {
  // 1. Sarvam provider rejects ALL and auto
  assert.equal(resolveSarvamLanguageCode("ALL"), null);
  assert.equal(resolveSarvamLanguageCode("auto"), null);

  // 2. TTS language resolver falls back to en-IN for ALL or auto
  assert.equal(resolveTTSLanguageCode("ALL"), "en-IN");
  assert.equal(resolveTTSLanguageCode("auto"), "en-IN");

  // 3. STT language resolver returns empty string (preventing automatic STT misfire)
  assert.equal(resolveSTTLanguageCode("ALL"), "");
  assert.equal(resolveSTTLanguageCode("auto"), "");

  // 4. VoiceManager output language resolves ALL to safe fallback
  const manager = new VoiceManager();
  assert.equal(manager.getEffectiveOutputLanguage("ALL"), "en");
  assert.equal(manager.getEffectiveInputLanguage("ALL"), "en");
});

test("71. Sarvam HTTP 200 + audio received: plays audio and preserves audio response", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;
  const origAudio = (globalThis as any).Audio;

  try {
    // Browser has no gu-IN voice
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => [{ name: "Google US English", lang: "en-US" }],
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {};

    let fetchCalled = false;
    let requestPayload: any = null;
    (globalThis as any).fetch = async (url: string, opts: any) => {
      fetchCalled = true;
      requestPayload = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          audioBase64: "UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
          format: "audio/wav",
          language: "gu-IN",
          speaker: "arvind",
        }),
      };
    };

    let audioCreated = false;
    let playCalled = false;
    let audioInstance: any = null;
    (globalThis as any).Audio = class {
      src: string;
      playbackRate = 1.0;
      onplay: any = null;
      onended: any = null;
      onerror: any = null;
      constructor(src: string) {
        this.src = src;
        audioCreated = true;
        audioInstance = this;
      }
      async play() {
        playCalled = true;
        this.onplay?.();
      }
      pause() {}
    };

    const tts = new WebSpeechTTSProvider();
    let started = false;
    let ended = false;
    let caughtError: any = null;

    await tts.speak({
      text: "અમદાવાદમાં આજે તાપમાન ૨૮ ડિગ્રી સેલ્સિયસ છે.",
      language: "gu",
      onStart: () => {
        started = true;
      },
      onEnd: () => {
        ended = true;
      },
      onError: (err) => {
        caughtError = err;
      },
    });

    assert.equal(fetchCalled, true, "Sarvam TTS endpoint must be called");
    assert.equal(requestPayload.targetLanguage, "gu");
    assert.equal(audioCreated, true, "HTML Audio instance created with audioBase64");
    assert.equal(playCalled, true, "audio.play() invoked");
    assert.equal(started, true, "onStart callback invoked");
    assert.equal(caughtError, null, "No error emitted on successful playback");
    assert.equal(tts.isSpeaking(), true, "Provider reports isSpeaking while playing");

    // Complete playback
    audioInstance.onended?.();
    assert.equal(ended, true, "onEnd callback invoked");
    assert.equal(tts.isSpeaking(), false, "Provider resets isSpeaking when ended");
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
    (globalThis as any).Audio = origAudio;
  }
});

test("72. Playback NotAllowedError is handled separately: does not emit voice-unavailable, preserves audio, and prompts user to tap Speak", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;
  const origAudio = (globalThis as any).Audio;

  try {
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => [{ name: "Google US English", lang: "en-US" }],
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {};

    let fetchCount = 0;
    (globalThis as any).fetch = async () => {
      fetchCount++;
      return {
        ok: true,
        json: async () => ({
          success: true,
          audioBase64: "UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
          format: "audio/wav",
          language: "gu-IN",
          speaker: "arvind",
        }),
      };
    };

    let rejectPlayWithNotAllowed = true;
    let playAttempts = 0;

    (globalThis as any).Audio = class {
      src: string;
      playbackRate = 1.0;
      onplay: any = null;
      onended: any = null;
      onerror: any = null;
      constructor(src: string) {
        this.src = src;
      }
      async play() {
        playAttempts++;
        if (rejectPlayWithNotAllowed) {
          const err = new Error("play() failed because the user didn't interact with the document first.");
          err.name = "NotAllowedError";
          throw err;
        }
        this.onplay?.();
      }
      pause() {}
    };

    const tts = new WebSpeechTTSProvider();
    let caughtError: any = null;

    // 1. Initial async request blocked by browser autoplay policy
    await tts.speak({
      text: "અમદાવાદમાં આજે તાપમાન ૨૮ ડિગ્રી સેલ્સિયસ છે.",
      language: "gu",
      onError: (err) => {
        caughtError = err;
      },
    });

    assert.ok(caughtError, "Error callback must be invoked when playback is blocked");
    assert.equal(caughtError.code, "not-allowed", "Error code must be 'not-allowed', NOT 'voice-unavailable'");
    assert.notEqual(caughtError.code, "voice-unavailable", "Must NEVER treat NotAllowedError as 'voice-unavailable'");
    assert.match(caughtError.message, /Tap Speak to play audio/i, "Message must guide user to tap Speak");
    assert.equal(caughtError.fatal, false, "NotAllowedError is non-fatal; audio payload is intact");
    assert.equal(fetchCount, 1);
    assert.equal(playAttempts, 1);

    // 2. User taps Speak or Listen (user-gesture unlocked)
    // Preserved audio payload plays without re-fetching!
    rejectPlayWithNotAllowed = false;
    let retryStarted = false;
    caughtError = null;

    await tts.speak({
      text: "અમદાવાદમાં આજે તાપમાન ૨૮ ડિગ્રી સેલ્સિયસ છે.",
      language: "gu",
      onStart: () => {
        retryStarted = true;
      },
      onError: (err) => {
        caughtError = err;
      },
    });

    assert.equal(fetchCount, 1, "Must replay preserved audio payload without making a duplicate network request");
    assert.equal(playAttempts, 2, "Second playback attempt executed");
    assert.equal(retryStarted, true, "Audio started playing on user tap");
    assert.equal(caughtError, null, "No error on successful user-gesture replay");
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
    (globalThis as any).Audio = origAudio;
  }
});

test("73. Successful Sarvam audio is not converted into voice-unavailable error on playback exceptions", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;
  const origAudio = (globalThis as any).Audio;

  try {
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => [{ name: "Google US English", lang: "en-US" }],
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {};

    (globalThis as any).fetch = async () => ({
      ok: true,
      json: async () => ({
        success: true,
        audioBase64: "UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
        format: "audio/wav",
      }),
    });

    // Audio element triggers onerror (e.g. decoding issue)
    (globalThis as any).Audio = class {
      src: string;
      playbackRate = 1.0;
      onplay: any = null;
      onended: any = null;
      onerror: any = null;
      constructor(src: string) {
        this.src = src;
      }
      async play() {
        this.onerror?.();
      }
      pause() {}
    };

    const tts = new WebSpeechTTSProvider();
    let caughtError: any = null;

    await tts.speak({
      text: "હવામાન સરસ છે.",
      language: "gu",
      onError: (err) => {
        caughtError = err;
      },
    });

    assert.ok(caughtError);
    assert.equal(caughtError.code, "synthesis-failed");
    assert.notEqual(caughtError.code, "voice-unavailable", "Playback decoding error must never claim voice is unavailable");
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
    (globalThis as any).Audio = origAudio;
  }
});

test("74. Regional-language voice-unavailable is shown only when TTS providers actually fail", async () => {
  const origWindow = (globalThis as any).window;
  const origFetch = (globalThis as any).fetch;

  try {
    (globalThis as any).window = {
      speechSynthesis: {
        getVoices: () => [{ name: "Google US English", lang: "en-US" }],
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = class {};

    // Both Sarvam and Bhashini fail on server side (HTTP 500 / unconfigured)
    (globalThis as any).fetch = async () => ({
      ok: false,
      status: 500,
    });

    const tts = new WebSpeechTTSProvider();
    let caughtError: any = null;

    await tts.speak({
      text: "અમદાવાદમાં આજે તાપમાન ૨૮ ડિગ્રી સેલ્સિયસ છે.",
      language: "gu",
      onError: (err) => {
        caughtError = err;
      },
    });

    assert.ok(caughtError);
    assert.equal(caughtError.code, "voice-unavailable");
    assert.match(caughtError.message, /Gujarati/i);
    assert.match(caughtError.message, /gu-IN/i);
    assert.equal(caughtError.fatal, true);
  } finally {
    (globalThis as any).window = origWindow;
    (globalThis as any).fetch = origFetch;
  }
});

// ========================================================================
// 10. ElevenLabs Voice Recognition (STT) & Speech Synthesis (TTS) Tests
// ========================================================================

test("75. ElevenLabs: Language code resolution maps Indian and international dialects correctly", () => {
  assert.equal(resolveElevenLabsLanguageCode("en"), "en");
  assert.equal(resolveElevenLabsLanguageCode("hi"), "hi");
  assert.equal(resolveElevenLabsLanguageCode("gu"), "gu");
  assert.equal(resolveElevenLabsLanguageCode("bn"), "bn");
  assert.equal(resolveElevenLabsLanguageCode("ta"), "ta");
  assert.equal(resolveElevenLabsLanguageCode("te"), "te");
  assert.equal(resolveElevenLabsLanguageCode("mr"), "mr");
  assert.equal(resolveElevenLabsLanguageCode("kn"), "kn");
  assert.equal(resolveElevenLabsLanguageCode("ml"), "ml");
  assert.equal(resolveElevenLabsLanguageCode("pa"), "pa");
  assert.equal(resolveElevenLabsLanguageCode("es"), "es");
  assert.equal(resolveElevenLabsLanguageCode("fr"), "fr");
  assert.equal(resolveElevenLabsLanguageCode("hinglish"), "hi");
  // Auto or ALL must return undefined for automatic language detection
  assert.equal(resolveElevenLabsLanguageCode("auto"), undefined);
  assert.equal(resolveElevenLabsLanguageCode("ALL"), undefined);
  assert.equal(resolveElevenLabsLanguageCode(""), undefined);
});

test("76. ElevenLabs: Provider status accurately reports configuration and availability", () => {
  const unconfigured = new ElevenLabsProvider({ apiKey: "" });
  assert.equal(unconfigured.isAvailable(), false);
  const statusUnconf = unconfigured.getStatus();
  assert.equal(statusUnconf.configured, false);
  assert.equal(statusUnconf.sttModel, "scribe_v2");
  assert.equal(statusUnconf.ttsModel, "eleven_multilingual_v2");

  const configured = new ElevenLabsProvider({ apiKey: "test-xi-api-key-12345" });
  assert.equal(configured.isAvailable(), true);
  const statusConf = configured.getStatus();
  assert.equal(statusConf.configured, true);
  assert.equal(statusConf.provider, "elevenlabs");
});

test("77. ElevenLabs: Fails gracefully with specific error code when unconfigured", async () => {
  const provider = new ElevenLabsProvider({ apiKey: "" });
  const sttRes = await provider.transcribe({
    audioBuffer: Buffer.from("dummy-audio-bytes"),
    mimeType: "audio/webm",
  });
  assert.equal(sttRes.success, false);
  assert.equal(sttRes.code, "elevenlabs-not-configured");

  const ttsRes = await provider.tts({
    text: "Testing speech synthesis",
  });
  assert.equal(ttsRes.success, false);
  assert.equal(ttsRes.code, "elevenlabs-not-configured");
});

test("78. ElevenLabs: Scribe v2 STT sends multipart audio payload and returns transcript", async () => {
  const origFetch = (globalThis as any).fetch;

  try {
    let capturedHeaders: any = null;
    let capturedUrl = "";

    (globalThis as any).fetch = async (url: string, init: any) => {
      capturedUrl = url;
      capturedHeaders = init.headers;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          text: "What is the weather in Ahmedabad today?",
          language_code: "en",
          language_probability: 0.98,
        }),
      };
    };

    const provider = new ElevenLabsProvider({ apiKey: "test-xi-key" });
    const result = await provider.transcribe({
      audioBuffer: Buffer.from("mock-audio-data"),
      mimeType: "audio/webm",
      languageCode: "en",
    });

    assert.ok(result.success);
    assert.equal(result.transcript, "What is the weather in Ahmedabad today?");
    assert.equal(result.language, "en");
    assert.equal(capturedUrl, "https://api.elevenlabs.io/v1/speech-to-text");
    assert.equal(capturedHeaders["xi-api-key"], "test-xi-key");
  } finally {
    (globalThis as any).fetch = origFetch;
  }
});

test("79. ElevenLabs: Multilingual v2 TTS produces base64 audio and metadata", async () => {
  const origFetch = (globalThis as any).fetch;

  try {
    let capturedHeaders: any = null;
    let capturedBody: any = null;
    let capturedUrl = "";

    (globalThis as any).fetch = async (url: string, init: any) => {
      capturedUrl = url;
      capturedHeaders = init.headers;
      capturedBody = JSON.parse(init.body);
      const mockAudio = Buffer.from("ID3-MOCK-MP3-AUDIO-STREAM");
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => mockAudio.buffer.slice(mockAudio.byteOffset, mockAudio.byteOffset + mockAudio.byteLength),
      };
    };

    const provider = new ElevenLabsProvider({ apiKey: "test-xi-key" });
    const result = await provider.tts({
      text: "Today in Gandhinagar, the temperature is 28 degrees Celsius.",
      targetLanguage: "gu",
    });

    assert.ok(result.success);
    assert.ok(result.audioBase64);
    assert.equal(result.format, "audio/mpeg");
    assert.equal(result.provider, "elevenlabs");
    assert.match(capturedUrl, /api\.elevenlabs\.io\/v1\/text-to-speech/);
    assert.equal(capturedHeaders["xi-api-key"], "test-xi-key");
    assert.equal(capturedBody.model_id, "eleven_multilingual_v2");
    assert.equal(capturedBody.language_code, "gu");
  } finally {
    (globalThis as any).fetch = origFetch;
  }
});

test("80. ElevenLabs: Client STT classes and hybrid provider interface contracts", () => {
  const elevenSTT = new ElevenLabsSTTProvider();
  assert.equal(elevenSTT.id, "elevenlabs-stt");
  assert.equal(elevenSTT.name, "ElevenLabs Scribe v2 STT");
  assert.equal(typeof elevenSTT.isSupported, "function");
  assert.equal(typeof elevenSTT.start, "function");
  assert.equal(typeof elevenSTT.stop, "function");
  assert.equal(typeof elevenSTT.abort, "function");

  const hybridSTT = new HybridSpeechToTextProvider();
  assert.equal(hybridSTT.id, "hybrid-stt");
  assert.equal(typeof hybridSTT.checkElevenLabsAvailability, "function");
  assert.equal(typeof defaultSTTProvider.start, "function");
});




