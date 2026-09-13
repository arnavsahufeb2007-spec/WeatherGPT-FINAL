import { NasaClimateContext, NasaEnvironmentalData, NasaNaturalEvent } from "../types.js";

/**
 * NASA Earth Observation & Environmental Intelligence Service
 * 
 * ARCHITECTURAL PRINCIPLES:
 * 1. Open-Meteo is the primary and sole source of live forecast and current weather data.
 * 2. NASA EONET provides near-real-time natural hazard and severe environmental event tracking
 *    (wildfires, severe storms, dust/haze, volcanic ash) updated every 1-6 hours by NASA analysts.
 * 3. NASA POWER provides 20-30 year historical climatological baseline normals (MERRA-2)
 *    and solar irradiance (kWh/m²/day). It is strictly labeled as historical climatology.
 * 4. This service is fully modular: it can fail softly, be disabled, or operate in fallback mode
 *    without disrupting the core WeatherGPT forecasting engine.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const EONET_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache
const POWER_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours cache (climatology is static)

let cachedEonetEvents: CacheEntry<any[]> | null = null;
const powerClimatologyCache = new Map<string, CacheEntry<any>>();

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTH_FULL_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Calculate Great-Circle Haversine distance between two coordinate pairs in kilometers.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Fetch raw open events from NASA EONET v3.0 API with caching and timeout.
 */
async function fetchRawEonetEvents(): Promise<any[]> {
  const now = Date.now();
  if (cachedEonetEvents && now - cachedEonetEvents.timestamp < EONET_CACHE_TTL_MS) {
    return cachedEonetEvents.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30";
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "WeatherGPT-NASA-Intelligence/1.0",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`NASA EONET responded with HTTP ${res.status}`);
    }

    const json: any = await res.json();
    const events = Array.isArray(json?.events) ? json.events : [];
    cachedEonetEvents = { data: events, timestamp: now };
    return events;
  } catch (err: any) {
    clearTimeout(timeout);
    // If cached data is available even if slightly stale, return it on error
    if (cachedEonetEvents) {
      return cachedEonetEvents.data;
    }
    console.warn("NASA EONET API unavailable, continuing without hazard events:", err.message);
    return [];
  }
}

/**
 * Query NASA EONET events within a geographic radius of a target coordinate.
 */
export async function getNearbyNasaEvents(
  lat: number,
  lon: number,
  radiusKm = 1200
): Promise<{ events: NasaNaturalEvent[]; summary: string }> {
  const rawEvents = await fetchRawEonetEvents();
  const matched: NasaNaturalEvent[] = [];

  for (const ev of rawEvents) {
    if (!ev.geometry || !Array.isArray(ev.geometry) || ev.geometry.length === 0) {
      continue;
    }

    // Latest observation point is typically the last element
    const latestGeom = ev.geometry[ev.geometry.length - 1];
    if (!latestGeom || !Array.isArray(latestGeom.coordinates)) {
      continue;
    }

    // EONET GeoJSON Point is [longitude, latitude]
    const evLon = typeof latestGeom.coordinates[0] === "number" ? latestGeom.coordinates[0] : NaN;
    const evLat = typeof latestGeom.coordinates[1] === "number" ? latestGeom.coordinates[1] : NaN;

    if (isNaN(evLat) || isNaN(evLon)) {
      continue;
    }

    const dist = haversineDistanceKm(lat, lon, evLat, evLon);
    if (dist <= radiusKm) {
      const primaryCat = ev.categories?.[0] || { id: "general", title: "Natural Hazard" };
      matched.push({
        id: String(ev.id || ""),
        title: String(ev.title || "Unspecified Event"),
        category: String(primaryCat.id || "general"),
        categoryTitle: String(primaryCat.title || "Natural Hazard"),
        distanceKm: dist,
        latitude: evLat,
        longitude: evLon,
        date: String(latestGeom.date || ""),
        sources: Array.isArray(ev.sources)
          ? ev.sources.map((s: any) => ({ id: String(s.id || ""), url: String(s.url || "") }))
          : [],
      });
    }
  }

  // Sort by nearest to target location
  matched.sort((a, b) => a.distanceKm - b.distanceKm);

  let summary = "";
  if (matched.length === 0) {
    summary = `No active severe natural hazard events (wildfires, cyclones, volcanic plumes) detected by NASA Earth Observatory within ${radiusKm} km.`;
  } else {
    const nearest = matched[0];
    summary = `${matched.length} active NASA Earth Observatory event${matched.length > 1 ? "s" : ""} identified within ${radiusKm} km. Nearest: ${nearest.title} (${nearest.categoryTitle}, ~${nearest.distanceKm} km away).`;
  }

  return {
    events: matched.slice(0, 6), // Top 6 most proximal
    summary,
  };
}

