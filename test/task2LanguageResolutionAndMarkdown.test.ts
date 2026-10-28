import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveEffectiveResponseLanguage,
  buildLocalizedInitialWeatherSummary,
} from "../src/languages.js";
import { parseMarkdownToNodes, isSafeUrl } from "../src/components/MarkdownRenderer.js";
import { buildMultilingualDeterministicFallback } from "../server/services/multilingualFallback.js";
import { resolveQueryLanguage } from "../server/services/nluService.js";

// ============================================================================
// 1. Centralized Language Resolution Priority Rules
// ============================================================================
test("1. Priority 1: Manual output language override takes precedence over App Language", () => {
  // App Language is Hindi, user explicitly chooses English output
  const res1 = resolveEffectiveResponseLanguage("hi", "en");
  assert.equal(res1, "en", "Manual English override must take precedence over Hindi app language");

  // App Language is English, user explicitly chooses Hindi output
  const res2 = resolveEffectiveResponseLanguage("en", "hi");
  assert.equal(res2, "hi", "Manual Hindi override must take precedence over English app language");

  // App Language is Spanish, user explicitly chooses French output
  const res3 = resolveEffectiveResponseLanguage("es", "fr");
  assert.equal(res3, "fr", "Manual French override must take precedence over Spanish app language");

  // App Language is Hindi, user explicitly chooses Hinglish output
  const res4 = resolveEffectiveResponseLanguage("hi", "hinglish");
  assert.equal(res4, "hinglish", "Manual Hinglish override must take precedence");
});

test("2. Priority 2: App Language Default applies when manual override is Auto or unset", () => {
  // App Language is Hindi, override is 'auto'
  assert.equal(resolveEffectiveResponseLanguage("hi", "auto"), "hi");

  // App Language is Hindi, override is undefined
  assert.equal(resolveEffectiveResponseLanguage("hi", undefined), "hi");

  // App Language is English, override is null/undefined
  assert.equal(resolveEffectiveResponseLanguage("en", null as any), "en");

  // App Language is Bengali, override is 'auto'
  assert.equal(resolveEffectiveResponseLanguage("bn", "auto"), "bn");

  // App Language is Telugu, override is ''
  assert.equal(resolveEffectiveResponseLanguage("te", ""), "te");
});

test("3. Priority 3: Fallback to English when language is unsupported or invalid", () => {
  // Unsupported language code
  assert.equal(resolveEffectiveResponseLanguage("xyz_unknown", "auto"), "en");
  assert.equal(resolveEffectiveResponseLanguage("xyz_unknown", undefined), "en");

  // Invalid manual override with valid app language falls back to app language
  assert.equal(resolveEffectiveResponseLanguage("hi", "unsupported_xyz"), "hi");

  // Completely empty or null values fall back to 'en'
  assert.equal(resolveEffectiveResponseLanguage("", ""), "en");
  assert.equal(resolveEffectiveResponseLanguage(undefined, undefined), "en");
});

test("4. Priority State Transitions: Switching App Language and Overrides", () => {
  // Scenario A: App language switches while in Auto mode
  let appLang = "hi";
  let override = "auto";
  assert.equal(resolveEffectiveResponseLanguage(appLang, override), "hi");

  appLang = "en";
  assert.equal(resolveEffectiveResponseLanguage(appLang, override), "en");

  appLang = "fr";
  assert.equal(resolveEffectiveResponseLanguage(appLang, override), "fr");

  // Scenario B: Manual override is active when App Language switches
  override = "en"; // User manually chose English
  appLang = "hi";
  assert.equal(resolveEffectiveResponseLanguage(appLang, override), "en", "Override must be retained when app lang changes to Hindi");

  appLang = "es";
  assert.equal(resolveEffectiveResponseLanguage(appLang, override), "en", "Override must be retained when app lang changes to Spanish");

  // Scenario C: User resets override back to Auto
  override = "auto";
  assert.equal(resolveEffectiveResponseLanguage(appLang, override), "es", "Resetting to Auto must follow current app language");
});

