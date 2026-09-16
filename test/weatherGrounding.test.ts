import test from "node:test";
import assert from "node:assert/strict";
import { validateAndGroundWeatherResponse, StructuredAIOutput } from "../server/services/weatherGroundingValidator.js";
import { GroundedWeatherContext } from "../server/services/geminiService.js";
import { CurrentWeatherData } from "../server/types.js";
import { parseQuery, resolveQueryLanguage, resolveLocationAndIntent, isFollowUpQuery, isDeviceLocationIntent } from "../server/services/nluService.js";
import { geocodingProvider } from "../server/providers/geocodingProvider.js";
import { buildMultilingualDeterministicFallback, getLocalizedLocationRequiredMessage } from "../server/services/multilingualFallback.js";
import { analyzeWeather } from "../server/services/weatherIntelligence.js";
import { evaluateActivity } from "../server/services/activityIntelligence.js";
import { analyzeTravel } from "../server/services/travelIntelligence.js";
import { routingProvider } from "../server/providers/routingProvider.js";
import { weatherProvider } from "../server/providers/weatherProvider.js";

function createMockCurrentWeather(overrides: Partial<CurrentWeatherData> = {}): CurrentWeatherData {
  return {
    time: "2026-09-13T12:00:00Z",
    temperature: 28,
    feelsLike: 31,
    condition: "Moderate Rain",
    weatherCode: 63,
    humidity: 78,
    precipitation: 3.5,
    rain: 3.5,
    precipitationProbability: 96,
    windSpeed: 14,
    windDirection: 120,
    windGusts: 22,
    cloudCover: 80,
    uvIndex: 6,
    visibility: 6000,
    pressure: 1012,
    isDay: true,
    sunrise: "06:05",
    sunset: "18:30",
    ...overrides,
  };
}

function createMockContext(overrides: Partial<GroundedWeatherContext> = {}): GroundedWeatherContext {
  return {
    userQuery: "Will it rain in Delhi today?",
    language: "en",
    location: {
      name: "New Delhi",
      latitude: 28.6139,
      longitude: 77.209,
      timezone: "Asia/Kolkata",
      country: "India",
      admin1: "Delhi",
    },
    current: createMockCurrentWeather(),
    ...overrides,
  };
}

test("RULE 1 & 2: 96% precipitation must never become 100% in natural language response", () => {
  const context = createMockContext({
    current: createMockCurrentWeather({ precipitationProbability: 96 }),
  });

  // Simulated AI hallucination rounding 96% to 100%
  const aiHallucinatedReply =
    "Today in New Delhi, there is a 100% chance of rain. Rain is guaranteed at 100% probability, so keep an umbrella handy.";

  const result = validateAndGroundWeatherResponse(aiHallucinatedReply, context);

  // Verification: 100% must be eliminated and replaced with 96%
  assert.equal(result.isValid, false, "Should detect violation for 100% claim when provider is 96%");
  assert.ok(!result.correctedText.includes("100%"), "Output must not contain 100%");
  assert.ok(result.correctedText.includes("96%"), "Output must contain the exact 96% provider probability");
});

test("RULE 11: 70% precipitation must never become 80% or 100%", () => {
  const context = createMockContext({
    current: createMockCurrentWeather({ precipitationProbability: 70 }),
  });

  // Test 70% becoming 80%
  const aiInflatedTo80 =
    "According to the latest forecast, you can expect an 80% chance of rain in the city this afternoon.";
  const result80 = validateAndGroundWeatherResponse(aiInflatedTo80, context);

  assert.equal(result80.isValid, false, "Should detect violation when 70% is inflated to 80%");
  assert.ok(!result80.correctedText.includes("80% chance"), "Output must not inflate 70% to 80%");
  assert.ok(result80.correctedText.includes("70%"), "Output must preserve exact provider probability of 70%");

  // Test 70% becoming 100%
  const aiInflatedTo100 = "Rain is 100% guaranteed in Delhi today.";
  const result100 = validateAndGroundWeatherResponse(aiInflatedTo100, context);

  assert.equal(result100.isValid, false, "Should detect violation when 70% becomes 100%");
  assert.ok(!result100.correctedText.includes("100%"), "Output must not contain 100%");
  assert.ok(result100.correctedText.includes("70%"), "Output must state exact provider 70%");
});

