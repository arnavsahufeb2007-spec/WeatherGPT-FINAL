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
  ChevronDown,
  ChevronsUpDown,
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
        return "Home & Atmospheric Intelligence";
      case "forecast":
        return "Hourly & 7-Day Synoptic Outlook";
      case "insights":
        return "Outdoor Suitability & Guidance";
      case "travel":
        return "Travel Corridors & Ensembles";
      case "voice":
        return "Hands-Free Voice Studio";
      case "explore":
        return "Explore & Compare Hubs";
      case "history":
        return "Cloud Atmospheric Records";
      case "settings":
        return "Telemetry & Calibration";
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
    <header className="sticky top-0 z-30 bg-[#171C23] dark:bg-[#171C23] light:bg-white border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200 px-3 sm:px-4 lg:px-8 py-2.5 transition-colors">
      <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-7xl mx-auto">
        {/* Left: Mobile Brand & Section Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile brand icon (shown on small screens) */}
          <div className="md:hidden flex items-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 rounded-[4px] bg-[#252A32] border border-[#30353D] flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[#8ECAE6]" />
            </div>
            <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-100 dark:text-slate-100 light:text-slate-900 hidden min-[360px]:inline">
              WeatherGPT
            </span>
          </div>

          {/* Desktop breadcrumb */}
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500">
              ACTIVE MODULE
            </span>
            <span className="text-sm font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-tight">
              {getSectionTitle(currentSection)}
            </span>
          </div>
        </div>

        {/* Center: Quick Location & Weather Status */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {currentLocation ? (
            <button
              onClick={onOpenLocationSearch}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 hover:border-[#8ECAE6]/50 text-xs transition-colors group cursor-pointer max-w-full"
              title="Click to change city"
            >
              <MapPin className="w-3.5 h-3.5 text-[#8ECAE6] shrink-0" />
              <div className="flex items-center gap-1.5 text-left truncate">
                <span className="font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900 truncate">
                  {currentLocation.name}
                </span>
                {currentWeather && (
                  <span className="font-mono text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 shrink-0">
                    {formatTemp(currentWeather.temperature)}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>
          ) : (
            <button
              onClick={onOpenLocationSearch}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[6px] bg-[#252A32] dark:bg-[#252A32] light:bg-slate-100 text-[#8ECAE6] border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-xs font-medium hover:border-[#8ECAE6]/50 transition-colors cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Select City</span>
            </button>
          )}

          {/* GPS Quick Button */}
          <button
            onClick={onUseGeolocation}
            disabled={isDetectingLocation}
            className="p-1.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-[#8ECAE6] hover:border-[#8ECAE6]/40 transition-colors cursor-pointer shrink-0"
            title="Use current GPS location"
          >
            <Navigation className={`w-3.5 h-3.5 ${isDetectingLocation ? "animate-spin text-[#8ECAE6]" : ""}`} />
          </button>
        </div>

        {/* Right: Controls (Language, Units, Sign In) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Language Selector Pill */}
          <button
            onClick={onOpenSettings}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 hover:border-[#8ECAE6]/40 text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 transition-colors cursor-pointer"
            title="Change display language"
          >
            <Globe className="w-3.5 h-3.5 text-[#8ECAE6]" />
            <span className="capitalize">{langConfig.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Unit Toggle */}
          <div className="flex items-center rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-0.5 text-xs font-semibold font-mono">
            <button
              onClick={() => { if (isFahrenheit) onToggleUnit(); }}
              className={`px-2 py-0.5 rounded-[3px] transition-colors cursor-pointer ${
                !isFahrenheit
                  ? "bg-[#252A32] dark:bg-[#252A32] light:bg-slate-200 text-slate-100 dark:text-slate-100 light:text-slate-900 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              °C
            </button>
            <button
              onClick={() => { if (!isFahrenheit) onToggleUnit(); }}
              className={`px-2 py-0.5 rounded-[3px] transition-colors cursor-pointer ${
                isFahrenheit
                  ? "bg-[#252A32] dark:bg-[#252A32] light:bg-slate-200 text-slate-100 dark:text-slate-100 light:text-slate-900 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              °F
            </button>
          </div>

          {/* User Profile / Login */}
          {currentUser && !currentUser.isGuest ? (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 p-0.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 hover:border-[#8ECAE6]/50 transition-colors cursor-pointer"
              title={`${currentUser.name} (${currentUser.email})`}
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-6 h-6 rounded-[3px] object-cover"
              />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#F4A261] hover:bg-[#E76F51] text-[#0F141B] font-semibold border border-[#F4A261] text-xs transition-colors cursor-pointer shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
