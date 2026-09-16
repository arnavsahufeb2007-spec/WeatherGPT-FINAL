import { CurrentWeatherData, DailyForecastItem, HourlyForecastItem } from "../types.js";
import { getWeatherInfo } from "./weatherCodes.js";
import { appCache } from "../cache.js";

export type WeatherErrorCategory =
  | "timeout"
  | "http_error"
  | "malformed_response"
  | "network_error"
  | "validation_error";

export class WeatherProviderError extends Error {
  public readonly category: WeatherErrorCategory;
  public readonly statusCode?: number;

  constructor(message: string, category: WeatherErrorCategory, statusCode?: number) {
    super(message);
    this.name = "WeatherProviderError";
    this.category = category;
    this.statusCode = statusCode;
  }
}

export interface WeatherDataResult {
  current: CurrentWeatherData;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  timezone: string;
}

export interface IWeatherProvider {
  getWeatherData(lat: number, lon: number, timezone?: string): Promise<WeatherDataResult>;
}

export function normalizeHumidity(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num)) return null;
  if (num >= 0 && num <= 100) {
    return Math.round(num);
  }
  return null;
}

export function normalizeVisibility(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num) || num < 0) return null;
  return Math.round(num);
}

export function normalizePressure(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num);
}

export function celsiusToFahrenheit(celsius: number): number {
  return Math.round(((celsius * 9) / 5 + 32) * 10) / 10;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return Math.round((((fahrenheit - 32) * 5) / 9) * 10) / 10;
}

