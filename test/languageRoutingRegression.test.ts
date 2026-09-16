import test from "node:test";
import assert from "node:assert/strict";
import { resolveQueryLanguage, parseQuery } from "../server/services/nluService.js";
import { formatSpokenWeatherResponse } from "../src/services/voice/speechFormatter.js";
import { detectScriptLanguage } from "../src/components/WeatherChat.js";
import { getLanguageConfig } from "../src/languages.js";

// ============================================================================
// 1. Explicit output-language preference is authoritative
// ============================================================================
test("Step 11A.1: Explicit output language is authoritative and overrides query script/keywords", () => {
  // User selected English; query contains Gujarati script -> output language must remain English
  const resGuQueryEnPref = resolveQueryLanguage("આજે અમદાવાદમાં હવામાન કેવું છે?", "en");
  assert.equal(resGuQueryEnPref.language, "en");
  assert.equal(resGuQueryEnPref.source, "preferred_language");

  // User selected Gujarati; query is in English -> output language must remain Gujarati
  const resEnQueryGuPref = resolveQueryLanguage("What is the weather in Ahmedabad today?", "gu");
  assert.equal(resEnQueryGuPref.language, "gu");
  assert.equal(resEnQueryGuPref.source, "preferred_language");

  // User selected Tamil; query is Hinglish -> output language must remain Tamil
  const resHinglishQueryTaPref = resolveQueryLanguage("aaj ka mausam kaisa hai", "ta");
  assert.equal(resHinglishQueryTaPref.language, "ta");
  assert.equal(resHinglishQueryTaPref.source, "preferred_language");

  // User selected Telugu; query is Hindi Devanagari -> output language must remain Telugu
  const resHiQueryTePref = resolveQueryLanguage("आज का मौसम कैसा रहेगा?", "te");
  assert.equal(resHiQueryTePref.language, "te");
  assert.equal(resHiQueryTePref.source, "preferred_language");

  // User selected Bengali; query is English -> output language must remain Bengali
  const resEnQueryBnPref = resolveQueryLanguage("Is it going to rain tomorrow?", "bn");
  assert.equal(resEnQueryBnPref.language, "bn");
  assert.equal(resEnQueryBnPref.source, "preferred_language");

  // parseQuery propagates explicit language authority
  const parsedExplicit = parseQuery("આજે હવામાન કેવું છે?", undefined, "en");
  assert.equal(parsedExplicit.language, "en");
});

// ============================================================================
// 2. Auto language mode uses query-script and keyword detection
// ============================================================================
test("Step 11A.2: Auto mode uses script and keyword detection accurately", () => {
  // Auto mode with Gujarati script
  const resGuAuto = resolveQueryLanguage("આજે સુરતમાં વરસાદ પડશે?", "auto");
  assert.equal(resGuAuto.language, "gu");
  assert.equal(resGuAuto.source, "script_detected");

  // Auto mode with Bengali script
  const resBnAuto = resolveQueryLanguage("আজ কলকাতায় আবহাওয়া কেমন?", "auto");
  assert.equal(resBnAuto.language, "bn");
  assert.equal(resBnAuto.source, "script_detected");

  // Auto mode with Tamil script
  const resTaAuto = resolveQueryLanguage("சென்னையில் இன்று மழை பெய்யுமா?", "auto");
  assert.equal(resTaAuto.language, "ta");
  assert.equal(resTaAuto.source, "script_detected");

  // Auto mode with Telugu script
  const resTeAuto = resolveQueryLanguage("హైదరాబాద్‌లో ఈరోజు వాతావరణం ఎలా ఉంది?", "auto");
  assert.equal(resTeAuto.language, "te");
  assert.equal(resTeAuto.source, "script_detected");

  // Auto mode with Marathi Devanagari (containing Marathi marker)
  const resMrAuto = resolveQueryLanguage("आजचे पुण्याचे हवामान कसे आहे?", "auto");
  assert.equal(resMrAuto.language, "mr");
  assert.equal(resMrAuto.source, "script_detected");

  // Auto mode with Hindi Devanagari
  const resHiAuto = resolveQueryLanguage("दिल्ली में आज का तापमान कितना है?", "auto");
  assert.equal(resHiAuto.language, "hi");
  assert.equal(resHiAuto.source, "script_detected");

  // Auto mode with Hinglish keywords
  const resHinglishAuto = resolveQueryLanguage("aaj delhi me kitna tapman hai", "auto");
  assert.equal(resHinglishAuto.language, "hinglish");
  assert.equal(resHinglishAuto.source, "keyword_detected");

  // Auto mode with plain English text defaults to 'en'
  const resEnAuto = resolveQueryLanguage("What is the current temperature in Mumbai?", "auto");
  assert.equal(resEnAuto.language, "en");
  assert.equal(resEnAuto.source, "default");
});

