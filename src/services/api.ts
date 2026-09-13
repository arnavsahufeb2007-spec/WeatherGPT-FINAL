import {
  ActivityAnalysis,
  ActivityType,
  ComparisonAnalysis,
  ConversationContext,
  CurrentWeatherData,
  DailyForecastItem,
  HourlyForecastItem,
  LocationInfo,
  NasaEnvironmentalData,
  TravelAnalysis,
  WeatherAdvisory,
  WeatherAnalysis,
} from "../types.js";

export interface QueryWeatherResult {
  success: boolean;
  reply: string;
  language: string;
  intent: string;
  isAIGenerated: boolean;
  fallbackUsed: boolean;
  context: ConversationContext;
  data: {
    location?: LocationInfo;
    current?: CurrentWeatherData;
    hourly?: HourlyForecastItem[];
    daily?: DailyForecastItem[];
    analysis?: WeatherAnalysis;
    advisories?: WeatherAdvisory[];
    activity?: ActivityAnalysis;
    comparison?: ComparisonAnalysis;
    travel?: TravelAnalysis;
    nasa?: NasaEnvironmentalData;
  };
}

export async function queryWeatherAPI(
  message: string,
  context?: ConversationContext,
  preferredLanguage?: string,
  location?: LocationInfo,
  locationVersion?: number
): Promise<QueryWeatherResult> {
  const res = await fetch("/api/weather/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context, preferredLanguage, location, locationVersion }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Query failed (${res.status}): ${errorText}`);
  }

  return res.json();
}

export async function getBhashiniStatusAPI(): Promise<{
  enabled: boolean;
  configured: boolean;
  provider: string;
  supportedIndianLanguages: string[];
  features: Record<string, boolean>;
}> {
  try {
    const res = await fetch("/api/bhashini/status");
    if (!res.ok) return { enabled: false, configured: false, provider: "bhashini", supportedIndianLanguages: [], features: {} };
    return res.json();
  } catch {
    return { enabled: false, configured: false, provider: "bhashini", supportedIndianLanguages: [], features: {} };
  }
}

export async function searchLocationsAPI(query: string, count: number = 10): Promise<LocationInfo[]> {
  if (!query.trim()) return [];
  const res = await fetch(`/api/location/search?q=${encodeURIComponent(query)}&count=${count}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Geocoding request failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.locations || [];
}

export async function getCurrentWeatherAPI(
  params: { lat?: number; lon?: number; location?: string; timezone?: string }
): Promise<{ location: LocationInfo; current: CurrentWeatherData; analysis: WeatherAnalysis; advisories: WeatherAdvisory[] }> {
  const q = new URLSearchParams();
  if (params.lat !== undefined) q.set("lat", String(params.lat));
  if (params.lon !== undefined) q.set("lon", String(params.lon));
  if (params.location) q.set("location", params.location);
  if (params.timezone) q.set("timezone", params.timezone);

  const res = await fetch(`/api/weather/current?${q.toString()}`);
  if (!res.ok) throw new Error("Failed to load current weather");
  const data = await res.json();
  return data;
}

export async function getHourlyWeatherAPI(lat: number, lon: number, timezone?: string): Promise<HourlyForecastItem[]> {
  const q = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (timezone) q.set("timezone", timezone);
  const res = await fetch(`/api/weather/hourly?${q.toString()}`);
  if (!res.ok) throw new Error("Failed to load hourly forecast");
  const data = await res.json();
  return data.hourly || [];
}

export async function getDailyWeatherAPI(lat: number, lon: number, timezone?: string): Promise<DailyForecastItem[]> {
  const q = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (timezone) q.set("timezone", timezone);
  const res = await fetch(`/api/weather/daily?${q.toString()}`);
  if (!res.ok) throw new Error("Failed to load daily forecast");
  const data = await res.json();
  return data.daily || [];
}

export async function analyzeActivityAPI(
  activity: ActivityType,
  location?: string,
  lat?: number,
  lon?: number
): Promise<{ location: LocationInfo; currentWeather: CurrentWeatherData; activityAnalysis: ActivityAnalysis }> {
  const res = await fetch("/api/activity/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activity, location, lat, lon }),
  });
  if (!res.ok) throw new Error("Failed to analyze activity");
  return res.json();
}

export async function compareLocationsAPI(locations: (string | LocationInfo)[]): Promise<ComparisonAnalysis> {
  const res = await fetch("/api/comparison/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locations }),
  });
  if (!res.ok) throw new Error("Failed to analyze location comparison");
  const data = await res.json();
  return data.comparison;
}

export async function analyzeTravelAPI(
  origin: string | LocationInfo,
  destination: string | LocationInfo,
  mode: string = "car"
): Promise<TravelAnalysis> {
  const res = await fetch("/api/travel/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination, mode }),
  });
  if (!res.ok) throw new Error("Failed to analyze travel route weather");
  const data = await res.json();
  return data.travel;
}

export async function getNasaEnvironmentalAPI(
  lat: number,
  lon: number,
  currentTemp?: number,
  radius?: number
): Promise<NasaEnvironmentalData> {
  const q = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (currentTemp !== undefined) q.set("currentTemp", String(currentTemp));
  if (radius !== undefined) q.set("radius", String(radius));

  const res = await fetch(`/api/nasa/environmental?${q.toString()}`);
  if (!res.ok) {
    throw new Error(`NASA Environmental request failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.nasa;
}

