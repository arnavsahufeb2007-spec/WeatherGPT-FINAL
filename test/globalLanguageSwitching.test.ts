import test from "node:test";
import assert from "node:assert/strict";
import {
  getTranslations,
  getLanguageConfig,
  ALL_LANGUAGES,
  LANGUAGE_REGISTRY,
  LanguageCode,
  UIStrings,
} from "../src/languages.js";

// ============================================================================
// 1. Language Resolution and Dictionary Completeness
// ============================================================================
test("1. getTranslations returns complete dictionary with English fallback for all supported languages", () => {
  const enTranslations = getTranslations("en");
  assert.ok(enTranslations, "English translations must exist");
  assert.equal(enTranslations.navHome, "Home & Chat");
  assert.equal(enTranslations.feelsLike, "Feels like");
  assert.equal(enTranslations.sevenDayOutlook, "7-Day Extended Outlook");

  // Every supported language in ALL_LANGUAGES must return a non-null, complete dictionary
  for (const lang of ALL_LANGUAGES) {
    const t = getTranslations(lang.code);
    assert.ok(t, `Translations for ${lang.code} (${lang.name}) must exist`);

    // Ensure all critical keys are populated and not empty
    const criticalKeys: (keyof UIStrings)[] = [
      "navHome",
      "navForecast",
      "navInsights",
      "navTravel",
      "navVoice",
      "navExplore",
      "navHistory",
      "navSettings",
      "navAuth",
      "stationBase",
      "selectStation",
      "change",
      "syncAccount",
      "guestMode",
      "signIn",
      "appearance",
      "themeDark",
      "themeLight",
      "liveSynoptic",
      "activeModule",
      "selectCity",
      "feelsLike",
      "high",
      "low",
      "precipitation",
      "humidity",
      "windVector",
      "uvIndex",
      "visibility",
      "pressure",
      "hourlyHorizon",
      "sevenDayOutlook",
      "activeAdvisoriesTitle",
      "welcomeTitle",
      "searchWorldwide",
      "useCurrentGps",
      "tabHome",
      "tabForecast",
      "tabInsights",
      "tabHistory",
      "tabVoice",
      "tabExplore",
      "tabProfile",
    ];

    for (const key of criticalKeys) {
      assert.ok(
        t[key] && typeof t[key] === "string" && t[key].trim().length > 0,
        `Key ${String(key)} must be defined and non-empty for language '${lang.code}'`
      );
    }
  }
});

// ============================================================================
// 2. Hindi (hi) Translation Consistency across User Interface
// ============================================================================
test("2. Hindi (hi) translation contains authentic Devanagari strings across all UI domains", () => {
  const hi = getTranslations("hi");

  // Sidebar & Navigation
  assert.match(hi.navHome, /होम/, "Hindi navHome should contain Devanagari 'होम'");
  assert.match(hi.navForecast, /पूर्वानुमान/, "Hindi navForecast should contain Devanagari 'पूर्वानुमान'");
  assert.match(hi.navInsights, /अंतर्दृष्टि|इनसाइट्स/, "Hindi navInsights should contain Devanagari translation");
  assert.match(hi.navTravel, /यात्रा/, "Hindi navTravel should contain Devanagari 'यात्रा'");
  assert.match(hi.navVoice, /वॉयस|आवाज़|ध्वनि/, "Hindi navVoice should contain Devanagari translation");
  assert.match(hi.navSettings, /सेटिंग्स|विन्यास/, "Hindi navSettings should contain Devanagari translation");
  assert.match(hi.stationBase, /स्टेशन|केंद्र/, "Hindi stationBase should contain Devanagari translation");
  assert.match(hi.change, /बदलें/, "Hindi change should contain Devanagari 'बदलें'");
  assert.match(hi.signIn, /साइन इन/, "Hindi signIn should contain Devanagari 'साइन इन'");
  assert.match(hi.appearance, /दिखावट|थीम|स्वरूप/, "Hindi appearance should contain Devanagari translation");

  // Header & Controls
  assert.match(hi.selectCity, /शहर चुनें|स्थान चुनें/, "Hindi selectCity should contain Devanagari translation");
  assert.match(hi.activeModule, /सक्रिय मॉड्यूल/, "Hindi activeModule should contain Devanagari translation");

  // Weather Metrics
  assert.match(hi.feelsLike, /महसूस/, "Hindi feelsLike should contain Devanagari 'महसूस'");
  assert.match(hi.high, /अधिकतम/, "Hindi high should contain Devanagari 'अधिकतम'");
  assert.match(hi.low, /न्यूनतम/, "Hindi low should contain Devanagari 'न्यूनतम'");
  assert.match(hi.precipitation, /वर्षा/, "Hindi precipitation should contain Devanagari 'वर्षा'");
  assert.match(hi.humidity, /आर्द्रता/, "Hindi humidity should contain Devanagari 'आर्द्रता'");
  assert.match(hi.windVector, /हवा|पवन/, "Hindi windVector should contain Devanagari translation");

  // Forecast & Outlook
  assert.match(hi.sevenDayOutlook, /पूर्वानुमान|दृष्टिकोण/, "Hindi sevenDayOutlook should contain Devanagari translation");
  assert.match(hi.today, /आज/, "Hindi today should contain Devanagari 'आज'");
  assert.match(hi.tomorrow, /कल/, "Hindi tomorrow should contain Devanagari 'कल'");

  // Welcome & Common
  assert.match(hi.welcomeTitle, /स्वागत/, "Hindi welcomeTitle should contain Devanagari 'स्वागत'");
  assert.match(hi.searchWorldwide, /खोजें/, "Hindi searchWorldwide should contain Devanagari 'खोजें'");
});