test("RULE 11: 0% precipitation must never become a positive probability", () => {
  const context = createMockContext({
    current: createMockCurrentWeather({ precipitationProbability: 0, rain: 0 }),
  });

  // Simulated AI hallucinating a positive rain chance
  const aiInventedRain = "There is a 20% chance of rain later this evening in Jaipur.";
  const result = validateAndGroundWeatherResponse(aiInventedRain, context);

  assert.equal(result.isValid, false, "Should flag positive rain chance when provider reported 0%");
  assert.ok(!result.correctedText.includes("20%"), "Output must not include hallucinated 20%");
  assert.ok(result.correctedText.includes("0%"), "Output must reflect 0% precipitation");
});

test("RULE 3 & 11: Temperatures must remain unchanged and identical to source data", () => {
  const context = createMockContext({
    current: createMockCurrentWeather({
      temperature: 28,
      feelsLike: 31,
    }),
  });

  // Simulated AI rounding 28°C to 30°C and feels-like 31°C to 35°C
  const aiAlteredTemps =
    "The current temperature is 30°C in Delhi, although it feels like 35°C due to high humidity.";

  const result = validateAndGroundWeatherResponse(aiAlteredTemps, context);

  assert.equal(result.isValid, false, "Should flag altered temperature values");
  assert.ok(!result.correctedText.includes("30°C"), "Must discard altered 30°C");
  assert.ok(!result.correctedText.includes("35°C"), "Must discard altered 35°C");
  assert.ok(result.correctedText.includes("28°C"), "Must preserve verified provider temperature of 28°C");
  assert.ok(result.correctedText.includes("31°C"), "Must preserve verified provider feels-like of 31°C");
});

test("RULE 3 & 11: Wind values must remain unchanged and identical to source data", () => {
  const context = createMockContext({
    current: createMockCurrentWeather({
      windSpeed: 14,
      windGusts: 22,
    }),
  });

  // Simulated AI exaggerating wind speed
  const aiExaggeratedWind =
    "Strong winds at 25 km/h are currently sweeping through the area.";

  const result = validateAndGroundWeatherResponse(aiExaggeratedWind, context);

  assert.equal(result.isValid, false, "Should flag altered wind speed");
  assert.ok(!result.correctedText.includes("25 km/h"), "Must discard altered 25 km/h");
  assert.ok(result.correctedText.includes("14 km/h"), "Must preserve verified provider wind speed of 14 km/h");
});

test("RULE 7: Probability values must not convert into absolute certainty unless provider is 100%", () => {
  const context = createMockContext({
    current: createMockCurrentWeather({ precipitationProbability: 96 }),
  });

  const aiAbsoluteStatement =
    "Rain is guaranteed today with 100% certainty. You definitely will rain drenched.";

  const result = validateAndGroundWeatherResponse(aiAbsoluteStatement, context);

  assert.ok(!result.correctedText.includes("guaranteed"), "Must not make absolute guarantee for <100%");
  assert.ok(!result.correctedText.includes("100%"), "Must not claim 100%");
  assert.ok(result.correctedText.includes("96%"), "Must ground to 96%");
});

test("RULE 9 & 10: Structured AI output with conflicting numerical values is discarded and overridden", () => {
  const context = createMockContext({
    current: createMockCurrentWeather({
      precipitationProbability: 96,
      temperature: 28,
      windSpeed: 14,
    }),
  });

  // Gemini returns structured JSON with conflicting fields
  const structuredData: StructuredAIOutput = {
    directAnswer: "Expect rain today in Delhi.",
    referencedPrecipitationProbability: 100, // Conflict! Provider is 96
    referencedTemperature: 30, // Conflict! Provider is 28
    referencedWindSpeed: 20, // Conflict! Provider is 14
    detailedExplanation: "Rainfall probability is 100%.",
  };

  const result = validateAndGroundWeatherResponse(
    structuredData.detailedExplanation || "",
    context,
    structuredData
  );

  // Verified: structured fields must be discarded and replaced with provider truth
  assert.equal(
    structuredData.referencedPrecipitationProbability,
    96,
    "Structured precipitationProbability must be overridden with provider truth (96)"
  );
  assert.equal(
    structuredData.referencedTemperature,
    28,
    "Structured temperature must be overridden with provider truth (28)"
  );
  assert.equal(
    structuredData.referencedWindSpeed,
    14,
    "Structured windSpeed must be overridden with provider truth (14)"
  );
  assert.ok(result.correctedText.includes("96%"), "Text explanation must also be grounded to 96%");
});

