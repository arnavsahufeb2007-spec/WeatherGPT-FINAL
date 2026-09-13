import test from "node:test";
import assert from "node:assert/strict";
import { validateAndGroundWeatherResponse, StructuredAIOutput } from "../server/services/weatherGroundingValidator.js";
import { GroundedWeatherContext } from "../server/services/geminiService.js";
import { CurrentWeatherData } from "../server/types.js";

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
