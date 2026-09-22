import React, { useState } from "react";
import {
  User,
  Settings,
  Sun,
  Moon,
  Globe,
  Sliders,
  Mic,
  Volume2,
  Check,
  RotateCcw,
  Sparkles,
  Shield,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Maximize2,
  LogIn,
  LogOut,
  MapPin,
  Trash2,
  Play,
  Square,
  ShieldCheck,
} from "lucide-react";
import { LocationInfo } from "../types.js";
import { UserProfile, authService } from "../services/auth.js";
import { getLanguageConfig, ALL_LANGUAGES } from "../languages.js";
import { DeviceMode } from "./DevicePreviewBar.js";
import { VoiceLanguageModal } from "./VoiceLanguageModal.js";

interface SettingsViewProps {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isFahrenheit: boolean;
  onToggleUnit: () => void;
  preferredLanguage: string;
  onChangeLanguage: (lang: string) => void;
  deviceMode: DeviceMode;
  onChangeDeviceMode: (mode: DeviceMode) => void;
  onSelectLocation: (loc: LocationInfo) => void;
  voice: {
    inputLanguage: string;
    outputLanguage: string;
    effectiveInputLanguage: string;
    effectiveOutputLanguage: string;
    autoSpeak: boolean;
    speechRate: number;
    setInputLanguage: (lang: string) => void;
    setOutputLanguage: (lang: string) => void;
    toggleAutoSpeak: () => void;
    setSpeechRate: (rate: number) => void;
    resetVoiceLanguages: () => void;
    speak: (text: string, lang?: string, stopCurrent?: boolean) => void;
    stopSpeaking: () => void;
    isSpeaking: boolean;
  };
}