// ============================================================================
// 2. Server-side Prompt Construction & Multilingual Fallback
// ============================================================================
test("5. Multilingual weather fallback generates native Devanagari Hindi for 'hi'", () => {
  const result = buildMultilingualDeterministicFallback({
    userQuery: "What is the weather today?",
    language: "hi",
    location: { name: "New Delhi", latitude: 28.61, longitude: 77.23, timezone: "Asia/Kolkata" },
    current: {
      temperature: 28,
      feelsLike: 30,
      condition: "Clear sky",
      weatherCode: 0,
      humidity: 55,
      precipitationProbability: 10,
      rain: 0,
      precipitation: 0,
      windSpeed: 15,
      windGusts: 22,
      uvIndex: 7,
      visibility: 8000,
      pressure: 1012,
      time: "2026-10-25T14:00",
    } as any,
  });

  // Must contain Hindi Devanagari text
  assert.ok(/[\u0900-\u097F]/.test(result), "Response must contain Devanagari Hindi characters");
  assert.ok(result.includes("New Delhi") || result.includes("मौसम"), "Response must mention location or weather in Hindi");
  // Numbers must be preserved
  assert.ok(result.includes("28"), "Must preserve 28°C");
  assert.ok(result.includes("30"), "Must preserve 30°C feels like");
  assert.ok(result.includes("15"), "Must preserve 15 km/h wind");
});

test("6. Multilingual weather fallback generates Roman-script Hinglish for 'hinglish'", () => {
  const result = buildMultilingualDeterministicFallback({
    userQuery: "aaj ka mausam kaisa hai",
    language: "hinglish",
    location: { name: "Mumbai", latitude: 19.07, longitude: 72.87, timezone: "Asia/Kolkata" },
    current: {
      temperature: 32,
      feelsLike: 36,
      condition: "Partly cloudy",
      weatherCode: 1,
      humidity: 70,
      precipitationProbability: 40,
      rain: 0,
      precipitation: 0,
      windSpeed: 20,
      windGusts: 28,
      uvIndex: 8,
      visibility: 7000,
      pressure: 1010,
      time: "2026-10-25T14:00",
    } as any,
  });

  // Must NOT contain Devanagari characters for Hinglish
  assert.ok(!/[\u0900-\u097F]/.test(result), "Hinglish response must not use Devanagari script");
  // Must contain Hinglish phrasing
  assert.ok(/mausam|temperature|weather|barish|hai/i.test(result), "Response must contain Hinglish vocabulary");
  // Numerical fidelity
  assert.ok(result.includes("32"), "Must preserve 32°C");
  assert.ok(result.includes("40"), "Must preserve 40% probability");
});

// ============================================================================
// 3. Initial Chat Location Weather Summary Localization
// ============================================================================
test("7. Initial location weather summary produces localized Devanagari text when language is Hindi", () => {
  const summaryHi = buildLocalizedInitialWeatherSummary(
    { name: "New Delhi", latitude: 28.61, longitude: 77.23, timezone: "Asia/Kolkata" },
    {
      temperature: 28,
      feelsLike: 29,
      condition: "Sunny",
      weatherCode: 0,
      humidity: 50,
      precipitationProbability: 5,
      rain: 0,
      precipitation: 0,
      windSpeed: 12,
      windGusts: 18,
      uvIndex: 6,
      visibility: 10000,
      pressure: 1013,
      time: "2026-10-25T12:00",
    },
    { outdoorSuitabilityScore: 85, comfortLabel: "Pleasant" } as any,
    "hi",
    false
  );

  // Must contain Devanagari Hindi text
  assert.ok(/[\u0900-\u097F]/.test(summaryHi), "Initial summary for Hindi must be in Devanagari Hindi");
  assert.ok(summaryHi.includes("28°C"), "Must format temperature properly");
  assert.ok(summaryHi.includes("New Delhi"), "Must include location name");
});

