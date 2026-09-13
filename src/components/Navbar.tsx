import React from "react";
import { Sparkles, MapPin, Navigation, MessageSquare, CloudSun, Activity, Car, GitCompare } from "lucide-react";
import { LocationInfo } from "../types.js";
import { LanguageSelector } from "./LanguageSelector.js";
import { getLanguageConfig } from "../languages.js";

interface NavbarProps {
  currentLocation: LocationInfo | null;
  isFahrenheit: boolean;
  onToggleUnit: () => void;
  onOpenLocationSearch: () => void;
  onUseGeolocation: () => void;
  isDetectingLocation: boolean;
  activeTab: "chat" | "overview" | "activity" | "travel" | "compare";
  onChangeTab: (tab: "chat" | "overview" | "activity" | "travel" | "compare") => void;
  preferredLanguage: string;
  onChangeLanguage: (lang: string) => void;
}

export function Navbar({
  currentLocation,
  isFahrenheit,
  onToggleUnit,
  onOpenLocationSearch,
  onUseGeolocation,
  isDetectingLocation,
  activeTab,
  onChangeTab,
  preferredLanguage,
  onChangeLanguage,
}: NavbarProps) {
  const langConfig = getLanguageConfig(preferredLanguage);
  const t = langConfig.translations;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Active Location */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-white">WeatherGPT</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Multilingual AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Deterministic Intelligence • Grounded Multilingual Gemini</p>
            </div>
          </div>

          {/* Mobile Right Controls: Language & Location */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSelector
              currentLanguage={preferredLanguage}
              onSelectLanguage={onChangeLanguage}
            />
            <button
              id="mobile-location-btn"
              onClick={onOpenLocationSearch}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              {currentLocation ? (
                <span className="max-w-[90px] truncate">{currentLocation.name}</span>
              ) : (
                <span className="text-sky-400 font-semibold">{t.selectLocation}</span>
              )}
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (Localized) */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 overflow-x-auto scrollbar-none">
          <button
            onClick={() => onChangeTab("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "chat" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t.tabAssistant}</span>
          </button>
          <button
            onClick={() => onChangeTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "overview" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CloudSun className="w-3.5 h-3.5" />
            <span>{t.tabForecast}</span>
          </button>
          <button
            onClick={() => onChangeTab("activity")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "activity" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{t.tabActivity}</span>
          </button>
          <button
            onClick={() => onChangeTab("travel")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "travel" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>{t.tabTravel}</span>
          </button>
          <button
            onClick={() => onChangeTab("compare")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "compare" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{t.tabCompare}</span>
          </button>
        </div>

        {/* Right Tools: Location, GPS, Unit Toggle, Searchable Language Selector */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Location Picker */}
          <button
            id="desktop-location-btn"
            onClick={onOpenLocationSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/50 text-xs font-medium text-slate-200 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            {currentLocation ? (
              <>
                <span className="max-w-[130px] truncate">{currentLocation.name}</span>
                {currentLocation.countryCode && (
                  <span className="text-[10px] uppercase font-bold text-sky-400 bg-sky-500/10 px-1 py-0.5 rounded border border-sky-500/20">
                    {currentLocation.countryCode}
                  </span>
                )}
                {currentLocation.admin1 && (
                  <span className="text-slate-500 text-[11px] truncate">({currentLocation.admin1})</span>
                )}
              </>
            ) : (
              <span className="text-sky-400 font-semibold animate-pulse">{t.selectLocation}</span>
            )}
          </button>

          {/* GPS Locate Button */}
          <button
            id="gps-locate-btn"
            onClick={onUseGeolocation}
            disabled={isDetectingLocation}
            title="Use current GPS location"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <Navigation className={`w-4 h-4 ${isDetectingLocation ? "animate-spin text-sky-400" : ""}`} />
          </button>

          {/* Unit Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-semibold">
            <button
              onClick={onToggleUnit}
              className={`px-2 py-1 rounded transition-colors ${!isFahrenheit ? "bg-sky-500 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              °C
            </button>
            <button
              onClick={onToggleUnit}
              className={`px-2 py-1 rounded transition-colors ${isFahrenheit ? "bg-sky-500 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              °F
            </button>
          </div>

          {/* Searchable Grouped Language Selector */}
          <LanguageSelector
            currentLanguage={preferredLanguage}
            onSelectLanguage={onChangeLanguage}
          />
        </div>
      </div>
    </header>
  );
}
