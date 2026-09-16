import test from "node:test";
import assert from "node:assert/strict";
import {
  OpenMeteoWeatherProvider,
  WeatherProviderError,
  normalizeOpenMeteoResponse,
  normalizeHumidity,
  normalizeVisibility,
  normalizePressure,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
} from "../server/providers/weatherProvider.js";
import { getWeatherInfo } from "../server/providers/weatherCodes.js";
import { appCache } from "../server/cache.js";

function getMockRawOpenMeteo(overrides: Record<string, any> = {}) {
  const now = new Date().toISOString().slice(0, 13) + ":00";
  return {
    latitude: 28.65,
    longitude: 77.23,
    timezone: "Asia/Kolkata",
    current: {
      time: now,
      temperature_2m: 29.4,
      relative_humidity_2m: 62,
      apparent_temperature: 32.1,
      precipitation: 0.0,
      rain: 0.0,
      weather_code: 1,
      cloud_cover: 25,
      pressure_msl: 1010.8,
      surface_pressure: 1008.2,
      wind_speed_10m: 12.5,
      wind_direction_10m: 135,
      wind_gusts_10m: 18.2,
      uv_index: 5.4,
      is_day: 1,
      dew_point_2m: 21.3,
    },
    hourly: {
      time: [now, "2026-09-16T14:00", "2026-09-16T15:00"],
      temperature_2m: [29.4, 30.1, 29.8],
      relative_humidity_2m: [62, 58, 60],
      apparent_temperature: [32.1, 33.0, 32.5],
      precipitation_probability: [15, 20, 10],
      precipitation: [0.0, 0.0, 0.0],
      rain: [0.0, 0.0, 0.0],
      weather_code: [1, 2, 1],
      visibility: [8500, 9000, 8000],
      wind_speed_10m: [12.5, 13.0, 11.8],
      uv_index: [5.4, 6.0, 4.2],
    },
    daily: {
      time: ["2026-09-16", "2026-09-17"],
      weather_code: [1, 3],
      temperature_2m_max: [34.2, 33.5],
      temperature_2m_min: [24.1, 23.8],
      apparent_temperature_max: [37.0, 36.2],
      apparent_temperature_min: [25.0, 24.5],
      sunrise: ["2026-09-16T06:06", "2026-09-17T06:07"],
      sunset: ["2026-09-16T18:25", "2026-09-17T18:24"],
      uv_index_max: [7.2, 6.8],
      precipitation_sum: [0.0, 2.5],
      rain_sum: [0.0, 2.0],
      precipitation_probability_max: [20, 65],
      wind_speed_10m_max: [16.4, 18.2],
    },
    ...overrides,
  };
}

// A. Valid weather response
test("Weather Engine - A. Valid weather response normalization", () => {
  const raw = getMockRawOpenMeteo();
  const res = normalizeOpenMeteoResponse(raw, "Asia/Kolkata");

  assert.equal(res.timezone, "Asia/Kolkata");
  assert.equal(res.current.temperature, 29.4);
  assert.equal(res.current.feelsLike, 32.1);
  assert.equal(res.current.humidity, 62);
  assert.equal(res.current.precipitation, 0);
  assert.equal(res.current.rain, 0);
  assert.equal(res.current.precipitationProbability, 15);
  assert.equal(res.current.weatherCode, 1);
  assert.equal(res.current.condition, "Mainly Clear");
  assert.equal(res.current.windSpeed, 12.5);
  assert.equal(res.current.windDirection, 135);
  assert.equal(res.current.windGusts, 18.2);
  assert.equal(res.current.windGust, 18.2);
  assert.equal(res.current.cloudCover, 25);
  assert.equal(res.current.uvIndex, 5.4);
  assert.equal(res.current.visibility, 8500);
  assert.equal(res.current.pressure, 1011);
  assert.equal(res.current.dewPoint, 21.3);
  assert.equal(res.current.isDay, true);
  assert.equal(res.current.sunrise, "2026-09-16T06:06");
  assert.equal(res.current.sunset, "2026-09-16T18:25");

  assert.equal(res.hourly.length, 3);
  assert.equal(res.daily.length, 2);
});

// B. Missing humidity
test("Weather Engine - B. Missing humidity remains null without default substitution", () => {
  const raw = getMockRawOpenMeteo({
    current: {
      ...getMockRawOpenMeteo().current,
      relative_humidity_2m: null,
      dew_point_2m: null,
    },
    hourly: {
      ...getMockRawOpenMeteo().hourly,
      relative_humidity_2m: [null, null, null],
    },
  });

  const res = normalizeOpenMeteoResponse(raw);
  assert.equal(res.current.humidity, null, "Current humidity must remain null when missing");
  assert.equal(res.current.dewPoint, undefined, "Dew point must be undefined when humidity is unavailable");
  assert.equal(normalizeHumidity(null), null);
  assert.equal(normalizeHumidity(undefined), null);
  assert.equal(normalizeHumidity(""), null);
  assert.equal(normalizeHumidity(105), null, "Humidity > 100 must be rejected as invalid");
  assert.equal(normalizeHumidity(-5), null, "Humidity < 0 must be rejected as invalid");
  assert.equal(normalizeHumidity(45), 45);
});

