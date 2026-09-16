import { LocationInfo } from "../types.js";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";
import { savedLocationsService } from "./savedLocationsService.js";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  isGuest: boolean;
  plan: "Free" | "Pro";
  savedLocations: LocationInfo[];
  joinedDate: string;
}

export const DEFAULT_GUEST_USER: UserProfile = {
  id: "guest-user",
  name: "Guest Explorer",
  email: "guest@weathergpt.local",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  isGuest: true,
  plan: "Free",
  savedLocations: [],
  joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
};

class AuthService {
  private currentUser: UserProfile | null = null;
  private listeners: Set<(user: UserProfile | null) => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.currentUser = { ...DEFAULT_GUEST_USER };
    this.init();
  }

  private async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // First load guest saved locations
    const guestLocs = await savedLocationsService.getSavedLocations("guest-user", true);
    if (this.currentUser && this.currentUser.isGuest) {
      this.currentUser.savedLocations = guestLocs;
      this.notify();
    }

    if (!isSupabaseConfigured()) {
      return;
    }

    const client = getSupabase();
    if (!client) return;

    try {
      // Check existing Supabase session
      const { data: { session }, error } = await client.auth.getSession();
      if (!error && session?.user) {
        await this.handleUserSession(session.user);
      }

      // Listen to auth state changes (sign in, sign out, token refresh)
      client.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          await this.handleUserSession(session.user);
        } else if (event === "SIGNED_OUT") {
          this.currentUser = { ...DEFAULT_GUEST_USER };
          const locs = await savedLocationsService.getSavedLocations("guest-user", true);
          this.currentUser.savedLocations = locs;
          this.notify();
        }
      });
    } catch (err) {
      console.warn("Error initializing Supabase session:", err);
    }
  }

  private async handleUserSession(user: any) {
    const userId = user.id;
    const email = user.email || "";
    const meta = user.user_metadata || {};
    const namePart = meta.full_name || meta.name || email.split("@")[0] || "User";
    const avatar = meta.avatar_url || meta.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(namePart)}`;
    const joined = user.created_at
      ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });

    // Sync profile to public.profiles
    const client = getSupabase();
    let displayName = namePart;
    let plan: "Free" | "Pro" = "Free";

    if (client) {
      try {
        const { data: profile } = await client
          .from("profiles")
          .select("display_name, avatar_url, plan")
          .eq("id", userId)
          .maybeSingle();

        if (profile) {
          if (profile.display_name) displayName = profile.display_name;
          if (profile.plan === "Pro") plan = "Pro";
        } else {
          // Provision profile
          await client.from("profiles").upsert(
            {
              id: userId,
              email,
              display_name: displayName,
              avatar_url: avatar,
              plan: "Free",
            },
            { onConflict: "id" }
          );
        }
      } catch (err) {
        console.warn("Could not sync public.profiles:", err);
      }
    }

    // Load saved locations from Supabase
    const savedLocs = await savedLocationsService.getSavedLocations(userId, false);

    // Sync any leftover guest favorites to cloud
    await savedLocationsService.syncGuestLocationsToCloud(userId);
    const updatedLocs = await savedLocationsService.getSavedLocations(userId, false);

    this.currentUser = {
      id: userId,
      name: displayName,
      email,
      avatarUrl: avatar,
      isGuest: false,
      plan,
      savedLocations: updatedLocs.length > 0 ? updatedLocs : savedLocs,
      joinedDate: joined,
    };

    this.notify();
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.currentUser));
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public subscribe(listener: (user: UserProfile | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => this.listeners.delete(listener);
  }

  /**
   * Real Google OAuth through Supabase Auth
   */
  /**
   * Resolves the environment-aware post-login redirect origin.
   * Uses the current browser/runtime origin instead of hardcoding localhost.
   */
  public getRedirectOrigin(): string {
    const runtimeUrl =
      (typeof process !== "undefined" && process.env?.APP_URL) ||
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_APP_URL) ||
      "";

    if (typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null") {
      // If running inside the container where window.location.origin is localhost,
      // prefer the runtime APP_URL if available.
      if (window.location.origin.includes("localhost") && runtimeUrl && runtimeUrl.startsWith("https://")) {
        return runtimeUrl;
      }
      return window.location.origin;
    }

    if (runtimeUrl && runtimeUrl.startsWith("https://")) {
      return runtimeUrl;
    }

    return "";
  }

  /**
   * Initiates Google OAuth authentication via Supabase.
   */
  public async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: "Supabase configuration is required for Google OAuth. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your settings.",
      };
    }

    const client = getSupabase();
    if (!client) {
      return { success: false, error: "Supabase client is not available." };
    }

    const redirectUrl = this.getRedirectOrigin();
    const isInsideIframe = typeof window !== "undefined" && window.self !== window.top;

    try {
      if (isInsideIframe) {
        // AI Studio Preview is in an iframe. Use popup flow with provider URL directly.
        const { data, error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (!data?.url) {
          return { success: false, error: "Failed to generate Google OAuth authorization URL." };
        }

        // Open popup
        const authWindow = window.open(
          data.url,
          "supabase_google_oauth",
          "width=600,height=700,status=no,toolbar=no,menubar=no"
        );

        if (!authWindow) {
          return {
            success: false,
            error: "Popup was blocked by your browser. Please allow popups for this site to continue with Google.",
          };
        }

        return new Promise((resolve) => {
          let hasResolved = false;

          const finishSuccess = async () => {
            if (hasResolved) return;
            hasResolved = true;
            window.removeEventListener("message", messageListener);
            clearInterval(checkClosed);

            const { data: sessData } = await client.auth.getSession();
            if (sessData.session?.user) {
              await this.handleUserSession(sessData.session.user);
            }
            resolve({ success: true });
          };

          const messageListener = async (event: MessageEvent) => {
            if (event.data?.type === "SUPABASE_AUTH_SUCCESS") {
              // If hash contains tokens, ensure session is set in opener without logging sensitive credentials
              if (event.data?.hash) {
                try {
                  const hashParams = new URLSearchParams(event.data.hash.replace(/^#/, ""));
                  const accessToken = hashParams.get("access_token");
                  const refreshToken = hashParams.get("refresh_token");
                  if (accessToken && refreshToken) {
                    await client.auth.setSession({
                      access_token: accessToken,
                      refresh_token: refreshToken,
                    });
                  }
                } catch {
                  // Fall back to getSession() in finishSuccess
                }
              }
              await finishSuccess();
            }
          };
          window.addEventListener("message", messageListener);

          // Fallback interval check if popup closed
          const checkClosed = setInterval(async () => {
            if (authWindow.closed) {
              clearInterval(checkClosed);
              window.removeEventListener("message", messageListener);
              setTimeout(async () => {
                if (hasResolved) return;
                const { data: sessData } = await client.auth.getSession();
                if (sessData.session?.user) {
                  await this.handleUserSession(sessData.session.user);
                  hasResolved = true;
                  resolve({ success: true });
                } else if (this.currentUser && !this.currentUser.isGuest) {
                  hasResolved = true;
                  resolve({ success: true });
                } else {
                  hasResolved = true;
                  resolve({ success: false, error: "Google sign-in was closed or cancelled." });
                }
              }, 300);
            }
          }, 1000);
        });
      } else {
        // Direct browser redirect
        const { error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl,
          },
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      return { success: false, error: err.message || "An unexpected error occurred during Google sign-in." };
    }
  }

  /**
   * Sign out and revert to guest mode
   */
  public async logout(): Promise<void> {
    const client = getSupabase();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn("Supabase signOut error:", err);
      }
    }
    this.currentUser = { ...DEFAULT_GUEST_USER };
    const locs = await savedLocationsService.getSavedLocations("guest-user", true);
    this.currentUser.savedLocations = locs;
    this.notify();
  }

  /**
   * Toggle location saved/favorite status
   */
  public async toggleFavoriteLocation(loc: LocationInfo): Promise<boolean> {
    if (!this.currentUser) return false;

    const isCurrentlySaved = this.isLocationFavorited(loc);
    const userId = this.currentUser.id;
    const isGuest = this.currentUser.isGuest;

    if (isCurrentlySaved) {
      await savedLocationsService.removeLocation(userId, isGuest, loc);
      this.currentUser.savedLocations = this.currentUser.savedLocations.filter(
        (l) => !(Math.abs(l.latitude - loc.latitude) < 0.05 && Math.abs(l.longitude - loc.longitude) < 0.05)
      );
      this.notify();
      return false;
    } else {
      await savedLocationsService.saveLocation(userId, isGuest, loc);
      this.currentUser.savedLocations.push(loc);
      this.notify();
      return true;
    }
  }

  public isLocationFavorited(loc: LocationInfo): boolean {
    if (!this.currentUser || !this.currentUser.savedLocations) return false;
    return this.currentUser.savedLocations.some(
      (l) => Math.abs(l.latitude - loc.latitude) < 0.05 && Math.abs(l.longitude - loc.longitude) < 0.05
    );
  }

  /**
   * Update profile display name
   */
  public async updateDisplayName(newName: string): Promise<boolean> {
    if (!this.currentUser || this.currentUser.isGuest || !newName.trim()) {
      return false;
    }

    const client = getSupabase();
    if (!client) return false;

    try {
      const { error } = await client
        .from("profiles")
        .update({ display_name: newName.trim(), updated_at: new Date().toISOString() })
        .eq("id", this.currentUser.id);

      if (error) {
        console.warn("Failed to update profile name:", error.message);
        return false;
      }

      this.currentUser.name = newName.trim();
      this.notify();
      return true;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();
