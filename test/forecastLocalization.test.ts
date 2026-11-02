import test from "node:test";
import assert from "node:assert/strict";
import {
  getTranslations,
  getLocaleCode,
  getLocalizedDayName,
  formatHourlyTime,
  getLocalizedWeatherCondition,
} from "../src/languages.js";

test("Forecast Page Localization — Hindi Devanagari Banner Strings", () => {
  const t = getTranslations("hi");
  assert.equal(t.forecastBannerTag, "मौसम पूर्वानुमान");
  assert.equal(t.forecastBannerTitle, "बहु-दिवसीय और प्रति घंटा प्रक्षेपवक्र");
  assert.ok(t.forecastBannerDesc.length > 0);
  assert.equal(t.hourlyHorizon, "24-घंटे का रुझान");
  assert.equal(t.metricTemperature, "तापमान");
  assert.equal(t.metricPrecipitation, "वर्षा");
  assert.equal(t.sevenDayOutlook, "7-दिनों का विस्तृत पूर्वानुमान");
});

test("Forecast Page Localization — Locale Code Mapping", () => {
  assert.equal(getLocaleCode("hi"), "hi-IN");
  assert.equal(getLocaleCode("en"), "en-US");
  assert.equal(getLocaleCode("bn"), "bn-IN");
  assert.equal(getLocaleCode("es"), "es-ES");
});

test("Forecast Page Localization — Localized Day Name Formatting", () => {
  const dateStr = "2026-10-28T00:00:00Z";
  const hindiDay = getLocalizedDayName(dateStr, "Wednesday", "hi");
  assert.ok(hindiDay.length > 0);
  assert.notEqual(hindiDay, "Wednesday"); // Must not remain English Wednesday
});

test("Forecast Page Localization — Hourly Time Formatting", () => {
  const nowFormatted = formatHourlyTime("", "Now", "hi");
  assert.equal(nowFormatted, "अभी");

  const hourFormatted = formatHourlyTime("2026-10-25T15:00:00Z", "3:00 PM", "hi");
  assert.ok(hourFormatted.length > 0);
});

test("Forecast Page Localization — Weather Condition Mapping", () => {
  const clearHindi = getLocalizedWeatherCondition(0, "Clear Sky", "hi");
  assert.equal(clearHindi, "साफ़ आकाश");

  const rainHindi = getLocalizedWeatherCondition(63, "Moderate Rain", "hi");
  assert.equal(rainHindi, "मध्यम बारिश");
});