export function normalizeOpenMeteoResponse(raw: any, requestedTimezone: string = "auto"): WeatherDataResult {
  if (!raw || typeof raw !== "object") {
    throw new WeatherProviderError("Malformed weather data response: payload is not a valid object", "malformed_response");
  }

  if (raw.error === true) {
    throw new WeatherProviderError(
      raw.reason || "Open-Meteo reported an error in the response payload",
      "http_error",
      400
    );
  }

  if (!raw.current && !raw.hourly) {
    throw new WeatherProviderError(
      "Open-Meteo response contains neither current nor hourly meteorological observations",
      "malformed_response"
    );
  }

  const timezone = raw.timezone || (requestedTimezone !== "auto" ? requestedTimezone : "Asia/Kolkata") || "Asia/Kolkata";
  const curr = raw.current || {};
  const daily = raw.daily || {};
  const todaySunrise = daily.sunrise?.[0] || "";
  const todaySunset = daily.sunset?.[0] || "";

  // Locate matching hourly index for current time
  const nowTime = curr.time || new Date().toISOString();
  let validIdx = 0;
  let currentPrecipProb = 0;
  let currentVisibility: number | null = null;

  if (raw.hourly?.time && Array.isArray(raw.hourly.time)) {
    const matchIdx = raw.hourly.time.findIndex((t: string) => t >= nowTime);
    validIdx = matchIdx >= 0 ? matchIdx : 0;
    currentPrecipProb = raw.hourly.precipitation_probability?.[validIdx] ?? 0;
    currentVisibility = normalizeVisibility(raw.hourly.visibility?.[validIdx]);
  }

  // Humidity: extract without silently substituting fake values
  let currentHumidity: number | null = normalizeHumidity(curr.relative_humidity_2m);
  if (currentHumidity === null && raw.hourly?.relative_humidity_2m && Array.isArray(raw.hourly.relative_humidity_2m)) {
    currentHumidity = normalizeHumidity(raw.hourly.relative_humidity_2m[validIdx]);
  }

  // Ensure temperature exists
  const tempVal = curr.temperature_2m !== undefined
    ? curr.temperature_2m
    : raw.hourly?.temperature_2m?.[validIdx];

  if (tempVal === undefined || tempVal === null || isNaN(Number(tempVal))) {
    throw new WeatherProviderError(
      "Weather data response missing essential temperature observations",
      "malformed_response"
    );
  }

  const temperature = Math.round(Number(tempVal) * 10) / 10;
  const feelsLike = curr.apparent_temperature !== undefined
    ? Math.round(Number(curr.apparent_temperature) * 10) / 10
    : raw.hourly?.apparent_temperature?.[validIdx] !== undefined
      ? Math.round(Number(raw.hourly.apparent_temperature[validIdx]) * 10) / 10
      : temperature;

  const weatherCode = curr.weather_code ?? (raw.hourly?.weather_code?.[validIdx] ?? 0);
  const weatherInfo = getWeatherInfo(weatherCode);

  const windSpeed = Math.round((curr.wind_speed_10m ?? raw.hourly?.wind_speed_10m?.[validIdx] ?? 0) * 10) / 10;
  const windGustVal = Math.round((curr.wind_gusts_10m ?? curr.wind_speed_10m ?? raw.hourly?.wind_speed_10m?.[validIdx] ?? 0) * 10) / 10;

  const dewPoint = typeof curr.dew_point_2m === "number"
    ? Math.round(curr.dew_point_2m * 10) / 10
    : currentHumidity !== null
      ? Math.round((temperature - (100 - currentHumidity) / 5) * 10) / 10
      : undefined;

  const current: CurrentWeatherData = {
    time: nowTime,
    temperature,
    feelsLike,
    humidity: currentHumidity,
    precipitation: Math.round((curr.precipitation ?? 0) * 10) / 10,
    rain: Math.round((curr.rain ?? 0) * 10) / 10,
    precipitationProbability: Math.round(currentPrecipProb),
    weatherCode,
    condition: weatherInfo.condition,
    windSpeed,
    windDirection: Math.round(curr.wind_direction_10m ?? 0),
    windGusts: windGustVal,
    windGust: windGustVal,
    cloudCover: Math.round(curr.cloud_cover ?? 0),
    uvIndex: Math.round((curr.uv_index ?? raw.hourly?.uv_index?.[validIdx] ?? 0) * 10) / 10,
    visibility: currentVisibility,
    pressure: normalizePressure(curr.pressure_msl ?? curr.surface_pressure),
    dewPoint,
    isDay: Boolean(curr.is_day ?? 1),
    sunrise: todaySunrise,
    sunset: todaySunset,
  };

  // Process hourly (next 24 hours from valid start)
  const hourlyItems: HourlyForecastItem[] = [];
  if (raw.hourly?.time && Array.isArray(raw.hourly.time)) {
    const startIndex = raw.hourly.time.findIndex((t: string) => t >= nowTime);
    const actualStart = Math.max(0, startIndex >= 0 ? startIndex : 0);
    const hourlySlice = raw.hourly.time.slice(actualStart, actualStart + 24);

    for (let i = 0; i < hourlySlice.length; i++) {
      const idx = actualStart + i;
      const timeStr = raw.hourly.time[idx];
      const timeObj = new Date(timeStr);
      const hours = timeObj.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHour = `${hours % 12 === 0 ? 12 : hours % 12}:00 ${ampm}`;

      const code = raw.hourly.weather_code?.[idx] ?? 0;
      const hTemp = raw.hourly.temperature_2m?.[idx] !== undefined
        ? Math.round(Number(raw.hourly.temperature_2m[idx]) * 10) / 10
        : temperature;

      hourlyItems.push({
        time: timeStr,
        formattedTime: i === 0 ? "Now" : formattedHour,
        temperature: hTemp,
        feelsLike: Math.round((raw.hourly.apparent_temperature?.[idx] ?? hTemp) * 10) / 10,
        precipitationProbability: Math.round(raw.hourly.precipitation_probability?.[idx] ?? 0),
        precipitation: raw.hourly.precipitation?.[idx] !== undefined
          ? Math.round(Number(raw.hourly.precipitation[idx]) * 10) / 10
          : undefined,
        rain: Math.round((raw.hourly.rain?.[idx] ?? 0) * 10) / 10,
        weatherCode: code,
        condition: getWeatherInfo(code).condition,
        windSpeed: Math.round((raw.hourly.wind_speed_10m?.[idx] ?? 0) * 10) / 10,
        uvIndex: Math.round((raw.hourly.uv_index?.[idx] ?? 0) * 10) / 10,
        humidity: normalizeHumidity(raw.hourly.relative_humidity_2m?.[idx]),
      });
    }
  }

  // Process daily (up to 7 days)
  const dailyItems: DailyForecastItem[] = [];
  if (daily.time && Array.isArray(daily.time)) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const maxDays = Math.min(daily.time.length, 7);
    for (let i = 0; i < maxDays; i++) {
      const dateStr = daily.time[i];
      const d = new Date(dateStr + "T12:00:00");
      const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : days[d.getDay()];
      const formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const code = daily.weather_code?.[i] ?? 0;

      dailyItems.push({
        date: dateStr,
        formattedDate,
        dayName,
        tempMax: Math.round((daily.temperature_2m_max?.[i] ?? 0) * 10) / 10,
        tempMin: Math.round((daily.temperature_2m_min?.[i] ?? 0) * 10) / 10,
        precipitationProbabilityMax: Math.round(daily.precipitation_probability_max?.[i] ?? 0),
        rainSum: Math.round((daily.rain_sum?.[i] ?? 0) * 10) / 10,
        weatherCode: code,
        condition: getWeatherInfo(code).condition,
        uvIndexMax: Math.round((daily.uv_index_max?.[i] ?? 0) * 10) / 10,
        windSpeedMax: Math.round((daily.wind_speed_10m_max?.[i] ?? 0) * 10) / 10,
        sunrise: daily.sunrise?.[i] ?? "",
        sunset: daily.sunset?.[i] ?? "",
      });
    }
  }

  return {
    current,
    hourly: hourlyItems,
    daily: dailyItems,
    timezone,
  };
}