// C. Missing visibility
test("Weather Engine - C. Missing visibility remains null without fake 10km substitution", () => {
  const raw = getMockRawOpenMeteo({
    hourly: {
      ...getMockRawOpenMeteo().hourly,
      visibility: [null, null, null],
    },
  });

  const res = normalizeOpenMeteoResponse(raw);
  assert.equal(res.current.visibility, null, "Current visibility must remain null when sensor data is missing");
  assert.equal(normalizeVisibility(null), null);
  assert.equal(normalizeVisibility(undefined), null);
  assert.equal(normalizeVisibility(""), null);
  assert.equal(normalizeVisibility(-100), null, "Negative visibility must be rejected");
  assert.equal(normalizeVisibility(5000), 5000);
});

// D. Zero precipitation
test("Weather Engine - D. Zero precipitation is preserved accurately", () => {
  const raw = getMockRawOpenMeteo({
    current: {
      ...getMockRawOpenMeteo().current,
      precipitation: 0.0,
      rain: 0.0,
    },
  });

  const res = normalizeOpenMeteoResponse(raw);
  assert.equal(res.current.precipitation, 0);
  assert.equal(res.current.rain, 0);
});

// E. Precipitation without current rain
test("Weather Engine - E. Total precipitation distinct from rain (snow/sleet/drizzle)", () => {
  const raw = getMockRawOpenMeteo({
    current: {
      ...getMockRawOpenMeteo().current,
      precipitation: 2.4,
      rain: 0.0,
      weather_code: 71, // Slight snow fall
    },
  });

  const res = normalizeOpenMeteoResponse(raw);
  assert.equal(res.current.precipitation, 2.4, "Total precipitation must be 2.4 mm");
  assert.equal(res.current.rain, 0, "Liquid rain must remain 0 mm");
  assert.equal(res.current.condition, "Slight Snow Fall");
});

// F. High precipitation probability with zero current rain
test("Weather Engine - F. High forecast probability with zero current rain", () => {
  const raw = getMockRawOpenMeteo({
    current: {
      ...getMockRawOpenMeteo().current,
      precipitation: 0.0,
      rain: 0.0,
    },
    hourly: {
      ...getMockRawOpenMeteo().hourly,
      precipitation_probability: [85, 90, 75],
    },
  });

  const res = normalizeOpenMeteoResponse(raw);
  assert.equal(res.current.precipitationProbability, 85, "Probability must reflect forecast value of 85%");
  assert.equal(res.current.rain, 0, "Current rain must strictly remain 0 mm");
  assert.equal(res.current.precipitation, 0, "Current precipitation must strictly remain 0 mm");
});

// G. Timezone alignment
test("Weather Engine - G. Timezone alignment and propagation", () => {
  const rawNY = getMockRawOpenMeteo({ timezone: "America/New_York" });
  const resNY = normalizeOpenMeteoResponse(rawNY, "America/New_York");
  assert.equal(resNY.timezone, "America/New_York");

  const rawDefault = getMockRawOpenMeteo({ timezone: "" });
  const resDefault = normalizeOpenMeteoResponse(rawDefault, "Asia/Kolkata");
  assert.equal(resDefault.timezone, "Asia/Kolkata");
});

// H. Weather-code mapping
test("Weather Engine - H. Weather-code mapping via WMO standards", () => {
  assert.equal(getWeatherInfo(0).condition, "Clear Sky");
  assert.equal(getWeatherInfo(1).condition, "Mainly Clear");
  assert.equal(getWeatherInfo(2).condition, "Partly Cloudy");
  assert.equal(getWeatherInfo(3).condition, "Overcast");
  assert.equal(getWeatherInfo(45).condition, "Fog");
  assert.equal(getWeatherInfo(48).condition, "Depositing Rime Fog");
  assert.equal(getWeatherInfo(51).condition, "Light Drizzle");
  assert.equal(getWeatherInfo(61).condition, "Slight Rain");
  assert.equal(getWeatherInfo(63).condition, "Moderate Rain");
  assert.equal(getWeatherInfo(65).condition, "Heavy Rain");
  assert.equal(getWeatherInfo(71).condition, "Slight Snow Fall");
  assert.equal(getWeatherInfo(80).condition, "Slight Rain Showers");
  assert.equal(getWeatherInfo(95).condition, "Thunderstorm");
  assert.equal(getWeatherInfo(99).condition, "Thunderstorm with Heavy Hail");

  // Unknown code fallback
  const fallbackInfo = getWeatherInfo(999);
  assert.ok(fallbackInfo.condition.length > 0, "Fallback condition must be populated");
});

