import { LocationInfo } from "../types.js";

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

const AUTH_STORAGE_KEY = "weathergpt_user_session";

const DEFAULT_GUEST_USER: UserProfile = {
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

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        this.currentUser = JSON.parse(saved);
      } else {
        // Default to guest session for immediate usability
        this.currentUser = { ...DEFAULT_GUEST_USER };
      }
    } catch {
      this.currentUser = { ...DEFAULT_GUEST_USER };
    }
  }

  private saveSession() {
    try {
      if (this.currentUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (err) {
      console.warn("Failed to persist user session:", err);
    }
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

  public async login(email: string, _password: string): Promise<UserProfile> {
    // Generate clean username from email or capital
    const namePart = email.split("@")[0] || "User";
    const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const user: UserProfile = {
      id: `usr_${Date.now()}`,
      name: displayName,
      email: email.trim().toLowerCase(),
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`,
      isGuest: false,
      plan: "Pro",
      savedLocations: this.currentUser?.savedLocations || [],
      joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };

    this.currentUser = user;
    this.saveSession();
    return user;
  }

  public async signup(name: string, email: string, _password: string): Promise<UserProfile> {
    const user: UserProfile = {
      id: `usr_${Date.now()}`,
      name: name.trim() || "Weather Explorer",
      email: email.trim().toLowerCase(),
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || "explorer")}`,
      isGuest: false,
      plan: "Pro",
      savedLocations: this.currentUser?.savedLocations || [],
      joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };

    this.currentUser = user;
    this.saveSession();
    return user;
  }

  public loginWithDemoAccount(): UserProfile {
    const demoUser: UserProfile = {
      id: "demo_pilot",
      name: "Alex Vance",
      email: "alex.vance@weathergpt.io",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      isGuest: false,
      plan: "Pro",
      savedLocations: [
        {
          name: "New Delhi",
          country: "India",
          countryCode: "IN",
          latitude: 28.6139,
          longitude: 77.209,
          timezone: "Asia/Kolkata",
          admin1: "Delhi",
        },
        {
          name: "Tokyo",
          country: "Japan",
          countryCode: "JP",
          latitude: 35.6895,
          longitude: 139.6917,
          timezone: "Asia/Tokyo",
          admin1: "Tokyo",
        },
      ],
      joinedDate: "Jan 2026",
    };

    this.currentUser = demoUser;
    this.saveSession();
    return demoUser;
  }

  public logout(): void {
    this.currentUser = { ...DEFAULT_GUEST_USER };
    this.saveSession();
  }

  public toggleFavoriteLocation(loc: LocationInfo): boolean {
    if (!this.currentUser) return false;

    const existingIdx = this.currentUser.savedLocations.findIndex(
      (l) => Math.abs(l.latitude - loc.latitude) < 0.05 && Math.abs(l.longitude - loc.longitude) < 0.05
    );

    let isAdded = false;
    if (existingIdx >= 0) {
      this.currentUser.savedLocations.splice(existingIdx, 1);
      isAdded = false;
    } else {
      this.currentUser.savedLocations.push(loc);
      isAdded = true;
    }

    this.saveSession();
    return isAdded;
  }

  public isLocationFavorited(loc: LocationInfo): boolean {
    if (!this.currentUser || !this.currentUser.savedLocations) return false;
    return this.currentUser.savedLocations.some(
      (l) => Math.abs(l.latitude - loc.latitude) < 0.05 && Math.abs(l.longitude - loc.longitude) < 0.05
    );
  }
}

export const authService = new AuthService();
