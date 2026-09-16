import { LocationInfo } from "../types.js";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

const GUEST_LOCATIONS_KEY = "weathergpt_guest_saved_locations";

export class SavedLocationsService {
  /**
   * Load saved locations for user.
   * If authenticated, reads from Supabase `saved_locations` table.
   * If guest or Supabase unconfigured, reads from local storage.
   */
  public async getSavedLocations(userId: string, isGuest: boolean): Promise<LocationInfo[]> {
    if (isGuest || !isSupabaseConfigured()) {
      return this.getLocalSavedLocations();
    }

    const client = getSupabase();
    if (!client) return this.getLocalSavedLocations();

    try {
      const { data, error } = await client
        .from("saved_locations")
        .select("name, country, country_code, admin1, latitude, longitude, timezone")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not load saved locations from Supabase:", error.message);
        return this.getLocalSavedLocations();
      }

      return (data || []).map((row) => ({
        name: row.name,
        country: row.country || undefined,
        countryCode: row.country_code || undefined,
        admin1: row.admin1 || undefined,
        latitude: row.latitude,
        longitude: row.longitude,
        timezone: row.timezone || "UTC",
      }));
    } catch (err) {
      console.warn("Error querying saved locations:", err);
      return this.getLocalSavedLocations();
    }
  }

  /**
   * Save a location as favorite.
   */
  public async saveLocation(userId: string, isGuest: boolean, loc: LocationInfo): Promise<boolean> {
    if (isGuest || !isSupabaseConfigured()) {
      const current = this.getLocalSavedLocations();
      const exists = current.some(
        (l) => Math.abs(l.latitude - loc.latitude) < 0.05 && Math.abs(l.longitude - loc.longitude) < 0.05
      );
      if (!exists) {
        current.push(loc);
        this.setLocalSavedLocations(current);
      }
      return true;
    }

    const client = getSupabase();
    if (!client) return false;

    try {
      const { error } = await client.from("saved_locations").upsert(
        {
          user_id: userId,
          name: loc.name,
          country: loc.country || null,
          country_code: loc.countryCode || null,
          admin1: loc.admin1 || null,
          latitude: loc.latitude,
          longitude: loc.longitude,
          timezone: loc.timezone || "UTC",
        },
        { onConflict: "user_id,latitude,longitude" }
      );

      if (error) {
        console.warn("Failed to save location to Supabase:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Error in saveLocation:", err);
      return false;
    }
  }

  /**
   * Remove a saved favorite location.
   */
  public async removeLocation(userId: string, isGuest: boolean, loc: LocationInfo): Promise<boolean> {
    if (isGuest || !isSupabaseConfigured()) {
      const current = this.getLocalSavedLocations();
      const filtered = current.filter(
        (l) => !(Math.abs(l.latitude - loc.latitude) < 0.05 && Math.abs(l.longitude - loc.longitude) < 0.05)
      );
      this.setLocalSavedLocations(filtered);
      return true;
    }

    const client = getSupabase();
    if (!client) return false;

    try {
      // Find within coordinate delta
      const { error } = await client
        .from("saved_locations")
        .delete()
        .eq("user_id", userId)
        .gte("latitude", loc.latitude - 0.05)
        .lte("latitude", loc.latitude + 0.05)
        .gte("longitude", loc.longitude - 0.05)
        .lte("longitude", loc.longitude + 0.05);

      if (error) {
        console.warn("Failed to remove saved location from Supabase:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Error in removeLocation:", err);
      return false;
    }
  }

  /**
   * Migrate guest saved locations into the authenticated user's Supabase account.
   */
  public async syncGuestLocationsToCloud(userId: string): Promise<void> {
    const guestLocs = this.getLocalSavedLocations();
    if (guestLocs.length === 0 || !isSupabaseConfigured()) return;

    for (const loc of guestLocs) {
      await this.saveLocation(userId, false, loc);
    }
    // Clear local guest locations after successful sync
    this.removeStorageItem(GUEST_LOCATIONS_KEY);
  }

  private memoryStore = new Map<string, string>();

  private getStorageItem(key: string): string | null {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return this.memoryStore.get(key) || null;
      }
    }
    return this.memoryStore.get(key) || null;
  }

  private setStorageItem(key: string, val: string): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(key, val);
      } catch {
        // fallback
      }
    }
    this.memoryStore.set(key, val);
  }

  private removeStorageItem(key: string): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // fallback
      }
    }
    this.memoryStore.delete(key);
  }

  private getLocalSavedLocations(): LocationInfo[] {
    try {
      const raw = this.getStorageItem(GUEST_LOCATIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  }

  private setLocalSavedLocations(locs: LocationInfo[]): void {
    try {
      this.setStorageItem(GUEST_LOCATIONS_KEY, JSON.stringify(locs));
    } catch {
      // Ignore
    }
  }
}

export const savedLocationsService = new SavedLocationsService();