test("RULE 5 & 6: Travel advice does not claim live traffic congestion/flooding and distinguishes from live traffic", () => {
  const context = createMockContext({
    userQuery: "Driving route from Delhi to Agra on Yamuna Expressway",
    current: createMockCurrentWeather({ precipitationProbability: 80 }),
    travel: {
      origin: { name: "Delhi", latitude: 28.6, longitude: 77.2, timezone: "Asia/Kolkata" },
      destination: { name: "Agra", latitude: 27.1, longitude: 78.0, timezone: "Asia/Kolkata" },
      mode: "car",
      totalDistanceKm: 210,
      estimatedDurationMinutes: 190,
      checkpoints: [],
      originWeather: createMockCurrentWeather(),
      destinationWeather: createMockCurrentWeather(),
      weatherRiskLevel: "moderate",
      keyWeatherRisks: ["Rain or wet road conditions expected"],
      recommendations: ["Maintain safe following distance."],
      routeSummary: "Route covers 210 km.",
    },
  });

  const aiTrafficClaim =
    "Heavy traffic congestion and massive traffic jam reported on the highway, and roads are flooded near Mathura. Flights are delayed.";

  const result = validateAndGroundWeatherResponse(aiTrafficClaim, context);

  // Must not claim unverified traffic jams or flooded roads
  assert.ok(!result.correctedText.includes("Heavy traffic congestion"), "Must remove ungrounded traffic congestion claim");
  assert.ok(!result.correctedText.includes("massive traffic jam"), "Must remove ungrounded massive traffic jam claim");
  assert.ok(!result.correctedText.includes("roads are flooded"), "Must remove ungrounded road flooding claim");
  assert.ok(!result.correctedText.includes("Flights are delayed"), "Must remove ungrounded flight delay claim");
  assert.ok(result.correctedText.includes("potential weather-related travel slowdowns"), "Must replace with weather slowdowns");
  // Must include explicit travel caveat
  assert.ok(
    result.correctedText.includes("Travel advice is based purely on atmospheric and road-weather conditions"),
    "Must include explicit weather-only travel disclaimer"
  );
});

test("Hinglish & Hindi numerical preservation: 96% rain and 28°C remain intact", () => {
  const context = createMockContext({
    language: "hinglish",
    current: createMockCurrentWeather({
      precipitationProbability: 96,
      temperature: 28,
    }),
  });

  const aiHinglishReply =
    "Aaj Delhi me 100% barish hone ke chances hain, aur current tapman 30°C hai.";

  const result = validateAndGroundWeatherResponse(aiHinglishReply, context);

  assert.ok(!result.correctedText.includes("100%"), "Hinglish output must not contain 100%");
  assert.ok(result.correctedText.includes("96%"), "Hinglish output must state 96%");
  assert.ok(result.correctedText.includes("28°C"), "Hinglish output must preserve 28°C tapman");
});

test("Gujarati query language detection: 'આજે હવામાન કેવું છે?' detects 'gu' in auto mode, while explicit preference remains authoritative", () => {
  const parsedAuto = parseQuery("આજે હવામાન કેવું છે?", undefined, "auto");
  assert.strictEqual(parsedAuto.language, "gu", "Language must be gu (Gujarati) in auto mode");
  assert.strictEqual(parsedAuto.detectedLocations.length, 0, "Should have no false location extracted");

  const parsedUndefined = parseQuery("આજે હવામાન કેવું છે?", undefined, undefined);
  assert.strictEqual(parsedUndefined.language, "gu", "Language must be gu (Gujarati) when preferredLanguage is undefined");

  const parsedExplicitEn = parseQuery("આજે હવામાન કેવું છે?", undefined, "en");
  assert.strictEqual(parsedExplicitEn.language, "en", "Explicit English preference must be authoritative");
});

