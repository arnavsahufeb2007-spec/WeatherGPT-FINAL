import { LocationInfo } from "../types.js";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";
import {
  saveLocationToFirestore,
  removeLocationFromFirestore,
  getSavedLocationsFromFirestore,
} from "./firebase.js";

const GUEST_LOCATIONS_KEY = "weathergpt_guest_saved_locations";

export class SavedLocationsService {
  /**
   * Load saved locations for user.
   * If authenticated, checks Firestore first, then Supabase if needed.
   * If guest or remote unconfigured, reads from local storage.
   */
  public async getSavedLocations(userId: string, isGuest: boolean): Promise<LocationInfo[]> {
    if (isGuest) {
      return this.getLocalSavedLocations();
    }

    // 1. Check Firestore
    try {
      const firestoreLocs = await getSavedLocationsFromFirestore(userId);
      if (firestoreLocs && firestoreLocs.length > 0) {
        return firestoreLocs;
      }
    } catch (err) {
      console.warn("Could not load saved locations from Firestore:", err);
    }

    // 2. Fallback / Sync with Supabase if configured
    if (isSupabaseConfigured()) {
      const client = getSupabase();
      if (client) {
        try {
          const { data, error } = await client
            .from("saved_locations")
            .select("name, country, country_code, admin1, latitude, longitude, timezone")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

          if (!error && data && data.length > 0) {
            const parsed = data.map((row) => ({
              name: row.name,
              country: row.country || undefined,
              countryCode: row.country_code || undefined,
              admin1: row.admin1 || undefined,
              latitude: row.latitude,
              longitude: row.longitude,
              timezone: row.timezone || "UTC",
            }));
            // Persist to Firestore for future quick reads
            for (const loc of parsed) {
              saveLocationToFirestore(userId, loc).catch(() => {});
            }
            return parsed;
          }
        } catch (err) {
          console.warn("Error querying saved locations from Supabase:", err);
        }
      }
    }

    return this.getLocalSavedLocations();
  }

  /**
   * Save a location as favorite.
   */
  public async saveLocation(userId: string, isGuest: boolean, loc: LocationInfo): Promise<boolean> {
    if (isGuest) {
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

    let firestoreSuccess = false;
    try {
      await saveLocationToFirestore(userId, loc);
      firestoreSuccess = true;
    } catch (err) {
      console.warn("Failed to save location to Firestore:", err);
    }

    if (isSupabaseConfigured()) {
      const client = getSupabase();
      if (client) {
        try {
          await client.from("saved_locations").upsert(
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
        } catch (err) {
          console.warn("Error upserting to Supabase:", err);
        }
      }
    }

    return firestoreSuccess;
  }

  /**
   * Remove a saved favorite location.
   */
  public async removeLocation(userId: string, isGuest: boolean, loc: LocationInfo): Promise<boolean> {
    if (isGuest) {
      const current = this.getLocalSavedLocations();
      const filtered = current.filter(
        (l) => !(Math.abs(l.latitude - loc.latitude) < 0.05 && Math.abs(l.longitude - loc.longitude) < 0.05)
      );
      this.setLocalSavedLocations(filtered);
      return true;
    }

    const locId = `${loc.latitude.toFixed(4)}_${loc.longitude.toFixed(4)}`;
    try {
      await removeLocationFromFirestore(userId, locId);
    } catch (err) {
      console.warn("Failed to remove location from Firestore:", err);
    }

    if (isSupabaseConfigured()) {
      const client = getSupabase();
      if (client) {
        try {
          await client
            .from("saved_locations")
            .delete()
            .eq("user_id", userId)
            .gte("latitude", loc.latitude - 0.05)
            .lte("latitude", loc.latitude + 0.05)
            .gte("longitude", loc.longitude - 0.05)
            .lte("longitude", loc.longitude + 0.05);
        } catch (err) {
          console.warn("Error deleting from Supabase:", err);
        }
      }
    }

    return true;
  }

  /**
   * Migrate guest saved locations into the authenticated user's Firestore & Supabase account.
   */
  public async syncGuestLocationsToCloud(userId: string): Promise<void> {
    const guestLocs = this.getLocalSavedLocations();
    if (guestLocs.length === 0) return;

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