export class OpenMeteoWeatherProvider implements IWeatherProvider {
  private baseUrl = "https://api.open-meteo.com/v1/forecast";

  async getWeatherData(lat: number, lon: number, requestedTimezone: string = "auto"): Promise<WeatherDataResult> {
    if (typeof lat !== "number" || typeof lon !== "number" || isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new WeatherProviderError("Invalid latitude or longitude coordinates provided to weather provider.", "validation_error");
    }

    const cacheKey = `weather_${lat.toFixed(3)}_${lon.toFixed(3)}_${requestedTimezone}`;
    const cached = appCache.get<WeatherDataResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const currentParams = [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "rain",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "uv_index",
      "is_day",
      "dew_point_2m",
    ].join(",");

    const hourlyParams = [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "rain",
      "weather_code",
      "visibility",
      "wind_speed_10m",
      "uv_index",
    ].join(",");

    const dailyParams = [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "sunrise",
      "sunset",
      "uv_index_max",
      "precipitation_sum",
      "rain_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(",");

    const url = `${this.baseUrl}?latitude=${lat}&longitude=${lon}&current=${currentParams}&hourly=${hourlyParams}&daily=${dailyParams}&timezone=${encodeURIComponent(
      requestedTimezone
    )}&forecast_days=7`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new WeatherProviderError(
          `Open-Meteo returned status ${response.status}: ${response.statusText}`,
          "http_error",
          response.status
        );
      }

      let raw: any;
      try {
        raw = await response.json();
      } catch {
        throw new WeatherProviderError("Failed to parse JSON response from Open-Meteo", "malformed_response");
      }

      const result = normalizeOpenMeteoResponse(raw, requestedTimezone);

      // Cache for 10 minutes (600s)
      appCache.set(cacheKey, result, 600);
      return result;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err instanceof WeatherProviderError) {
        throw err;
      }
      if (controller.signal.aborted || err.name === "AbortError") {
        throw new WeatherProviderError("Open-Meteo weather service request timed out after 8000ms", "timeout");
      }
      throw new WeatherProviderError(`Failed to fetch weather from Open-Meteo: ${err.message}`, "network_error");
    }
  }
}

export const weatherProvider: IWeatherProvider = new OpenMeteoWeatherProvider();