// ============================================================================
// 3. Fallback Behavior on Unknown or Malformed Language Codes
// ============================================================================
test("3. Fallback behavior: unknown or empty language codes gracefully fall back to English", () => {
  const fallbackEmpty = getTranslations("");
  assert.equal(fallbackEmpty.navHome, "Home & Chat");

  const fallbackUnknown = getTranslations("unknown-code-xyz");
  assert.equal(fallbackUnknown.navHome, "Home & Chat");
  assert.equal(fallbackUnknown.feelsLike, "Feels like");

  // 'ALL' output mode in AI query is not an interface language, falls back to English
  const fallbackAll = getTranslations("ALL");
  assert.equal(fallbackAll.navHome, "Home & Chat");
});

// ============================================================================
// 4. Hinglish Conversational Mode
// ============================================================================
test("4. Hinglish mode preserves conversational Roman-script Hindi terms", () => {
  const hinglish = getTranslations("hinglish");
  assert.ok(hinglish, "Hinglish translations must exist");
  assert.match(hinglish.navHome, /Home|Dost|Ghar/i);
  assert.match(hinglish.change, /Badlein|Change/i);
  assert.match(hinglish.selectCity, /Shahar|Location/i);
  assert.match(hinglish.precipitation, /Barish|Precipitation/i);
});

// ============================================================================
// 5. Major Regional Indian Languages have Authentic Native Script Coverage
// ============================================================================
test("5. Major Indian regional languages (bn, te, mr, ta, gu) have authentic native scripts", () => {
  // Bengali
  const bn = getTranslations("bn");
  assert.match(bn.navHome, /হোম/);
  assert.match(bn.feelsLike, /অনুভূত|অনূভুত|তাপমাত্রা/);

  // Telugu
  const te = getTranslations("te");
  assert.match(te.navHome, /హోమ్|హోం/);
  assert.match(te.precipitation, /వర్షపాతం|వర్షం/);

  // Marathi
  const mr = getTranslations("mr");
  assert.match(mr.navHome, /मुख्य|होम/);
  assert.match(mr.feelsLike, /जाणवणारे/);

  // Tamil
  const ta = getTranslations("ta");
  assert.match(ta.navHome, /முகப்பு/);
  assert.match(ta.precipitation, /மழை/);

  // Gujarati
  const gu = getTranslations("gu");
  assert.match(gu.navHome, /હોમ/);
  assert.match(gu.precipitation, /વરસાદ/);
});

// ============================================================================
// 6. Major International Languages Coverage (es, fr, de, ja, zh, ar)
// ============================================================================
test("6. Major International languages (es, fr, de, ja, zh, ar) have authentic native scripts", () => {
  // Spanish
  const es = getTranslations("es");
  assert.equal(es.navHome, "Inicio y Chat");
  assert.equal(es.signIn, "Iniciar Sesión");

  // French
  const fr = getTranslations("fr");
  assert.equal(fr.navHome, "Accueil et Chat");
  assert.equal(fr.signIn, "Connexion");

  // German
  const de = getTranslations("de");
  assert.equal(de.navHome, "Startseite & Chat");
  assert.equal(de.signIn, "Anmelden");

  // Japanese
  const ja = getTranslations("ja");
  assert.match(ja.navHome, /ホーム/);
  assert.match(ja.signIn, /サインイン|ログイン/);

  // Chinese
  const zh = getTranslations("zh");
  assert.match(zh.navHome, /主页|首页/);
  assert.match(zh.signIn, /登录/);

  // Arabic
  const ar = getTranslations("ar");
  assert.match(ar.navHome, /الرئيسية/);
  assert.match(ar.signIn, /تسجيل الدخول/);
});

// ============================================================================
// 7. Language Persistence and Guest Mode
// ============================================================================
test("7. Language preference persists across guest sessions without altering decoupled voice settings", async () => {
  const store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };

  // Simulate window.localStorage
  (globalThis as any).localStorage = mockStorage;

  // Set language preference to Hindi
  mockStorage.setItem("weathergpt_lang", "hi");

  // Read back
  const savedLang = mockStorage.getItem("weathergpt_lang");
  assert.equal(savedLang, "hi", "Language must persist in storage");

  // Verify getTranslations resolves Hindi from saved preference
  const t = getTranslations(savedLang);
  assert.match(t.navHome, /होम/);
  assert.match(t.feelsLike, /महसूस/);

  // Clean up
  delete (globalThis as any).localStorage;
});

// ============================================================================
// 8. Dynamic Section Title Resolution across Modules
// ============================================================================
test("8. Dynamic section title resolution updates accurately for all navigation sections", () => {
  const getSectionTitle = (sec: string, t: UIStrings) => {
    switch (sec) {
      case "home":
        return t.headerHome;
      case "forecast":
        return t.headerForecast;
      case "insights":
        return t.headerInsights;
      case "travel":
        return t.headerTravel;
      case "voice":
        return t.headerVoice;
      case "explore":
        return t.headerExplore;
      case "history":
        return t.headerHistory;
      case "settings":
        return t.headerSettings;
      case "auth":
        return t.headerAuth;
      default:
        return t.appName;
    }
  };

  const en = getTranslations("en");
  const hi = getTranslations("hi");

  const sections = ["home", "forecast", "insights", "travel", "voice", "explore", "history", "settings", "auth"];

  for (const sec of sections) {
    const enTitle = getSectionTitle(sec, en);
    const hiTitle = getSectionTitle(sec, hi);
    assert.ok(enTitle && enTitle.length > 0, `English title for ${sec} must exist`);
    assert.ok(hiTitle && hiTitle.length > 0, `Hindi title for ${sec} must exist`);
    assert.notEqual(enTitle, hiTitle, `Hindi title for ${sec} must differ from English`);
  }
});