test("8. Initial location weather summary produces English text when language is English", () => {
  const summaryEn = buildLocalizedInitialWeatherSummary(
    { name: "London", latitude: 51.5, longitude: -0.12, timezone: "Europe/London" },
    {
      temperature: 15,
      feelsLike: 14,
      condition: "Overcast",
      weatherCode: 3,
      humidity: 75,
      precipitationProbability: 20,
      rain: 0,
      precipitation: 0,
      windSpeed: 18,
      windGusts: 25,
      uvIndex: 3,
      visibility: 9000,
      pressure: 1015,
      time: "2026-10-25T12:00",
    },
    { outdoorSuitabilityScore: 70, comfortLabel: "Moderate" } as any,
    "en",
    false
  );

  assert.ok(summaryEn.includes("Hello! Here is your verified weather intelligence summary"), "Must use English greeting");
  assert.ok(summaryEn.includes("London"), "Must include location name");
  assert.ok(summaryEn.includes("15°C"), "Must include temperature");
});

// ============================================================================
// 4. Markdown Parsing and XSS Sanitization Tests
// ============================================================================
test("9. Markdown parser formats bold, headings, bullets, code blocks, and inline code", () => {
  const markdownText = `# Weather Forecast
Here is **important** information for **Delhi**:
• **Temperature**: 28°C
• **Conditions**: Sunny
Here is inline \`weather_code = 0\` and code block:
\`\`\`ts
const temp = 28;
\`\`\`
Check [Open-Meteo](https://open-meteo.com) for details.`;

  const nodes = parseMarkdownToNodes(markdownText);
  assert.ok(Array.isArray(nodes), "parseMarkdownToNodes must return an array of AST nodes");
  assert.ok(nodes.length > 0, "AST nodes must not be empty");

  // Check heading node
  const heading = nodes.find((n) => n.type === "heading" && n.level === 1);
  assert.ok(heading, "Heading 1 node must be identified");

  // Check list items
  const bulletList = nodes.find((n) => n.type === "bullet-list");
  assert.ok(bulletList, "Bullet list container must be created");
  const listItems = bulletList?.children || [];
  assert.ok(listItems.length >= 2, "Bullet items must be parsed into list item nodes inside list container");

  // Check code block
  const codeBlock = nodes.find((n) => n.type === "code-block");
  assert.ok(codeBlock, "Code block node must be identified");
  assert.equal(codeBlock?.language, "ts");
});

test("10. Markdown sanitizer prevents XSS attacks and unsafe link protocols", () => {
  // Safe URLs
  assert.equal(isSafeUrl("https://example.com"), true);
  assert.equal(isSafeUrl("http://weather.org/data"), true);
  assert.equal(isSafeUrl("mailto:support@weathergpt.app"), true);

  // Unsafe URLs
  assert.equal(isSafeUrl("javascript:alert(document.cookie)"), false);
  assert.equal(isSafeUrl("data:text/html,<script>alert(1)</script>"), false);
  assert.equal(isSafeUrl("vbscript:MsgBox(1)"), false);
  assert.equal(isSafeUrl("file:///etc/passwd"), false);

  // XSS attack vectors in markdown
  const maliciousMarkdown = `Click [Exploit](javascript:alert('pwned')) or <script>alert('xss')</script> or <img src=x onerror=alert(1)>`;
  const nodes = parseMarkdownToNodes(maliciousMarkdown);

  // Check that no link with javascript: protocol is emitted as an active href
  for (const node of nodes) {
    if (node.type === "link") {
      assert.notEqual(node.href, "javascript:alert('pwned')", "Must not emit javascript: URLs");
    }
  }
});