test("Generic location queries: 'my city', 'my location', 'my area' do not resolve as locations", async () => {
  const parsed1 = parseQuery("what is the weather in my city?", undefined, "en");
  assert.deepStrictEqual(parsed1.detectedLocations, [], "'my city' must not be added to detectedLocations");

  const parsed2 = parseQuery("how is the weather in my location?", undefined, "en");
  assert.deepStrictEqual(parsed2.detectedLocations, [], "'my location' must not be added to detectedLocations");

  const geoRes = await geocodingProvider.resolveLocation("my city");
  assert.strictEqual(geoRes, null, "geocodingProvider.resolveLocation('my city') must return null (not Belgium)");

  const geoResMy = await geocodingProvider.resolveLocation("my");
  assert.strictEqual(geoResMy, null, "geocodingProvider.resolveLocation('my') must return null");
});

test("Deterministic fallback in Gujarati produces native Gujarati text", () => {
  const fallback = buildMultilingualDeterministicFallback({
    userQuery: "આજે હવામાન કેવું છે?",
    language: "gu",
    location: { name: "Ahmedabad", latitude: 23.02, longitude: 72.57, timezone: "Asia/Kolkata" },
    current: createMockCurrentWeather({
      temperature: 27.5,
      feelsLike: 27.7,
      humidity: 47,
      windSpeed: 11.2,
      windGusts: 24.1,
      uvIndex: 2.3,
      visibility: 32300,
      precipitation: 0,
      rain: 0,
      condition: "Clear Sky",
      precipitationProbability: 0,
    }),
    analysis: {
      rainRisk: "none",
      rainRiskLabel: "No rain expected",
      heatRisk: "normal",
      heatRiskLabel: "Normal temperature",
      windRisk: "calm",
      windRiskLabel: "Calm breeze",
      uvRisk: "low",
      uvRiskLabel: "Low UV",
      visibilityRisk: "good",
      visibilityRiskLabel: "Clear visibility",
      comfortIndex: "pleasant",
      comfortLabel: "Pleasant",
      summary: "Clear sky and comfortable conditions.",
      outdoorSuitabilityScore: 90,
    },
  });

  // Must contain authentic Gujarati phrases
  assert.ok(fallback.includes("હાલમાં Ahmedabad માં હવામાન"), "Must contain Gujarati greeting");
  assert.ok(fallback.includes("તાપમાન 27.5°C"), "Must preserve exact 27.5°C temperature");
  assert.ok(fallback.includes("ચોખ્ખું આકાશ"), "Must translate Clear Sky to Gujarati");
  assert.ok(fallback.includes("હાલમાં વરસાદ પડી રહ્યો નથી"), "Must contain dry notice in Gujarati");
  assert.ok(!fallback.includes("Currently in My"), "Must never contain English 'Currently in My'");
});

test("Step 3: Query Language Resolution precedence", () => {
  // Explicit preference is authoritative over query text
  const explicitEn = resolveQueryLanguage("આજે હવામાન કેવું છે?", "en");
  assert.equal(explicitEn.language, "en");
  assert.equal(explicitEn.source, "preferred_language");

  const explicitGu = resolveQueryLanguage("What is the weather today?", "gu");
  assert.equal(explicitGu.language, "gu");
  assert.equal(explicitGu.source, "preferred_language");

  const explicitTa = resolveQueryLanguage("aaj ka mausam kaisa hai", "ta");
  assert.equal(explicitTa.language, "ta");
  assert.equal(explicitTa.source, "preferred_language");

  // Scenario G: Auto mode - Gujarati script detection
  const guRes = resolveQueryLanguage("આજે હવામાન કેવું છે?", "auto");
  assert.equal(guRes.language, "gu");
  assert.equal(guRes.source, "script_detected");

  // Scenario H: Auto mode - Marathi script with marker
  const mrRes = resolveQueryLanguage("आजचे हवामान कसे आहे?", "auto");
  assert.equal(mrRes.language, "mr");
  assert.equal(mrRes.source, "script_detected");

  // Scenario I: Auto mode - Hindi script
  const hiRes = resolveQueryLanguage("आज का मौसम कैसा रहेगा?", "auto");
  assert.equal(hiRes.language, "hi");
  assert.equal(hiRes.source, "script_detected");

  // Auto mode: Bengali script
  const bnRes = resolveQueryLanguage("আজকের আবহাওয়া কেমন?", "auto");
  assert.equal(bnRes.language, "bn");
  assert.equal(bnRes.source, "script_detected");

  // Scenario J: Auto mode - Hinglish keyword detection
  const hinglishRes = resolveQueryLanguage("aaj ka mausam kaisa hai", "auto");
  assert.equal(hinglishRes.language, "hinglish");
  assert.equal(hinglishRes.source, "keyword_detected");

  // Scenario K: User configured preferredLanguage when query has no distinctive script/keywords
  const prefRes = resolveQueryLanguage("What is the weather today?", "fr");
  assert.equal(prefRes.language, "fr");
  assert.equal(prefRes.source, "preferred_language");

  // Scenario L: Default English when preferredLanguage is undefined
  const defRes = resolveQueryLanguage("What is the weather today?", undefined);
  assert.equal(defRes.language, "en");
  assert.equal(defRes.source, "default");

  // ALL output mode: not treated as a language code; falls back to script or English
  const allResGu = resolveQueryLanguage("આજે હવામાન કેવું છે?", "ALL");
  assert.equal(allResGu.language, "gu");
  assert.equal(allResGu.source, "script_detected");

  const allResEn = resolveQueryLanguage("What is the weather today?", "ALL");
  assert.equal(allResEn.language, "en");
  assert.equal(allResEn.source, "default");
});

