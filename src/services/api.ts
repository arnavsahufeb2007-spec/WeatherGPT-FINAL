import {
  ActivityAnalysis,
  ActivityType,
  ComparisonAnalysis,
  ConversationContext,
  CurrentWeatherData,
  DailyForecastItem,
  HourlyForecastItem,
  LocationInfo,
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

// Fast in-memory client cache with TTL & in-flight deduplication
const clientSearchCache = new Map<string, { data: LocationInfo[]; expires: number }>();
const clientWeatherCache = new Map<string, { data: any; expires: number }>();
const inFlightRequests = new Map<string, Promise<any>>();

export async function searchLocationsAPI(query: string, count: number = 10): Promise<LocationInfo[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const cacheKey = `${trimmed}_${count}`;
  const now = Date.now();
  const cached = clientSearchCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`/api/location/search?q=${encodeURIComponent(query.trim())}&count=${count}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Geocoding request failed with status ${res.status}`);
      }
      const data = await res.json();
      const locations = data.locations || [];
      // Cache client-side for 5 minutes (300,000ms)
      clientSearchCache.set(cacheKey, { data: locations, expires: Date.now() + 300000 });
      return locations;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export async function getCurrentWeatherAPI(
  params: { lat?: number; lon?: number; location?: string; timezone?: string }
): Promise<{
  location: LocationInfo;
  current: CurrentWeatherData;
  hourly?: HourlyForecastItem[];
  daily?: DailyForecastItem[];
  analysis: WeatherAnalysis;
  advisories: WeatherAdvisory[];
}> {
  const q = new URLSearchParams();
  if (params.lat !== undefined) q.set("lat", String(params.lat));
  if (params.lon !== undefined) q.set("lon", String(params.lon));
  if (params.location) q.set("location", params.location);
  if (params.timezone) q.set("timezone", params.timezone);

  const cacheKey = `curr_${q.toString()}`;
  const now = Date.now();
  const cached = clientWeatherCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`/api/weather/current?${q.toString()}`);
      if (!res.ok) throw new Error("Failed to load current weather");
      const data = await res.json();
      // Cache client-side for 2 minutes (120,000ms)
      clientWeatherCache.set(cacheKey, { data, expires: Date.now() + 120000 });
      return data;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export async function getHourlyWeatherAPI(lat: number, lon: number, timezone?: string): Promise<HourlyForecastItem[]> {
  const q = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (timezone) q.set("timezone", timezone);

  const cacheKey = `hourly_${q.toString()}`;
  const now = Date.now();
  const cached = clientWeatherCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`/api/weather/hourly?${q.toString()}`);
      if (!res.ok) throw new Error("Failed to load hourly forecast");
      const data = await res.json();
      const items = data.hourly || [];
      clientWeatherCache.set(cacheKey, { data: items, expires: Date.now() + 120000 });
      return items;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export async function getDailyWeatherAPI(lat: number, lon: number, timezone?: string): Promise<DailyForecastItem[]> {
  const q = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (timezone) q.set("timezone", timezone);

  const cacheKey = `daily_${q.toString()}`;
  const now = Date.now();
  const cached = clientWeatherCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`/api/weather/daily?${q.toString()}`);
      if (!res.ok) throw new Error("Failed to load daily forecast");
      const data = await res.json();
      const items = data.daily || [];
      clientWeatherCache.set(cacheKey, { data: items, expires: Date.now() + 120000 });
      return items;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
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

export async function compareLocationsAPI(
  locations: (string | LocationInfo)[],
  timeContext?: { isTomorrow?: boolean; isDayAfterTomorrow?: boolean }
): Promise<ComparisonAnalysis> {
  const res = await fetch("/api/comparison/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locations, timeContext }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to analyze location comparison");
  }
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

export async function localizeWeatherMessageAPI(params: {
  text?: string;
  data?: any;
  location?: LocationInfo;
  targetLanguage: string;
  userQuery?: string;
}): Promise<{ success: boolean; text: string; language: string }> {
  const res = await fetch("/api/weather/localize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Localization failed (${res.status}): ${errorText}`);
  }
  return res.json();
}