// ============================================================================
// 3. Regional TTS text: natural-language numeric text preserved, no Hindi numbers in non-Hindi languages
// ============================================================================
test("Step 11A.3: Regional TTS retains natural-language numeric text and does not inject Hindi words", () => {
  // Gujarati
  const guText = "તાપમાન 28°C છે અને પવન 15 km/h ઝડપે છે";
  const guSpoken = formatSpokenWeatherResponse(guText, "gu");
  assert.doesNotMatch(guSpoken, /अट्ठाईस|पंद्रह|बीस/, "Gujarati must not contain Devanagari Hindi number words");
  assert.match(guSpoken, /28\s+ડિગ્રી સેલ્સિયસ/);
  assert.match(guSpoken, /15\s+કિલોમીટર પ્રતિ કલાક/);

  // Bengali
  const bnText = "তাপমাত্রা 26°C এবং আর্দ্রতা 80%";
  const bnSpoken = formatSpokenWeatherResponse(bnText, "bn");
  assert.doesNotMatch(bnSpoken, /छब्बीस|अस्सी|बीस/, "Bengali must not contain Devanagari Hindi number words");
  assert.match(bnSpoken, /26\s+ডিগ্রি সেলসিয়াস/);
  assert.match(bnSpoken, /80\s+শতাংশ/);

  // Tamil
  const taText = "வெப்பநிலை 32°C மற்றும் காற்றின் வேகம் 20 km/h";
  const taSpoken = formatSpokenWeatherResponse(taText, "ta");
  assert.doesNotMatch(taSpoken, /बत्तीस|बीस/, "Tamil must not contain Devanagari Hindi number words");
  assert.match(taSpoken, /32\s+டிகிரி செல்சியஸ்/);
  assert.match(taSpoken, /20\s+கிலோமீட்டர் வேகம்/);

  // Telugu
  const teText = "ఉష్ణోగ్రత 30°C మరియు వర్షపాతం 10 mm";
  const teSpoken = formatSpokenWeatherResponse(teText, "te");
  assert.doesNotMatch(teSpoken, /तीस|दस/, "Telugu must not contain Devanagari Hindi number words");
  assert.match(teSpoken, /30\s+డిగ్రీల సెల్సియస్/);

  // Punjabi
  const paText = "ਤਾਪਮਾਨ 25°C ਅਤੇ ਹਵਾ 20 km/h";
  const paSpoken = formatSpokenWeatherResponse(paText, "pa");
  assert.doesNotMatch(paSpoken, /पच्चीस|बीस/, "Punjabi must not contain Devanagari Hindi number words");
  assert.match(paSpoken, /25\s+ਡਿਗਰੀ ਸੈਲਸੀਅਸ/);
  assert.match(paSpoken, /20\s+ਕਿਲੋਮੀਟਰ ਪ੍ਰਤੀ ਘੰਟਾ/);

  // Hindi: converts to Hindi words
  const hiText = "तापमान 28°C है और हवा 20 km/h है";
  const hiSpoken = formatSpokenWeatherResponse(hiText, "hi");
  assert.match(hiSpoken, /अट्ठाईस डिग्री सेल्सियस/);
  assert.match(hiSpoken, /बीस किलोमीटर प्रति घंटा/);

  // Hinglish: converts to Hindi words
  const hinglishText = "Temperature is 20 km/h and 28°C";
  const hinglishSpoken = formatSpokenWeatherResponse(hinglishText, "hinglish");
  assert.match(hinglishSpoken, /बीस kilometer per hour/);
});

// ============================================================================
// 4. Marathi / Devanagari detection regex in WeatherChat (without ASCII \b)
// ============================================================================
test("Step 11A.4: detectScriptLanguage in WeatherChat detects Marathi with non-ASCII boundaries", () => {
  // Marathi markers
  assert.equal(detectScriptLanguage("आजचे हवामान कसे आहे?"), "mr");
  assert.equal(detectScriptLanguage("मुंबईत आज पाऊस पडेल का?"), "mr");
  assert.equal(detectScriptLanguage("पुण्याचे हवामान सांगा"), "mr");

  // Pure Hindi Devanagari (no Marathi markers)
  assert.equal(detectScriptLanguage("आज का मौसम कैसा रहेगा?"), "hi");
  assert.equal(detectScriptLanguage("कल दिल्ली में बारिश होगी क्या?"), "hi");

  // Other regional scripts
  assert.equal(detectScriptLanguage("આજે હવામાન કેવું છે?"), "gu");
  assert.equal(detectScriptLanguage("আজকের আবহাওয়া কেমন?"), "bn");
  assert.equal(detectScriptLanguage("இன்றைய வானிலை எப்படி உள்ளது?"), "ta");
  assert.equal(detectScriptLanguage("ఈరోజు వాతావరణం ఎలా ఉంది?"), "te");
  assert.equal(detectScriptLanguage("What is the weather today?"), "en");
});

// ============================================================================
// 5. ALL output mode verification
// ============================================================================
test("Step 11A.5: ALL is preserved as an output mode and not treated as a normal language code", () => {
  // In resolveQueryLanguage, 'ALL' is treated as auto mode, not as a language code 'all'
  const resAllScript = resolveQueryLanguage("આજે હવામાન કેવું છે?", "ALL");
  assert.notEqual(resAllScript.language, "all");
  assert.equal(resAllScript.language, "gu");
  assert.equal(resAllScript.source, "script_detected");

  const resAllDefault = resolveQueryLanguage("What is the weather today?", "ALL");
  assert.notEqual(resAllDefault.language, "all");
  assert.equal(resAllDefault.language, "en");
  assert.equal(resAllDefault.source, "default");

  // In getLanguageConfig, 'ALL' falls back to default English configuration
  const config = getLanguageConfig("ALL");
  assert.equal(config.code, "en");
});