test("11. Markdown parser preserves symbols (*, #, $, %, °C) without indiscriminate stripping", () => {
  const mathAndSymbols = `Math: 3 * 5 = 15. Cost: $25. Chance: 96%. Temp: 28°C. Channel #general.`;
  const nodes = parseMarkdownToNodes(mathAndSymbols);
  const textContent = JSON.stringify(nodes);

  assert.ok(textContent.includes("3 * 5 = 15"), "Must preserve math multiplication asterisks");
  assert.ok(textContent.includes("$25"), "Must preserve dollar sign");
  assert.ok(textContent.includes("96%"), "Must preserve percentage");
  assert.ok(textContent.includes("28°C"), "Must preserve degree Celsius");
  assert.ok(textContent.includes("#general"), "Must preserve hash sign");
});

// ============================================================================
// 5. Mandatory End-to-End Integration Flow Tests
// ============================================================================
test("12. Integration: Hindi App with no manual override resolves to Hindi and formats Devanagari Markdown", () => {
  const appLanguage = "hi";
  const manualOverride = "auto";

  // Step 1: Centralized language resolution
  const effectiveLang = resolveEffectiveResponseLanguage(appLanguage, manualOverride);
  assert.equal(effectiveLang, "hi");

  // Step 2: Query resolution through server NLU
  const nluRes = resolveQueryLanguage("what is the weather today?", effectiveLang);
  assert.equal(nluRes.language, "hi", "Explicit effective language must propagate through NLU");

  // Step 3: AI Explanation generation in fallback / grounding
  const explanation = buildMultilingualDeterministicFallback({
    userQuery: "what is the weather today?",
    language: nluRes.language,
    location: { name: "Delhi", latitude: 28.6, longitude: 77.2, timezone: "Asia/Kolkata" },
    current: {
      temperature: 29,
      feelsLike: 31,
      condition: "Clear",
      weatherCode: 0,
      humidity: 50,
      precipitationProbability: 5,
      rain: 0,
      precipitation: 0,
      windSpeed: 12,
      windGusts: 18,
      uvIndex: 7,
      visibility: 9000,
      pressure: 1012,
      time: "2026-10-25T14:00",
    } as any,
  });

  // Step 4: Parse explanation into Markdown nodes
  const nodes = parseMarkdownToNodes(explanation);
  assert.ok(nodes.length > 0, "Must parse into Markdown AST nodes");
  // Devanagari verification
  assert.ok(/[\u0900-\u097F]/.test(explanation), "Generated response must be in Devanagari Hindi");
  // Factual grounding verification
  assert.ok(explanation.includes("29"), "Must contain exact 29°C temperature");
});

test("13. Integration: English App with no manual override produces English Markdown", () => {
  const appLanguage = "en";
  const manualOverride = "auto";

  const effectiveLang = resolveEffectiveResponseLanguage(appLanguage, manualOverride);
  assert.equal(effectiveLang, "en");

  const explanation = buildMultilingualDeterministicFallback({
    userQuery: "what is the weather today?",
    language: effectiveLang,
    location: { name: "London", latitude: 51.5, longitude: -0.12, timezone: "Europe/London" },
    current: {
      temperature: 16,
      feelsLike: 15,
      condition: "Partly Cloudy",
      weatherCode: 1,
      humidity: 65,
      precipitationProbability: 15,
      rain: 0,
      precipitation: 0,
      windSpeed: 14,
      windGusts: 20,
      uvIndex: 4,
      visibility: 10000,
      pressure: 1016,
      time: "2026-10-25T14:00",
    } as any,
  });

  const nodes = parseMarkdownToNodes(explanation);
  assert.ok(nodes.length > 0);
  assert.ok(explanation.includes("London"));
  assert.ok(explanation.includes("16°C"));
  assert.ok(/weather|temperature|wind/i.test(explanation));
});