// I. Malformed API response
test("Weather Engine - I. Malformed API response detection and rejection", () => {
  assert.throws(
    () => normalizeOpenMeteoResponse(null),
    (err: any) => err instanceof WeatherProviderError && err.category === "malformed_response"
  );

  assert.throws(
    () => normalizeOpenMeteoResponse("string payload"),
    (err: any) => err instanceof WeatherProviderError && err.category === "malformed_response"
  );

  assert.throws(
    () => normalizeOpenMeteoResponse({}),
    (err: any) => err instanceof WeatherProviderError && err.category === "malformed_response"
  );

  assert.throws(
    () => normalizeOpenMeteoResponse({ current: {} }),
    (err: any) => err instanceof WeatherProviderError && err.category === "malformed_response"
  );
});

// J. HTTP failure
test("Weather Engine - J. HTTP failure detection and categorization", () => {
  assert.throws(
    () => normalizeOpenMeteoResponse({ error: true, reason: "Latitude must be in range [-90, 90]" }),
    (err: any) =>
      err instanceof WeatherProviderError &&
      err.category === "http_error" &&
      err.message.includes("Latitude must be in range")
  );

  const providerError = new WeatherProviderError("HTTP 500 Internal Server Error", "http_error", 500);
  assert.equal(providerError.category, "http_error");
  assert.equal(providerError.statusCode, 500);
});

// K. Timeout
test("Weather Engine - K. Timeout detection and categorization", () => {
  const timeoutError = new WeatherProviderError("Open-Meteo weather service request timed out after 8000ms", "timeout");
  assert.equal(timeoutError.category, "timeout");
  assert.ok(timeoutError.message.includes("timed out"));
});

// L. Cache hit
test("Weather Engine - L. Cache hit returns exact cached result", () => {
  const cacheKey = "weather_test_28.650_77.230_Asia/Kolkata";
  const mockResult = normalizeOpenMeteoResponse(getMockRawOpenMeteo());

  appCache.set(cacheKey, mockResult, 600);
  const retrieved = appCache.get<typeof mockResult>(cacheKey);

  assert.ok(retrieved !== null, "Cache hit must return stored entry");
  assert.equal(retrieved?.current.temperature, mockResult.current.temperature);
  assert.equal(retrieved?.timezone, "Asia/Kolkata");
});

// M. Cache expiry
test("Weather Engine - M. Cache expiry invalidates expired entry", async () => {
  const cacheKey = "weather_test_expiry";
  const mockResult = normalizeOpenMeteoResponse(getMockRawOpenMeteo());

  // Set with 0s TTL and wait 10ms
  appCache.set(cacheKey, mockResult, 0);
  await new Promise((r) => setTimeout(r, 15));
  const retrieved = appCache.get(cacheKey);

  assert.equal(retrieved, null, "Expired cache key must return null");
});

// N. Temperature-unit conversion
test("Weather Engine - N. Temperature-unit conversion precision", () => {
  assert.equal(celsiusToFahrenheit(0), 32.0);
  assert.equal(celsiusToFahrenheit(25), 77.0);
  assert.equal(celsiusToFahrenheit(100), 212.0);
  assert.equal(celsiusToFahrenheit(-40), -40.0);
  assert.equal(celsiusToFahrenheit(28.6), 83.5);

  assert.equal(fahrenheitToCelsius(32), 0.0);
  assert.equal(fahrenheitToCelsius(77), 25.0);
  assert.equal(fahrenheitToCelsius(212), 100.0);
  assert.equal(fahrenheitToCelsius(-40), -40.0);
  assert.equal(fahrenheitToCelsius(83.5), 28.6);
});

// O. Incomplete hourly data
test("Weather Engine - O. Incomplete hourly data is handled gracefully", () => {
  const raw = getMockRawOpenMeteo({
    hourly: {
      time: ["2026-09-16T12:00"],
      temperature_2m: [28.5],
      // Missing other fields
    },
  });

  const res = normalizeOpenMeteoResponse(raw);
  assert.equal(res.hourly.length, 1);
  assert.equal(res.hourly[0].temperature, 28.5);
  assert.equal(res.hourly[0].rain, 0);
  assert.equal(res.hourly[0].precipitationProbability, 0);
});

// P. Incomplete daily data
test("Weather Engine - P. Incomplete daily data is handled gracefully", () => {
  const rawNoDaily = getMockRawOpenMeteo({ daily: {} });
  const resNoDaily = normalizeOpenMeteoResponse(rawNoDaily);
  assert.equal(resNoDaily.daily.length, 0);
  assert.equal(resNoDaily.current.sunrise, "");
  assert.equal(resNoDaily.current.sunset, "");

  const raw1Day = getMockRawOpenMeteo({
    daily: {
      time: ["2026-09-16"],
      weather_code: [0],
      temperature_2m_max: [31.0],
      temperature_2m_min: [22.0],
    },
  });
  const res1Day = normalizeOpenMeteoResponse(raw1Day);
  assert.equal(res1Day.daily.length, 1);
  assert.equal(res1Day.daily[0].tempMax, 31.0);
  assert.equal(res1Day.daily[0].tempMin, 22.0);
});
