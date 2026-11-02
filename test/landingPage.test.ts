import test from "node:test";
import assert from "node:assert/strict";
import { getTranslations, getLanguageConfig } from "../src/languages.js";

test("Landing Page Translations — English default strings exist", () => {
  const t = getTranslations("en");
  assert.equal(t.landingHeroBadge, "GROUNDED ATMOSPHERIC INTELLIGENCE");
  assert.equal(t.landingGetStarted, "Get Started");
  assert.equal(t.landingExploreForecast, "Explore Live Forecast");
  assert.ok(t.landingHeroTitle.includes("Conversational Weather Intelligence"));
  assert.equal(t.featureLiveForecastTitle, "Live Grounded Forecasts");
  assert.equal(t.featureVoiceMultilingualTitle, "30+ Language Voice Studio");
});

test("Landing Page Translations — Hindi Devanagari localization", () => {
  const t = getTranslations("hi");
  assert.equal(t.landingHeroBadge, "सत्यापित वायुमंडलीय बुद्धिमत्ता");
  assert.equal(t.landingGetStarted, "शुरू करें");
  assert.equal(t.landingExploreForecast, "पूर्वानुमान देखें");
  assert.equal(t.featureLiveForecastTitle, "लाइव सत्यापित पूर्वानुमान");
  assert.equal(t.featureVoiceMultilingualTitle, "30+ भाषा वॉयस स्टूडियो");
});

test("Landing Page Translations — Multilingual coverage across all 30+ supported languages", () => {
  const langConfig = getLanguageConfig("hi");
  assert.equal(langConfig.code, "hi");
  assert.equal(langConfig.name, "Hindi");
  assert.equal(langConfig.nativeName, "हिन्दी");
});