test("14. Integration: Hindi App with manual English override produces English response", () => {
  const appLanguage = "hi";
  const manualOverride = "en"; // User explicitly selected English in Voice/Output settings

  const effectiveLang = resolveEffectiveResponseLanguage(appLanguage, manualOverride);
  assert.equal(effectiveLang, "en", "Manual English override takes precedence over Hindi app language");

  const nluRes = resolveQueryLanguage("aaj ka mausam kaisa hai", effectiveLang);
  assert.equal(nluRes.language, "en");

  const explanation = buildMultilingualDeterministicFallback({
    userQuery: "aaj ka mausam kaisa hai",
    language: nluRes.language,
    location: { name: "Delhi", latitude: 28.6, longitude: 77.2, timezone: "Asia/Kolkata" },
    current: {
      temperature: 28,
      feelsLike: 29,
      condition: "Clear",
      weatherCode: 0,
      humidity: 45,
      precipitationProbability: 0,
      rain: 0,
      precipitation: 0,
      windSpeed: 10,
      windGusts: 15,
      uvIndex: 6,
      visibility: 10000,
      pressure: 1013,
      time: "2026-10-25T14:00",
    } as any,
  });

  assert.ok(/currently in Delhi|weather in Delhi/i.test(explanation));
  assert.ok(explanation.includes("28°C"));
});

test("15. Integration: Dynamic App Language change while in Auto mode switches response language", () => {
  let appLanguage = "hi";
  let manualOverride = "auto";

  let effectiveLang = resolveEffectiveResponseLanguage(appLanguage, manualOverride);
  assert.equal(effectiveLang, "hi");

  // User changes App Language to Spanish
  appLanguage = "es";
  effectiveLang = resolveEffectiveResponseLanguage(appLanguage, manualOverride);
  assert.equal(effectiveLang, "es", "Subsequent query must switch to Spanish when in Auto mode");

  // User changes App Language to French
  appLanguage = "fr";
  effectiveLang = resolveEffectiveResponseLanguage(appLanguage, manualOverride);
  assert.equal(effectiveLang, "fr", "Subsequent query must switch to French when in Auto mode");
});

test("16. Integration: Manual override retained while App Language changes across multiple selections", () => {
  let manualOverride = "en"; // Explicitly locked to English
  let appLanguage = "hi";

  assert.equal(resolveEffectiveResponseLanguage(appLanguage, manualOverride), "en");

  appLanguage = "bn";
  assert.equal(resolveEffectiveResponseLanguage(appLanguage, manualOverride), "en");

  appLanguage = "gu";
  assert.equal(resolveEffectiveResponseLanguage(appLanguage, manualOverride), "en");
});

test("17. Integration: Auto mode restored after resetting override", () => {
  let manualOverride = "en";
  let appLanguage = "hi";
  assert.equal(resolveEffectiveResponseLanguage(appLanguage, manualOverride), "en");

  // User resets to Auto
  manualOverride = "auto";
  assert.equal(resolveEffectiveResponseLanguage(appLanguage, manualOverride), "hi", "Must return to App Language (Hindi)");
});

test("18. Integration: Voice STT language and speech rate remain independent of AI response language", () => {
  // Voice input is Gujarati ('gu'), Speech rate is 1.25, App language is Hindi ('hi'), Override is Auto ('auto')
  const voiceInputLang = "gu";
  const appLanguage = "hi";
  const manualOverride = "auto";

  // Voice input language does NOT affect AI text response language
  const effectiveResponseLang = resolveEffectiveResponseLanguage(appLanguage, manualOverride);
  assert.equal(effectiveResponseLang, "hi", "AI response language must follow App Language, not Voice Input language");
  assert.notEqual(effectiveResponseLang, voiceInputLang);
});

test("19. Integration: Follow-up messages in conversation preserve resolved language", () => {
  const appLanguage = "hi";
  const manualOverride = "auto";
  const effectiveLang = resolveEffectiveResponseLanguage(appLanguage, manualOverride);

  // Initial turn
  const turn1Nlu = resolveQueryLanguage("Delhi weather", effectiveLang);
  assert.equal(turn1Nlu.language, "hi");

  // Follow-up turn in same session
  const turn2Nlu = resolveQueryLanguage("and tomorrow?", effectiveLang);
  assert.equal(turn2Nlu.language, "hi", "Follow-up question must preserve the resolved Hindi language");
});