test("Step 3: Location Resolution Priority 1 - Explicit Location in query", async () => {
  // Explicit Indian city in query
  const resDelhi = await resolveLocationAndIntent("Weather in Delhi today", undefined, "en");
  assert.equal(resDelhi.resolution.locationSource, "explicit_query");
  assert.equal(resDelhi.resolution.locationConfidence, "high");
  assert.equal(resDelhi.resolution.requiresLocation, false);
  assert.equal(resDelhi.resolution.location?.name.toLowerCase(), "delhi");

  // Explicit location overrides previous context location
  const context = {
    currentLocation: { name: "Mumbai", latitude: 19.07, longitude: 72.87, timezone: "Asia/Kolkata" },
  };
  const resJaipur = await resolveLocationAndIntent("How is Jaipur tomorrow?", context, "en");
  assert.equal(resJaipur.resolution.locationSource, "explicit_query");
  assert.equal(resJaipur.resolution.location?.name.toLowerCase(), "jaipur");
  assert.equal(resJaipur.resolution.isFollowUp, false);
});

test("Step 3: Location Resolution Priority 2 - Context Follow-Up Query", async () => {
  const context = {
    currentLocation: { name: "Delhi", latitude: 28.61, longitude: 77.20, timezone: "Asia/Kolkata" },
  };

  // Follow-up question without explicit location
  assert.ok(isFollowUpQuery("what about tomorrow", true));
  assert.ok(isFollowUpQuery("will it rain", true));
  assert.ok(!isFollowUpQuery("what about Mumbai", true));

  const resFollowUp = await resolveLocationAndIntent("what about tomorrow?", context, "en");
  assert.equal(resFollowUp.resolution.locationSource, "context_followup");
  assert.equal(resFollowUp.resolution.locationConfidence, "high");
  assert.equal(resFollowUp.resolution.isFollowUp, true);
  assert.equal(resFollowUp.resolution.requiresLocation, false);
  assert.equal(resFollowUp.resolution.location?.name, "Delhi");
});

test("Step 3: Location Resolution Priority 3 - Device Location Intent", async () => {
  const clientLocation = { name: "Ahmedabad", latitude: 23.02, longitude: 72.57, timezone: "Asia/Kolkata" };

  assert.ok(isDeviceLocationIntent("what's the weather in my location"));
  assert.ok(isDeviceLocationIntent("here"));
  assert.ok(isDeviceLocationIntent("current location weather"));

  // With device location available
  const resWithClient = await resolveLocationAndIntent("weather at my location", undefined, "en", clientLocation);
  assert.equal(resWithClient.resolution.locationSource, "device_current");
  assert.equal(resWithClient.resolution.locationConfidence, "high");
  assert.equal(resWithClient.resolution.requiresLocation, false);
  assert.equal(resWithClient.resolution.location?.name, "Ahmedabad");

  // Without device location available
  const resWithoutClient = await resolveLocationAndIntent("weather at my location", undefined, "en", undefined);
  assert.equal(resWithoutClient.resolution.locationSource, "none");
  assert.equal(resWithoutClient.resolution.requiresLocation, true);
  assert.equal(resWithoutClient.resolution.location, null);
});

