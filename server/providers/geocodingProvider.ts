import { LocationInfo } from "../types.js";
import { appCache } from "../cache.js";

export interface IGeocodingProvider {
  searchLocations(query: string, count?: number): Promise<LocationInfo[]>;
  resolveLocation(query: string): Promise<LocationInfo | null>;
}

// Common state/territory abbreviations for enhanced geocoding qualifier matching
const STATE_ABBREVIATIONS: Record<string, string> = {
  // US States
  al: "alabama", ak: "alaska", az: "arizona", ar: "arkansas", ca: "california",
  co: "colorado", ct: "connecticut", de: "delaware", fl: "florida", ga: "georgia",
  hi: "hawaii", id: "idaho", il: "illinois", in: "indiana", ia: "iowa",
  ks: "kansas", ky: "kentucky", la: "louisiana", me: "maine", md: "maryland",
  ma: "massachusetts", mi: "michigan", mn: "minnesota", ms: "mississippi", mo: "missouri",
  mt: "montana", ne: "nebraska", nv: "nevada", nh: "new hampshire", nj: "new jersey",
  nm: "new mexico", ny: "new york", nc: "north carolina", nd: "north dakota", oh: "ohio",
  ok: "oklahoma", or: "oregon", pa: "pennsylvania", ri: "rhode island", sc: "south carolina",
  sd: "south dakota", tn: "tennessee", tx: "texas", ut: "utah", vt: "vermont",
  va: "virginia", wa: "washington", wv: "west virginia", wi: "wisconsin", wy: "wyoming",
  dc: "district of columbia",
  // Common country aliases
  uk: "united kingdom", usa: "united states", uae: "united arab emirates",
};

export class OpenMeteoGeocodingProvider implements IGeocodingProvider {
  private baseUrl = "https://geocoding-api.open-meteo.com/v1/search";

  private parseApiResults(results: any[]): LocationInfo[] {
    if (!Array.isArray(results)) return [];
    return results.map((item: any) => ({
      name: item.name,
      country: item.country || "",
      countryCode: item.country_code ? String(item.country_code).toUpperCase() : undefined,
      admin1: item.admin1 || "",
      admin2: item.admin2 || "",
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone || "UTC",
      elevation: item.elevation,
      postcodes: Array.isArray(item.postcodes) ? item.postcodes : [],
      population: item.population,
      featureCode: item.feature_code,
    }));
  }

  private async fetchFromOpenMeteo(searchTerm: string, count: number): Promise<LocationInfo[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const url = `${this.baseUrl}?name=${encodeURIComponent(searchTerm)}&count=${count}&language=en&format=json`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Open-Meteo Geocoding API returned status ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.results) {
        return [];
      }

      return this.parseApiResults(data.results);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error("Geocoding request timed out. Please try again.");
      }
      throw err;
    }
  }

  /**
   * Search for locations worldwide using Open-Meteo Geocoding API.
   * Handles:
   * - Pure city / town / region names (e.g., "Tokyo", "London", "Pune")
   * - City + state (e.g., "Paris, Texas", "Springfield, IL", "Pune, Maharashtra")
   * - City + country (e.g., "London, Canada", "Perth, Australia", "Cambridge, UK")
   * - Postal codes (e.g., "90210", "75001")
   */
  async searchLocations(query: string, count: number = 10): Promise<LocationInfo[]> {
    const rawTrimmed = query.trim();
    if (!rawTrimmed) return [];

    const cacheKey = `geo_dyn_${rawTrimmed.toLowerCase()}_${count}`;
    const cached = appCache.get<LocationInfo[]>(cacheKey);
    if (cached) return cached;

    // 1. Direct query to Open-Meteo Geocoding API
    let results = await this.fetchFromOpenMeteo(rawTrimmed, count);

    // 2. If no direct results and query has a comma (e.g., "Paris, Texas" or "Springfield, IL" or "London, UK")
    if (results.length === 0 && rawTrimmed.includes(",")) {
      const segments = rawTrimmed.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (segments.length >= 2) {
        const placeName = segments[0];
        const qualifier = segments.slice(1).join(" ");
        const resolvedQualifier = STATE_ABBREVIATIONS[qualifier] || qualifier;

        // Search for primary place name
        const rawMatches = await this.fetchFromOpenMeteo(placeName, Math.max(count, 15));

        // Filter and sort by qualifier
        const matched = rawMatches.filter((item) => {
          const admin1 = (item.admin1 || "").toLowerCase();
          const admin2 = (item.admin2 || "").toLowerCase();
          const country = (item.country || "").toLowerCase();
          const countryCode = (item.countryCode || "").toLowerCase();

          return (
            admin1.includes(qualifier) ||
            admin1.includes(resolvedQualifier) ||
            admin2.includes(qualifier) ||
            country.includes(qualifier) ||
            country.includes(resolvedQualifier) ||
            countryCode === qualifier ||
            countryCode === resolvedQualifier
          );
        });

        // If specific matches found for the qualifier, prioritize them
        if (matched.length > 0) {
          const otherMatches = rawMatches.filter((item) => !matched.includes(item));
          results = [...matched, ...otherMatches].slice(0, count);
        } else if (rawMatches.length > 0) {
          results = rawMatches.slice(0, count);
        }
      }
    }

    // 3. If still no results and query has spaces (e.g. "Paris Texas" or "London Canada")
    if (results.length === 0 && rawTrimmed.includes(" ")) {
      const parts = rawTrimmed.split(/\s+/);
      if (parts.length >= 2) {
        const placeName = parts[0];
        const qualifier = parts.slice(1).join(" ").toLowerCase();
        const resolvedQualifier = STATE_ABBREVIATIONS[qualifier] || qualifier;

        const rawMatches = await this.fetchFromOpenMeteo(placeName, Math.max(count, 15));
        const matched = rawMatches.filter((item) => {
          const admin1 = (item.admin1 || "").toLowerCase();
          const country = (item.country || "").toLowerCase();
          const countryCode = (item.countryCode || "").toLowerCase();
          return (
            admin1.includes(qualifier) ||
            admin1.includes(resolvedQualifier) ||
            country.includes(qualifier) ||
            country.includes(resolvedQualifier) ||
            countryCode === qualifier
          );
        });

        if (matched.length > 0) {
          results = matched.slice(0, count);
        } else if (rawMatches.length > 0) {
          results = rawMatches.slice(0, count);
        }
      }
    }

    // Cache successful dynamic results for 1 hour (3600s)
    if (results.length > 0) {
      appCache.set(cacheKey, results, 3600);
    }

    return results;
  }

  /**
   * Resolves a single location dynamically using Open-Meteo Geocoding API.
   * Returns the best match or null if not found.
   */
  async resolveLocation(query: string): Promise<LocationInfo | null> {
    const trimmed = query.trim();
    if (!trimmed) return null;

    const results = await this.searchLocations(trimmed, 5);
    return results.length > 0 ? results[0] : null;
  }
}

export const geocodingProvider: IGeocodingProvider = new OpenMeteoGeocodingProvider();