export function SettingsView({
  currentUser,
  onOpenAuth,
  isDark,
  onToggleTheme,
  isFahrenheit,
  onToggleUnit,
  preferredLanguage,
  onChangeLanguage,
  deviceMode,
  onChangeDeviceMode,
  onSelectLocation,
  voice,
}: SettingsViewProps) {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const langConfig = getLanguageConfig(preferredLanguage);
  const inputLangConfig = getLanguageConfig(voice.effectiveInputLanguage);
  const outputLangConfig = getLanguageConfig(voice.effectiveOutputLanguage);

  const handleLogout = () => {
    authService.logout();
  };

  const handleClearCache = () => {
    if (confirm("Reset all local settings, saved cities, and cache to factory defaults?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div id="settings-view" className="space-y-4 sm:space-y-5 max-w-4xl mx-auto pb-10">
      {/* Settings Hero Banner with Telemetry HUD */}
      <div className="relative rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-5 sm:p-6 overflow-hidden transition-colors shadow-lg">
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80"
            alt="Atmospheric Coast"
            className="w-full h-full object-cover object-center opacity-30 dark:opacity-25 light:opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F141B] via-[#171C23]/95 to-[#171C23]/60 dark:from-[#0F141B] dark:via-[#171C23]/95 dark:to-[#171C23]/60 light:from-white light:via-white/95 light:to-white/80" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold text-[#8ECAE6] tracking-wider px-2 py-0.5 rounded-[3px] bg-[#0F141B]/80 border border-[#8ECAE6]/30">
                CALIBRATION & PROFILE • METEOROLOGICAL TELEMETRY
              </span>
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 font-mono tracking-tight">
              Preferences & System Configuration
            </h2>
            <p className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 leading-relaxed">
              Calibrate temperature scales, language engines, speech synthesizers, and profile synchronization parameters.
            </p>
          </div>

          {/* Telemetry HUD */}
          <div className="bg-[#0F141B]/80 dark:bg-[#0F141B]/80 light:bg-slate-100/90 backdrop-blur-md border border-[#30353D] dark:border-[#30353D] light:border-slate-300 p-3 rounded-[6px] hidden sm:flex flex-col gap-1.5 min-w-[210px] text-[11px] font-mono shrink-0 shadow-inner">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">TELEMETRY</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span> CALIBRATED
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">SCALE:</span>
              <span className="text-[#F4A261] font-semibold">{isFahrenheit ? "FAHRENHEIT (°F)" : "CELSIUS (°C)"}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">LOCALE:</span>
              <span className="text-[#8ECAE6] font-semibold truncate max-w-[120px]">{langConfig.name.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">THEME:</span>
              <span className="text-slate-200 font-semibold">{isDark ? "OBSIDIAN DARK" : "CRISP LIGHT"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Header */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 flex items-center justify-between transition-colors shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-center text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-tight uppercase">
                SYSTEM CALIBRATION CONTROLS
              </h3>
              <p className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
                Personalize your WeatherGPT experience, units, appearance, and voice dynamics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 1. User Profile & Account */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 space-y-4 transition-colors shadow-sm">
        <div className="flex items-center justify-between border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-slate-100 dark:text-slate-100 light:text-slate-900">
            <User className="w-3.5 h-3.5 text-[#8ECAE6]" />
            <span>Account & Cloud Profile</span>
          </div>
          {currentUser && !currentUser.isGuest ? (
            <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-[3px] bg-emerald-950/60 light:bg-emerald-50 text-emerald-400 light:text-emerald-700 border border-emerald-500/30 light:border-emerald-300">
              {currentUser.plan} Member
            </span>
          ) : (
            <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-[3px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 text-slate-400 dark:text-slate-400 light:text-slate-600 border border-[#30353D] dark:border-[#30353D] light:border-slate-200">
              Guest Session
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={currentUser?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
              alt="Avatar"
              className="w-12 h-12 rounded-[6px] border border-[#30353D] dark:border-[#30353D] light:border-slate-200 object-cover"
            />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">
                {currentUser?.name || "Guest Explorer"}
              </h3>
              <p className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">{currentUser?.email || "Local offline session"}</p>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-500 light:text-slate-400 mt-0.5">
                Active Member since {currentUser?.joinedDate || "Recent"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && !currentUser.isGuest ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 text-xs font-mono border border-[#30353D] dark:border-[#30353D] light:border-slate-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-[#252A32] dark:bg-[#252A32] light:bg-sky-50 hover:bg-[#30353D] dark:hover:bg-[#30353D] light:hover:bg-sky-100 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 text-xs font-mono font-semibold border border-[#8ECAE6]/40 dark:border-[#8ECAE6]/40 light:border-sky-300 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Create Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Saved favorite locations */}
        {currentUser?.savedLocations && currentUser.savedLocations.length > 0 && (
          <div className="pt-3 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200">
            <span className="text-xs font-mono font-semibold text-slate-400 dark:text-slate-400 light:text-slate-500 block mb-2">
              Saved Favorite Locations:
            </span>
            <div className="flex flex-wrap gap-2">
              {currentUser.savedLocations.map((loc, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-xs font-mono"
                >
                  <button
                    onClick={() => onSelectLocation(loc)}
                    className="flex items-center gap-1.5 font-medium text-slate-200 dark:text-slate-200 light:text-slate-800 hover:text-[#8ECAE6] dark:hover:text-[#8ECAE6] light:hover:text-sky-700 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3 h-3 text-[#8ECAE6]" />
                    <span>{loc.name}</span>
                    <span className="text-slate-500 text-[10px]">({loc.country})</span>
                  </button>
                  <button
                    onClick={() => authService.toggleFavoriteLocation(loc)}
                    className="text-slate-400 hover:text-rose-400 ml-1 transition-colors cursor-pointer"
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Appearance: Dark vs Light Theme */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 space-y-4 transition-colors">
        <div className="border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200 pb-3">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-[#8ECAE6]" />
            <span>Display Theme & Appearance</span>
          </h3>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Choose your preferred aesthetic style and contrast palette
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Dark Mode Card */}
          <button
            onClick={() => {
              if (!isDark) onToggleTheme();
            }}
            className={`p-3.5 sm:p-4 rounded-[6px] border text-left transition-all duration-200 cursor-pointer ${
              isDark
                ? "bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 border-2 border-[#F4A261] ring-2 ring-[#F4A261]/20 shadow-md"
                : "bg-[#171C23] dark:bg-[#171C23] light:bg-slate-50 border-[#30353D] dark:border-[#30353D] light:border-slate-200 opacity-70 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-[4px] bg-[#252A32] dark:bg-[#252A32] light:bg-slate-200 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700">
                  <Moon className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900">Obsidian Dark Mode</span>
              </div>
              {isDark && <Check className="w-4 h-4 text-[#F4A261]" />}
            </div>
            <p className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
              Deep slate & midnight accents. Reduces eye strain in low-light environments.
            </p>
          </button>

          {/* Light Mode Card */}
          <button
            onClick={() => {
              if (isDark) onToggleTheme();
            }}
            className={`p-3.5 sm:p-4 rounded-[6px] border text-left transition-all duration-200 cursor-pointer ${
              !isDark
                ? "bg-[#1B2027] dark:bg-[#1B2027] light:bg-amber-500/10 border-2 border-[#F4A261] ring-2 ring-[#F4A261]/20 shadow-md"
                : "bg-[#171C23] dark:bg-[#171C23] light:bg-slate-50 border-[#30353D] dark:border-[#30353D] light:border-slate-200 opacity-70 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-[4px] bg-amber-500/10 text-[#F4A261]">
                  <Sun className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900">Crisp Light Mode</span>
              </div>
              {!isDark && <Check className="w-4 h-4 text-[#F4A261]" />}
            </div>
            <p className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
              Airy pearl canvas with high-contrast typography and subtle dividers for daytime clarity.
            </p>
          </button>
        </div>
      </div>

      {/* 3. Measurement Units */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 space-y-4 transition-colors shadow-sm">
        <div className="border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200 pb-3">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#8ECAE6]" />
            <span>Meteorological Units</span>
          </h3>
          <p className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5">
            Select temperature and atmospheric unit standards
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[6px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200">
          <div>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900 block">Temperature Scale</span>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
              Currently displaying in {isFahrenheit ? "Fahrenheit (°F)" : "Celsius (°C)"}
            </span>
          </div>

          <div className="flex items-center bg-[#171C23] dark:bg-[#171C23] light:bg-slate-200 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 rounded-[4px] p-1 text-xs font-mono font-bold">
            <button
              onClick={() => {
                if (isFahrenheit) onToggleUnit();
              }}
              className={`px-3.5 py-1.5 rounded-[3px] transition-colors cursor-pointer ${
                !isFahrenheit ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]" : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900"
              }`}
            >
              Celsius (°C)
            </button>
            <button
              onClick={() => {
                if (!isFahrenheit) onToggleUnit();
              }}
              className={`px-3.5 py-1.5 rounded-[3px] transition-colors cursor-pointer ${
                isFahrenheit ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]" : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900"
              }`}
            >
              Fahrenheit (°F)
            </button>
          </div>
        </div>
      </div>

      {/* 4. Language & Regional Settings */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 space-y-4 transition-colors shadow-sm">
        <div className="border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200 pb-3">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-[#8ECAE6]" />
            <span>Display Language & Translations</span>
          </h3>
          <p className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5">
            Active: <strong className="text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700">{langConfig.name}</strong> ({langConfig.nativeName})
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {ALL_LANGUAGES.map((lang) => {
            const isSelected = preferredLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => onChangeLanguage(lang.code)}
                className={`p-2.5 rounded-[4px] border text-left font-mono transition-all duration-150 cursor-pointer group ${
                  isSelected
                    ? "bg-[#1B2027] dark:bg-[#1B2027] light:bg-amber-500/10 border-2 border-[#F4A261] ring-1 ring-[#F4A261]/20 shadow-sm"
                    : "bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border-[#30353D] dark:border-[#30353D] light:border-slate-200 hover:border-[#8ECAE6]/40 dark:hover:border-[#8ECAE6]/40 light:hover:border-slate-400 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold truncate ${
                      isSelected
                        ? "text-white dark:text-white light:text-slate-900"
                        : "text-slate-300 dark:text-slate-300 light:text-slate-700 group-hover:text-white dark:group-hover:text-white light:group-hover:text-slate-950"
                    }`}
                  >
                    {lang.name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#F4A261] shrink-0" />}
                </div>
                <span
                  className={`text-[10px] truncate block mt-0.5 ${
                    isSelected
                      ? "text-slate-300 dark:text-slate-300 light:text-amber-800"
                      : "text-slate-400 dark:text-slate-400 light:text-slate-500"
                  }`}
                >
                  {lang.nativeName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Decoupled Voice Settings */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 space-y-4 transition-colors shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200 pb-3">
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-[#8ECAE6]" />
              <span>Voice Recognition & Synthesis</span>
            </h3>
            <p className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5">
              Mic Input: <strong className="text-emerald-400 light:text-emerald-700">{inputLangConfig.name}</strong> • Speaker: <strong className="text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700">{outputLangConfig.name}</strong>
            </p>
          </div>

          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-200 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 text-xs font-mono font-semibold transition-colors cursor-pointer w-fit"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize Spoken Dialects</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-3.5 rounded-[6px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 block">Auto-Speak Responses</span>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">Read AI answers aloud automatically</span>
            </div>
            <button
              onClick={voice.toggleAutoSpeak}
              className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                voice.autoSpeak ? "bg-[#8ECAE6] justify-end" : "bg-[#252A32] dark:bg-[#252A32] light:bg-slate-300 justify-start border border-[#30353D] dark:border-[#30353D] light:border-slate-400"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white block shadow-sm" />
            </button>
          </div>

          <div className="p-3.5 rounded-[6px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">Voice Pacing / Speed</span>
              <span className="font-bold text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700">{voice.speechRate.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[0.8, 0.9, 1.0, 1.1, 1.2].map((r) => (
                <button
                  key={r}
                  onClick={() => voice.setSpeechRate(r)}
                  className={`flex-1 py-1 rounded-[3px] text-[11px] font-mono font-medium border transition-colors cursor-pointer ${
                    Math.abs(voice.speechRate - r) < 0.05
                      ? "bg-[#F4A261] text-[#0F141B] border-[#F4A261] font-bold"
                      : "bg-[#171C23] dark:bg-[#171C23] light:bg-slate-100 border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900"
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Device Responsive Simulator / Layout Mode */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 space-y-4 transition-colors shadow-sm">
        <div className="border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200 pb-3">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2">
            <Monitor className="w-3.5 h-3.5 text-[#8ECAE6]" />
            <span>Responsive Layout & Viewport Simulator</span>
          </h3>
          <p className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5">
            Test and preview dedicated layouts for Phone, Tablet, Laptop, and Desktop
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { mode: "auto" as DeviceMode, label: "Auto Fluid", icon: <Maximize2 className="w-3.5 h-3.5" />, sub: "Window-based" },
            { mode: "phone" as DeviceMode, label: "Phone", icon: <Smartphone className="w-3.5 h-3.5" />, sub: "375px Mobile" },
            { mode: "tablet" as DeviceMode, label: "Tablet", icon: <Tablet className="w-3.5 h-3.5" />, sub: "768px iPad" },
            { mode: "laptop" as DeviceMode, label: "Laptop", icon: <Laptop className="w-3.5 h-3.5" />, sub: "1024px Screen" },
            { mode: "desktop" as DeviceMode, label: "Desktop", icon: <Monitor className="w-3.5 h-3.5" />, sub: "1440px Ultra" },
          ].map((dev, idx) => {
            const isSelected = deviceMode === dev.mode;
            return (
              <button
                key={dev.mode}
                onClick={() => onChangeDeviceMode(dev.mode)}
                className={`p-2.5 sm:p-3 rounded-[6px] border text-center font-mono transition-colors cursor-pointer ${
                  idx === 4 ? "col-span-2 sm:col-span-1" : ""
                } ${
                  isSelected
                    ? "bg-[#252A32] dark:bg-[#252A32] light:bg-amber-500/10 border-2 border-[#F4A261] text-slate-100 dark:text-slate-100 light:text-slate-900 shadow-sm"
                    : "bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-slate-400 dark:text-slate-400 light:text-slate-600 hover:border-[#8ECAE6]/40 dark:hover:border-[#8ECAE6]/40 light:hover:border-slate-300 hover:text-white dark:hover:text-white light:hover:text-slate-900"
                }`}
              >
                <div className="flex items-center justify-center mb-1 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700">{dev.icon}</div>
                <div className="text-xs font-bold">{dev.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{dev.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. Reset & Data Management */}
      <div className="p-3.5 sm:p-4 rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-between text-xs font-mono transition-colors shadow-sm">
        <div>
          <span className="font-bold text-slate-200 dark:text-slate-200 light:text-slate-800 block">Factory Reset</span>
          <span className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500">Erase cached weather and restore initial configurations</span>
        </div>
        <button
          onClick={handleClearCache}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-rose-950/40 hover:bg-rose-950/60 light:bg-rose-50 light:hover:bg-rose-100 border border-rose-500/30 light:border-rose-300 text-rose-300 light:text-rose-700 text-xs font-mono transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset App Data</span>
        </button>
      </div>

      {/* Voice Language Configuration Modal */}
      <VoiceLanguageModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        appLanguage={preferredLanguage}
        inputLanguage={voice.inputLanguage}
        outputLanguage={voice.outputLanguage}
        autoSpeak={voice.autoSpeak}
        speechRate={voice.speechRate}
        onSelectInputLanguage={(c) => voice.setInputLanguage(c)}
        onSelectOutputLanguage={(c) => voice.setOutputLanguage(c)}
        onToggleAutoSpeak={voice.toggleAutoSpeak}
        onChangeSpeechRate={(r) => voice.setSpeechRate(r)}
        onResetDefaults={voice.resetVoiceLanguages}
        onTestVoice={(lang, text) => {
          voice.speak(text, lang === "auto" ? voice.effectiveOutputLanguage : lang, true);
        }}
        isSpeakingTest={voice.isSpeaking}
        onStopTestVoice={voice.stopSpeaking}
      />
    </div>
  );
}