test("Step 3: Blocked queries and generic questions never resolve to locations or 'My, Belgium'", async () => {
  const queries = [
    "what's the weather",
    "how is the weather",
    "will it rain today",
    "tell me the weather",
    "my city",
    "my location",
    "my area",
    "give me the forecast",
    "weather forecast",
    "kaisa mausam hai",
    "barish hogi kya",
  ];

  for (const q of queries) {
    const res = await resolveLocationAndIntent(q, undefined, "en");
    assert.equal(
      res.resolution.location,
      null,
      `Query "${q}" must NOT resolve to a location (received: ${res.resolution.location?.name})`
    );
    assert.equal(res.resolution.requiresLocation, true, `Query "${q}" must set requiresLocation=true`);
    assert.equal(res.resolution.locationSource, "none");
  }
});

test("Step 3: Localized location prompt message generation", () => {
  const guPrompt = getLocalizedLocationRequiredMessage("gu");
  assert.ok(guPrompt.includes("શહેર"), "Gujarati prompt must ask for city in Gujarati");

  const hiPrompt = getLocalizedLocationRequiredMessage("hi");
  assert.ok(hiPrompt.includes("शहर"), "Hindi prompt must ask for city in Hindi");

  const mrPrompt = getLocalizedLocationRequiredMessage("mr");
  assert.ok(mrPrompt.includes("शहर"), "Marathi prompt must ask for city in Marathi");

  const enPrompt = getLocalizedLocationRequiredMessage("en");
  assert.ok(enPrompt.includes("city or location"), "English prompt must ask for city or location in English");
});

test("Step 5A: analyzeWeather handles valid vs null/missing humidity gracefully", () => {
  const weatherWithHumidity = createMockCurrentWeather({ humidity: 65 });
  const analysis1 = analyzeWeather(weatherWithHumidity);
  assert.ok(analysis1.summary.includes("humidity is 65%"), "Summary must display formatted humidity when present");
  assert.ok(!analysis1.summary.includes("null%"), "Summary must not contain null%");

  const weatherWithoutHumidity = createMockCurrentWeather({ humidity: null });
  const analysis2 = analyzeWeather(weatherWithoutHumidity);
  assert.ok(analysis2.summary.includes("humidity unavailable"), "Summary must display 'humidity unavailable' when null");
  assert.ok(!analysis2.summary.includes("null%"), "Summary must never contain 'null%'");
  assert.ok(!analysis2.summary.includes("undefined%"), "Summary must never contain 'undefined%'");
});

test("Step 8A: Activity Intelligence - Cycling and hiking do not generate unsupported surface/traction claims", () => {
  const forbiddenTerms = [
    /tarmac/i,
    /tire traction/i,
    /asphalt/i,
    /dry roadway/i,
    /pavement heat/i,
    /road grip/i,
    /trail traction/i,
    /slippery\s*\/\s*muddy/i,
  ];

  // Test cycling across diverse weather conditions (rainy, hot, clear)
  const cyclingScenarios = [
    createMockCurrentWeather({ rain: 4.5, precipitationProbability: 80 }),
    createMockCurrentWeather({ temperature: 40, feelsLike: 45 }),
    createMockCurrentWeather({ rain: 0, precipitationProbability: 5, windSpeed: 8 }),
  ];

  for (const weather of cyclingScenarios) {
    const analysis = evaluateActivity("cycling", weather);
    assert.ok(analysis, "Cycling analysis must be returned");
    const fullText = JSON.stringify(analysis);
    for (const term of forbiddenTerms) {
      assert.ok(!term.test(fullText), `Cycling analysis must NOT contain ${term} (found in: ${fullText})`);
    }
  }

  // Test hiking across diverse weather conditions (rainy, storm, clear)
  const hikingScenarios = [
    createMockCurrentWeather({ rain: 5, precipitationProbability: 85 }),
    createMockCurrentWeather({ weatherCode: 95 }),
    createMockCurrentWeather({ rain: 0, precipitationProbability: 10, visibility: 12000 }),
  ];

  for (const weather of hikingScenarios) {
    const analysis = evaluateActivity("hiking", weather);
    assert.ok(analysis, "Hiking analysis must be returned");
    const fullText = JSON.stringify(analysis);
    for (const term of forbiddenTerms) {
      assert.ok(!term.test(fullText), `Hiking analysis must NOT contain ${term} (found in: ${fullText})`);
    }
  }
});

