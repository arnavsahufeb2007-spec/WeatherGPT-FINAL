import { CurrentWeatherData, DailyForecastItem, HourlyForecastItem } from "../types.js";
import { getWeatherInfo } from "./weatherCodes.js";
import { appCache } from "../cache.js";

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

export class OpenMeteoWeatherProvider implements IWeatherProvider {
  private baseUrl = "https://api.open-meteo.com/v1/forecast";

  async getWeatherData(lat: number, lon: number, requestedTimezone: string = "auto"): Promise<WeatherDataResult> {
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
        throw new Error(`Open-Meteo returned status ${response.status}: ${response.statusText}`);
      }

      const raw = await response.json();
      const timezone = raw.timezone || requestedTimezone || "Asia/Kolkata";

      // Process current
      const curr = raw.current || {};
      const daily = raw.daily || {};
      const todaySunrise = daily.sunrise?.[0] || "";
      const todaySunset = daily.sunset?.[0] || "";
      const weatherInfo = getWeatherInfo(curr.weather_code ?? 0);

      // Extract current precipitation probability from first matching hourly if available
      const nowTime = curr.time || new Date().toISOString();
      let currentPrecipProb = 0;
      let currentVisibility = 10000;

      let validIdx = 0;
      if (raw.hourly?.time && Array.isArray(raw.hourly.time)) {
        const matchIdx = raw.hourly.time.findIndex((t: string) => t >= nowTime);
        validIdx = matchIdx >= 0 ? matchIdx : 0;
        currentPrecipProb = raw.hourly.precipitation_probability?.[validIdx] ?? 0;
        currentVisibility = raw.hourly.visibility?.[validIdx] ?? 10000;
      }

      // Extract current relative humidity accurately without silently defaulting to 0 or 50
      let currentHumidity: number | null = normalizeHumidity(curr.relative_humidity_2m);
      if (currentHumidity === null && raw.hourly?.relative_humidity_2m && Array.isArray(raw.hourly.relative_humidity_2m)) {
        currentHumidity = normalizeHumidity(raw.hourly.relative_humidity_2m[validIdx]);
      }

      const dewPoint = currentHumidity !== null
        ? Math.round(((curr.temperature_2m ?? 0) - (100 - currentHumidity) / 5) * 10) / 10
        : undefined;

      const current: CurrentWeatherData = {
        time: nowTime,
        temperature: Math.round((curr.temperature_2m ?? 0) * 10) / 10,
        feelsLike: Math.round((curr.apparent_temperature ?? curr.temperature_2m ?? 0) * 10) / 10,
        humidity: currentHumidity,
        precipitation: Math.round((curr.precipitation ?? 0) * 10) / 10,
        rain: Math.round((curr.rain ?? 0) * 10) / 10,
        precipitationProbability: Math.round(currentPrecipProb),
        weatherCode: curr.weather_code ?? 0,
        condition: weatherInfo.condition,
        windSpeed: Math.round((curr.wind_speed_10m ?? 0) * 10) / 10,
        windDirection: Math.round(curr.wind_direction_10m ?? 0),
        windGusts: Math.round((curr.wind_gusts_10m ?? curr.wind_speed_10m ?? 0) * 10) / 10,
        cloudCover: Math.round(curr.cloud_cover ?? 0),
        uvIndex: Math.round((curr.uv_index ?? 0) * 10) / 10,
        visibility: Math.round(currentVisibility),
        pressure: Math.round(curr.pressure_msl ?? curr.surface_pressure ?? 1013),
        dewPoint,
        isDay: Boolean(curr.is_day ?? 1),
        sunrise: todaySunrise,
        sunset: todaySunset,
      };

      // Process hourly (next 24 hours)
      const hourlyItems: HourlyForecastItem[] = [];
      if (raw.hourly?.time) {
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
          hourlyItems.push({
            time: timeStr,
            formattedTime: i === 0 ? "Now" : formattedHour,
            temperature: Math.round((raw.hourly.temperature_2m?.[idx] ?? 0) * 10) / 10,
            feelsLike: Math.round((raw.hourly.apparent_temperature?.[idx] ?? 0) * 10) / 10,
            precipitationProbability: Math.round(raw.hourly.precipitation_probability?.[idx] ?? 0),
            rain: Math.round((raw.hourly.rain?.[idx] ?? 0) * 10) / 10,
            weatherCode: code,
            condition: getWeatherInfo(code).condition,
            windSpeed: Math.round((raw.hourly.wind_speed_10m?.[idx] ?? 0) * 10) / 10,
            uvIndex: Math.round((raw.hourly.uv_index?.[idx] ?? 0) * 10) / 10,
            humidity: normalizeHumidity(raw.hourly.relative_humidity_2m?.[idx]),
          });
        }
      }

      // Process daily (7 days)
      const dailyItems: DailyForecastItem[] = [];
      if (daily.time && Array.isArray(daily.time)) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        for (let i = 0; i < daily.time.length; i++) {
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

      const result: WeatherDataResult = {
        current,
        hourly: hourlyItems,
        daily: dailyItems,
        timezone,
      };

      // Cache for 10 minutes (600s)
      appCache.set(cacheKey, result, 600);
      return result;
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Failed to fetch weather from Open-Meteo: ${err.message}`);
    }
  }
}

export const weatherProvider: IWeatherProvider = new OpenMeteoWeatherProvider();
