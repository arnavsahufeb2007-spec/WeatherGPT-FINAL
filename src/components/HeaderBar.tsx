import React from "react";
import {
  MapPin,
  Search,
  Navigation,
  Sun,
  Moon,
  LogIn,
  User,
  Sparkles,
  Smartphone,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { LocationInfo, CurrentWeatherData } from "../types.js";
import { UserProfile } from "../services/auth.js";
import { NavSection } from "./Sidebar.js";
import { DeviceMode } from "./DevicePreviewBar.js";
import { getLanguageConfig } from "../languages.js";

interface HeaderBarProps {
  currentSection: NavSection;
  currentLocation: LocationInfo | null;
  currentWeather: CurrentWeatherData | null;
  isFahrenheit: boolean;
  onToggleUnit: () => void;
  onOpenLocationSearch: () => void;
  onUseGeolocation: () => void;
  isDetectingLocation: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  deviceMode: DeviceMode;
  onChangeDeviceMode: (mode: DeviceMode) => void;
  preferredLanguage: string;
}

export function HeaderBar({
  currentSection,
  currentLocation,
  currentWeather,
  isFahrenheit,
  onToggleUnit,
  onOpenLocationSearch,
  onUseGeolocation,
  isDetectingLocation,
  isDark,
  onToggleTheme,
  currentUser,
  onOpenAuth,
  onOpenSettings,
  deviceMode,
  onChangeDeviceMode,
  preferredLanguage,
}: HeaderBarProps) {
  const langConfig = getLanguageConfig(preferredLanguage);

  const getSectionTitle = (sec: NavSection) => {
    switch (sec) {
      case "home":
        return "Home & Weather Intelligence";
      case "forecast":
        return "Hourly & 7-Day Forecast";
      case "insights":
        return "AI Meteorological Insights";
      case "travel":
        return "Travel & Route Intelligence";
      case "voice":
        return "Hands-Free Voice Studio";
      case "explore":
        return "Explore & Compare Hubs";
      case "history":
        return "Cloud Conversation History";
      case "settings":
        return "Profile & Preferences";
      case "auth":
        return "Sign In & Create Account";
      default:
        return "WeatherGPT";
    }
  };

  const formatTemp = (celsius: number) => {
    if (isFahrenheit) {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius}°C`;
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 dark:bg-slate-950/90 light:bg-white/90 backdrop-blur-md border-b border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 px-4 lg:px-8 py-2.5 transition-colors">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Mobile Brand & Section Title */}
        <div className="flex items-center gap-3">
          {/* Mobile brand icon (shown on small screens) */}
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white dark:text-white light:text-slate-900">
              WeatherGPT
            </span>
          </div>

          {/* Desktop breadcrumb */}
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500">
              Active Module
            </span>
            <span className="text-sm font-bold text-white dark:text-white light:text-slate-900 tracking-tight">
              {getSectionTitle(currentSection)}
            </span>
          </div>
        </div>

        {/* Center: Quick Location & Weather Status */}
        <div className="flex items-center gap-2">
          {currentLocation ? (
            <button
              onClick={onOpenLocationSearch}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-100 hover:bg-slate-800 border border-slate-800 dark:border-slate-800 light:border-slate-200 text-xs transition-colors group cursor-pointer"
              title="Click to change city"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div className="flex items-center gap-1.5 text-left">
                <span className="font-bold text-white dark:text-white light:text-slate-900 truncate max-w-[120px] sm:max-w-[180px]">
                  {currentLocation.name}
                </span>
                {currentWeather && (
                  <span className="font-extrabold text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded">
                    {formatTemp(currentWeather.temperature)}
                  </span>
                )}
              </div>
            </button>
          ) : (
            <button
              onClick={onOpenLocationSearch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold hover:bg-sky-500/30 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Select City</span>
            </button>
          )}

          {/* GPS Quick Button */}
          <button
            onClick={onUseGeolocation}
            disabled={isDetectingLocation}
            className="p-2 rounded-xl bg-slate-900 dark:bg-slate-900 light:bg-slate-100 hover:bg-slate-800 border border-slate-800 dark:border-slate-800 light:border-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-sky-400 transition-colors"
            title="Use current GPS location"
          >
            <Navigation className={`w-3.5 h-3.5 ${isDetectingLocation ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>

        {/* Right: Controls (Units, Theme, Device Preview, Profile) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Unit Toggle */}
          <button
            onClick={onToggleUnit}
            className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-900 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-200 text-xs font-bold text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-sky-400 transition-colors"
            title="Toggle Celsius / Fahrenheit"
          >
            {isFahrenheit ? "°F" : "°C"}
          </button>

          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg bg-slate-900 dark:bg-slate-900 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-sky-400 transition-colors"
            title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          >
            {isDark ? <Moon className="w-4 h-4 text-sky-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          </button>

          {/* User Profile / Login */}
          {currentUser && !currentUser.isGuest ? (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900 dark:bg-slate-900 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-200 hover:border-sky-500/50 transition-colors"
              title={`${currentUser.name} (${currentUser.email})`}
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-sky-500/30"
              />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