test("Step 9A: Travel Intelligence - Route analysis does not generate unsupported surface, traction, or overpass frost claims", async () => {
  const forbiddenTravelTerms = [
    /wet surfaces may increase the possibility of reduced tire traction/i,
    /reduced tire traction/i,
    /tire traction/i,
    /wet pavement detected/i,
    /painted road markings/i,
    /bridge joints/i,
    /frost on elevated overpasses/i,
    /early-morning frost on elevated overpasses/i,
  ];

  const originalGetRoute = routingProvider.getRoute;
  const originalGetWeatherData = weatherProvider.getWeatherData;

  try {
    const origin = { name: "Mumbai", latitude: 19.076, longitude: 72.877, timezone: "Asia/Kolkata" };
    const destination = { name: "Pune", latitude: 18.5204, longitude: 73.8567, timezone: "Asia/Kolkata" };

    // Mock route with 5 checkpoints conforming to RouteResult
    routingProvider.getRoute = async () => ({
      totalDistanceKm: 150,
      estimatedDurationMinutes: 180,
      geometryCoordinates: [[72.877, 19.076], [73.8567, 18.5204]],
      provider: "osrm",
      checkpoints: [
        { name: "Mumbai", latitude: 19.076, longitude: 72.877, distanceKm: 0, timeOffsetMinutes: 0, estimatedArrival: "10:00 AM" },
        { name: "Navi Mumbai", latitude: 19.033, longitude: 73.029, distanceKm: 30, timeOffsetMinutes: 35, estimatedArrival: "10:35 AM" },
        { name: "Lonavala", latitude: 18.755, longitude: 73.409, distanceKm: 85, timeOffsetMinutes: 100, estimatedArrival: "11:40 AM" },
        { name: "Pimpri", latitude: 18.627, longitude: 73.800, distanceKm: 130, timeOffsetMinutes: 155, estimatedArrival: "12:35 PM" },
        { name: "Pune", latitude: 18.5204, longitude: 73.8567, distanceKm: 150, timeOffsetMinutes: 180, estimatedArrival: "01:00 PM" },
      ],
    });

    // Test 1: Heavy rain corridor with bike mode
    weatherProvider.getWeatherData = async (lat, lon) => {
      const mockWeather = createMockCurrentWeather({
        rain: 4.5,
        precipitationProbability: 85,
        temperature: 24,
      });
      return {
        current: mockWeather,
        hourly: [],
        daily: [],
        timezone: "Asia/Kolkata",
        source: "open-meteo" as const,
        fetchedAt: new Date().toISOString(),
      };
    };

    const bikeAnalysis = await analyzeTravel(origin, destination, "bike");
    const bikeJson = JSON.stringify(bikeAnalysis);
    for (const term of forbiddenTravelTerms) {
      assert.ok(!term.test(bikeJson), `Bike travel analysis must NOT contain ${term} (found in: ${bikeJson})`);
    }

    // Test 2: Heavy rain corridor with car mode
    const carAnalysis = await analyzeTravel(origin, destination, "car");
    const carJson = JSON.stringify(carAnalysis);
    for (const term of forbiddenTravelTerms) {
      assert.ok(!term.test(carJson), `Car travel analysis must NOT contain ${term} (found in: ${carJson})`);
    }

    // Test 3: Very cold corridor (minTemp <= 6)
    weatherProvider.getWeatherData = async (lat, lon) => {
      const mockWeather = createMockCurrentWeather({
        temperature: 3,
        feelsLike: 1,
        rain: 0,
        precipitationProbability: 0,
      });
      return {
        current: mockWeather,
        hourly: [],
        daily: [],
        timezone: "Asia/Kolkata",
        source: "open-meteo" as const,
        fetchedAt: new Date().toISOString(),
      };
    };

    const coldAnalysis = await analyzeTravel(origin, destination, "car");
    const coldJson = JSON.stringify(coldAnalysis);
    for (const term of forbiddenTravelTerms) {
      assert.ok(!term.test(coldJson), `Cold travel analysis must NOT contain ${term} (found in: ${coldJson})`);
    }
  } finally {
    routingProvider.getRoute = originalGetRoute;
    weatherProvider.getWeatherData = originalGetWeatherData;
  }
});





