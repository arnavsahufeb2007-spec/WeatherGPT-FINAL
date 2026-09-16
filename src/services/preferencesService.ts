import { UserPreferencesRecord } from "../types.js";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

const GUEST_PREFS_KEY = "weathergpt_guest_preferences";

export class PreferencesService {
  /**
   * Load preferences for user.
   */
  public async getPreferences(userId: string, isGuest: boolean): Promise<UserPreferencesRecord> {
    const defaultPrefs: UserPreferencesRecord = {
      user_id: userId,
      preferred_language: typeof window !== "undefined" ? localStorage.getItem("weathergpt_lang") || "en" : "en",
      is_fahrenheit: false,
      theme: typeof window !== "undefined" && localStorage.getItem("weathergpt_theme") === "light" ? "light" : "dark",
      voice_input_language: "auto",
      voice_output_language: "auto",
      auto_speak: true,
      speech_rate: 1.0,
    };

    if (isGuest || !isSupabaseConfigured()) {
      return this.getLocalPreferences(defaultPrefs);
    }

    const client = getSupabase();
    if (!client) return this.getLocalPreferences(defaultPrefs);

    try {
      const { data, error } = await client
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Could not load user preferences from Supabase:", error.message);
        return this.getLocalPreferences(defaultPrefs);
      }

      if (!data) {
        // First time initialization in cloud
        await this.savePreferences(userId, false, defaultPrefs);
        return defaultPrefs;
      }

      return {
        id: data.id,
        user_id: data.user_id,
        preferred_language: data.preferred_language || defaultPrefs.preferred_language,
        is_fahrenheit: typeof data.is_fahrenheit === "boolean" ? data.is_fahrenheit : false,
        theme: data.theme === "light" ? "light" : "dark",
        voice_input_language: data.voice_input_language || "auto",
        voice_output_language: data.voice_output_language || "auto",
        auto_speak: typeof data.auto_speak === "boolean" ? data.auto_speak : true,
        speech_rate: typeof data.speech_rate === "number" ? data.speech_rate : 1.0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (err) {
      console.warn("Error loading preferences:", err);
      return this.getLocalPreferences(defaultPrefs);
    }
  }

  /**
   * Save preferences for user.
   */
  public async savePreferences(
    userId: string,
    isGuest: boolean,
    prefs: Partial<UserPreferencesRecord>
  ): Promise<boolean> {
    if (isGuest || !isSupabaseConfigured()) {
      const current = this.getLocalPreferences({
        user_id: userId,
        preferred_language: "en",
        is_fahrenheit: false,
        theme: "dark",
        voice_input_language: "auto",
        voice_output_language: "auto",
        auto_speak: true,
        speech_rate: 1.0,
      });
      const merged = { ...current, ...prefs };
      this.setLocalPreferences(merged);
      return true;
    }

    const client = getSupabase();
    if (!client) return false;

    try {
      const { error } = await client.from("user_preferences").upsert(
        {
          user_id: userId,
          preferred_language: prefs.preferred_language,
          is_fahrenheit: prefs.is_fahrenheit,
          theme: prefs.theme,
          voice_input_language: prefs.voice_input_language,
          voice_output_language: prefs.voice_output_language,
          auto_speak: prefs.auto_speak,
          speech_rate: prefs.speech_rate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.warn("Failed to persist user preferences in Supabase:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Error saving preferences:", err);
      return false;
    }
  }

  private getLocalPreferences(fallback: UserPreferencesRecord): UserPreferencesRecord {
    try {
      const raw = localStorage.getItem(GUEST_PREFS_KEY);
      if (raw) {
        return { ...fallback, ...JSON.parse(raw) };
      }
    } catch {
      // Ignore
    }
    return fallback;
  }

  private setLocalPreferences(prefs: UserPreferencesRecord): void {
    try {
      localStorage.setItem(GUEST_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore
    }
  }
}

export const preferencesService = new PreferencesService();