/**
 * Fetch 20-year climatological baseline normals from NASA POWER API.
 */
export async function getNasaPowerClimatology(
  lat: number,
  lon: number,
  currentTempC?: number
): Promise<NasaClimateContext | null> {
  const cacheKey = `${lat.toFixed(1)},${lon.toFixed(1)}`;
  const now = Date.now();

  const cached = powerClimatologyCache.get(cacheKey);
  if (cached && now - cached.timestamp < POWER_CACHE_TTL_MS) {
    return enrichClimateContext(cached.data, currentTempC);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon.toFixed(2)}&latitude=${lat.toFixed(2)}&format=JSON`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "WeatherGPT-NASA-Intelligence/1.0",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`NASA POWER API HTTP ${res.status}`);
    }

    const json: any = await res.json();
    const t2m = json?.properties?.parameter?.T2M;
    const solar = json?.properties?.parameter?.ALLSKY_SFC_SW_DWN;

    if (!t2m || !solar) {
      throw new Error("Invalid payload structure from NASA POWER");
    }

    const currentMonthIdx = new Date().getMonth(); // 0 - 11
    const monthKey = MONTH_NAMES[currentMonthIdx];
    const historicalNormalTempC = typeof t2m[monthKey] === "number" ? Math.round(t2m[monthKey] * 10) / 10 : 25;
    const solarKwh = typeof solar[monthKey] === "number" ? Math.round(solar[monthKey] * 100) / 100 : 5.0;

    const baseData: Omit<NasaClimateContext, "currentTempDeltaC"> = {
      month: MONTH_FULL_NAMES[currentMonthIdx],
      monthIndex: currentMonthIdx,
      historicalNormalTempC,
      allSkySolarIrradianceKwhM2Day: solarKwh,
      dataset: "NASA POWER MERRA-2 / SYN1DEG 20-Year Baseline (2001-2020)",
      temporalLabel: "Historical Climatological Baseline (20-Year Monthly Average)",
    };

    powerClimatologyCache.set(cacheKey, { data: baseData, timestamp: now });
    return enrichClimateContext(baseData, currentTempC);
  } catch (err: any) {
    clearTimeout(timeout);
    console.warn("NASA POWER Climatology unavailable, continuing without climate baseline:", err.message);
    return null;
  }
}

function enrichClimateContext(
  base: Omit<NasaClimateContext, "currentTempDeltaC">,
  currentTempC?: number
): NasaClimateContext {
  let delta: number | undefined = undefined;
  if (typeof currentTempC === "number" && !isNaN(currentTempC)) {
    delta = Math.round((currentTempC - base.historicalNormalTempC) * 10) / 10;
  }
  return {
    ...base,
    currentTempDeltaC: delta,
  };
}

/**
 * Main entry point: Get aggregated NASA Environmental Intelligence Layer.
 * Gracefully degrades if disabled or unavailable.
 */
export async function getNasaEnvironmentalData(
  lat: number,
  lon: number,
  currentTempC?: number,
  radiusKm = 1200
): Promise<NasaEnvironmentalData> {
  const isEnabled = process.env.ENABLE_NASA_DATA !== "false";
  if (!isEnabled) {
    return {
      status: "unavailable",
      provider: "NASA Earth Observation & POWER (Disabled)",
      radiusKm,
      naturalEvents: {
        count: 0,
        events: [],
        summary: "NASA Environmental layer is disabled.",
        temporalLabel: "Near-Real-Time Curation",
      },
    };
  }

  // Execute both queries concurrently with graceful degradation
  const [eventsResult, climateResult] = await Promise.allSettled([
    getNearbyNasaEvents(lat, lon, radiusKm),
    getNasaPowerClimatology(lat, lon, currentTempC),
  ]);

  const naturalEvents =
    eventsResult.status === "fulfilled"
      ? {
          count: eventsResult.value.events.length,
          events: eventsResult.value.events,
          summary: eventsResult.value.summary,
          temporalLabel: "Near-Real-Time Curation (NASA EONET, updated every 1-6 hours)",
        }
      : {
          count: 0,
          events: [],
          summary: "NASA EONET service temporarily unreachable.",
          temporalLabel: "Near-Real-Time Curation",
        };

  const climateContext =
    climateResult.status === "fulfilled" && climateResult.value ? climateResult.value : undefined;

  return {
    status: "available",
    provider: "NASA Earth Observatory (EONET v3) & NASA POWER",
    radiusKm,
    naturalEvents,
    climateContext,
  };
}
