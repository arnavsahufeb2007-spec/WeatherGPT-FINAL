import type { WeatherDataResult } from "./weatherProvider.js";
import { getWeatherInfo } from "./weatherCodes.js";
import type { CurrentWeatherData, HourlyForecastItem, DailyForecastItem } from "../types.js";

/** Independent fallback: MET Norway Locationforecast 2.0 (forecast, not station observations). */
function codeForSymbol(symbol: string): number {
  const s = symbol.toLowerCase();
  if (s.includes("thunder")) return 95;
  if (s.includes("snow")) return 71;
  if (s.includes("sleet")) return 66;
  if (s.includes("rain")) return s.includes("heavy") ? 65 : 61;
  if (s.includes("fog")) return 45;
  if (s.includes("cloudy")) return s.includes("partly") ? 2 : 3;
  if (s.includes("fair")) return 1;
  return 0;
}
const round = (n: number) => Math.round(n * 10) / 10;
const valid = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const num = (n: unknown, fallback = 0) => valid(n) ? n : fallback;
const dateInZone = (iso: string, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const localHour = (iso: string, tz: string) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
const dayLabel = (date: string) => new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

export async function fetchMetNorwayWeather(lat: number, lon: number, requestedTimezone = "auto"): Promise<WeatherDataResult> {
  const tz = requestedTimezone === "auto" ? "UTC" : requestedTimezone;
  // MET Norway requests a descriptive User-Agent. Set MET_NORWAY_USER_AGENT with a contact URL/email for production.
  const agent = process.env.MET_NORWAY_USER_AGENT || "WeatherGPT/1.0 (https://github.com/arnavsahufeb2007-spec/WeatherGPT-FINAL)";
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let raw: any;
  try {
    const response = await fetch(url, { headers: { "User-Agent": agent, "Accept": "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`MET Norway HTTP ${response.status}`);
    raw = await response.json();
  } finally {
    clearTimeout(timeout);
  }
  const series: any[] = raw?.properties?.timeseries;
  if (!Array.isArray(series) || !series.length) throw new Error("MET Norway response missing timeseries");
  const future = series.filter(x => new Date(x.time).getTime() >= Date.now() - 3600000);
  if (!future.length) throw new Error("MET Norway forecast contains no current period");
  const details = (x: any) => x?.data?.instant?.details || {};
  const symbol = (x: any) => x?.data?.next_1_hours?.summary?.symbol_code || x?.data?.next_6_hours?.summary?.symbol_code || "";
  const precipitation = (x: any) => num(x?.data?.next_1_hours?.details?.precipitation_amount);
  const first = future[0];
  const firstDetails = details(first);
  if (!valid(firstDetails.air_temperature)) throw new Error("MET Norway missing essential air temperature");
  const firstCode = codeForSymbol(symbol(first));
  const temperature = round(firstDetails.air_temperature);
  const humidity = valid(firstDetails.relative_humidity) ? Math.round(firstDetails.relative_humidity) : null;
  const windSpeed = round(num(firstDetails.wind_speed) * 3.6); // m/s -> km/h
  const current: CurrentWeatherData = {
    time: first.time, temperature,
    feelsLike: temperature, // MET compact does not provide apparent temperature
    humidity,
    precipitation: round(precipitation(first)), rain: round(precipitation(first)),
    precipitationProbability: 0, // unavailable in MET compact; not a measured 0% chance
    weatherCode: firstCode, condition: getWeatherInfo(firstCode).condition,
    windSpeed, windDirection: Math.round(num(firstDetails.wind_from_direction)),
    windGusts: round(num(firstDetails.wind_speed_of_gust, num(firstDetails.wind_speed)) * 3.6),
    windGust: round(num(firstDetails.wind_speed_of_gust, num(firstDetails.wind_speed)) * 3.6),
    cloudCover: Math.round(num(firstDetails.cloud_area_fraction)),
    uvIndex: 0, // unavailable in MET compact
    visibility: null, pressure: valid(firstDetails.air_pressure_at_sea_level) ? Math.round(firstDetails.air_pressure_at_sea_level) : null,
    dewPoint: valid(firstDetails.dew_point_temperature) ? round(firstDetails.dew_point_temperature) : undefined,
    isDay: localHour(first.time, tz) >= 6 && localHour(first.time, tz) < 18, // approximate; not astronomical sunrise/sunset
    sunrise: "", sunset: ""
  };
  const hourly: HourlyForecastItem[] = future.slice(0, 24).map((x, i) => {
    const d = details(x);
    if (!valid(d.air_temperature)) throw new Error("MET Norway hourly temperature missing");
    const code = codeForSymbol(symbol(x));
    const hour = localHour(x.time, tz);
    return {
      time: x.time, formattedTime: i === 0 ? "Now" : `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`,
      temperature: round(d.air_temperature), feelsLike: round(d.air_temperature),
      precipitationProbability: 0, precipitation: round(precipitation(x)), rain: round(precipitation(x)),
      weatherCode: code, condition: getWeatherInfo(code).condition,
      windSpeed: round(num(d.wind_speed) * 3.6), uvIndex: 0,
      humidity: valid(d.relative_humidity) ? Math.round(d.relative_humidity) : null
    };
  });
  const groups = new Map<string, any[]>();
  for (const x of future) {
    const date = dateInZone(x.time, tz);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(x);
  }
  const daily: DailyForecastItem[] = [...groups.entries()].slice(0, 7).map(([date, points], i) => {
    const temps = points.map(x => details(x).air_temperature).filter(valid);
    if (!temps.length) throw new Error("MET Norway daily temperature missing");
    const winds = points.map(x => num(details(x).wind_speed) * 3.6);
    const mid = points.find(x => localHour(x.time, tz) >= 12) || points[0];
    const code = codeForSymbol(symbol(mid));
    return {
      date, formattedDate: new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      dayName: i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayLabel(date),
      tempMax: round(Math.max(...temps)), tempMin: round(Math.min(...temps)),
      precipitationProbabilityMax: 0, rainSum: round(points.reduce((sum, x) => sum + precipitation(x), 0)),
      weatherCode: code, condition: getWeatherInfo(code).condition, uvIndexMax: 0,
      windSpeedMax: round(Math.max(...winds)), sunrise: "", sunset: ""
    };
  });
  return { current, hourly, daily, timezone: tz, source: "met-norway", fetchedAt: new Date().toISOString(), isStale: false, unavailableMetrics: ["precipitationProbability", "uvIndex", "feelsLike", "sunrise", "sunset", "visibility"] };
}
