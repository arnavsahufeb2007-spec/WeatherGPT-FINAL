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
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/40 border border-slate-800 p-6 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Preferences & Profile</h2>
              <p className="text-xs text-slate-400">
                Personalize your WeatherGPT experience, units, appearance, and voice dynamics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 1. User Profile & Account */}
      <div className="rounded-2xl bg-slate-900/70 dark:bg-slate-950/70 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <User className="w-4 h-4 text-sky-400" />
            <span>Account & Cloud Profile</span>
          </div>
          {currentUser && !currentUser.isGuest ? (
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {currentUser.plan} Member
            </span>
          ) : (
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              Guest Session
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={currentUser?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
              alt="Avatar"
              className="w-14 h-14 rounded-2xl border border-sky-500/30 object-cover shadow-md"
            />
            <div>
              <h3 className="text-base font-bold text-white">{currentUser?.name || "Guest Explorer"}</h3>
              <p className="text-xs text-slate-400">{currentUser?.email || "Local offline session"}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Active Member since {currentUser?.joinedDate || "Recent"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && !currentUser.isGuest ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/25 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Create Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Saved favorite locations */}
        {currentUser?.savedLocations && currentUser.savedLocations.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80">
            <span className="text-xs font-bold text-slate-400 block mb-2">Saved Favorite Locations:</span>
            <div className="flex flex-wrap gap-2">
              {currentUser.savedLocations.map((loc, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <button
                    onClick={() => onSelectLocation(loc)}
                    className="flex items-center gap-1.5 font-medium text-white hover:text-sky-400"
                  >
                    <MapPin className="w-3 h-3 text-sky-400" />
                    <span>{loc.name}</span>
                    <span className="text-slate-400 text-[10px]">({loc.country})</span>
                  </button>
                  <button
                    onClick={() => authService.toggleFavoriteLocation(loc)}
                    className="text-slate-400 hover:text-rose-400 ml-1"
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
      <div className="rounded-2xl bg-slate-900/70 dark:bg-slate-950/70 border border-slate-800 p-6 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sun className="w-4 h-4 text-sky-400" />
            <span>Display Theme & Appearance</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Choose your preferred aesthetic style and contrast palette
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Dark Mode Card */}
          <button
            onClick={() => {
              if (!isDark) onToggleTheme();
            }}
            className={`p-4 rounded-2xl border text-left transition-all ${
              isDark
                ? "bg-slate-950 border-sky-500 ring-2 ring-sky-500/30 shadow-lg"
                : "bg-slate-950/50 border-slate-800 hover:border-slate-700 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-800 text-sky-400">
                  <Moon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-white">Obsidian Dark Mode</span>
              </div>
              {isDark && <Check className="w-4 h-4 text-sky-400" />}
            </div>
            <p className="text-xs text-slate-400">
              Deep slate & midnight accents. Reduces eye strain in low-light environments.
            </p>
          </button>

          {/* Light Mode Card */}
          <button
            onClick={() => {
              if (isDark) onToggleTheme();
            }}
            className={`p-4 rounded-2xl border text-left transition-all ${
              !isDark
                ? "bg-slate-100 border-sky-500 ring-2 ring-sky-500/30 shadow-lg"
                : "bg-slate-950/50 border-slate-800 hover:border-slate-700 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Sun className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-white">Crisp Light Mode</span>
              </div>
              {!isDark && <Check className="w-4 h-4 text-sky-400" />}
            </div>
            <p className="text-xs text-slate-400">
              Airy pearl canvas with high-contrast typography and subtle dividers for daytime clarity.
            </p>
          </button>
        </div>
      </div>

      {/* 3. Measurement Units */}
      <div className="rounded-2xl bg-slate-900/70 dark:bg-slate-950/70 border border-slate-800 p-6 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Meteorological Units</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Select temperature and atmospheric unit standards
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div>
            <span className="text-sm font-bold text-white block">Temperature Scale</span>
            <span className="text-xs text-slate-400">
              Currently displaying in {isFahrenheit ? "Fahrenheit (°F)" : "Celsius (°C)"}
            </span>
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => {
                if (isFahrenheit) onToggleUnit();
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !isFahrenheit ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Celsius (°C)
            </button>
            <button
              onClick={() => {
                if (!isFahrenheit) onToggleUnit();
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isFahrenheit ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Fahrenheit (°F)
            </button>
          </div>
        </div>
      </div>

      {/* 4. Language & Regional Settings */}
      <div className="rounded-2xl bg-slate-900/70 dark:bg-slate-950/70 border border-slate-800 p-6 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            <span>Display Language & Translations</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Active: <strong className="text-sky-400">{langConfig.name}</strong> ({langConfig.nativeName})
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {ALL_LANGUAGES.slice(0, 16).map((lang) => {
            const isSelected = preferredLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => onChangeLanguage(lang.code)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "bg-sky-500/20 border-sky-500 text-white ring-1 ring-sky-500/30"
                    : "bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold truncate">{lang.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </div>
                <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                  {lang.nativeName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Decoupled Voice Settings */}
      <div className="rounded-2xl bg-slate-900/70 dark:bg-slate-950/70 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-sky-400" />
              <span>Voice Recognition & Synthesis</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mic Input: <strong className="text-emerald-400">{inputLangConfig.name}</strong> • Speaker: <strong className="text-sky-400">{outputLangConfig.name}</strong>
            </p>
          </div>

          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize Spoken Dialects</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Auto-Speak Responses</span>
              <span className="text-[11px] text-slate-400">Read AI answers aloud automatically</span>
            </div>
            <button
              onClick={voice.toggleAutoSpeak}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                voice.autoSpeak ? "bg-sky-500 justify-end" : "bg-slate-800 justify-start"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white block shadow-sm" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Voice Pacing / Speed</span>
              <span className="font-bold text-sky-400">{voice.speechRate.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[0.8, 0.9, 1.0, 1.1, 1.2].map((r) => (
                <button
                  key={r}
                  onClick={() => voice.setSpeechRate(r)}
                  className={`flex-1 py-1 rounded text-[11px] font-medium border transition-colors ${
                    Math.abs(voice.speechRate - r) < 0.05
                      ? "bg-sky-500 text-white border-sky-400 font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
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
      <div className="rounded-2xl bg-slate-900/70 dark:bg-slate-950/70 border border-slate-800 p-6 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Monitor className="w-4 h-4 text-sky-400" />
            <span>Responsive Layout & Viewport Simulator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Test and preview dedicated layouts for Phone, Tablet, Laptop, and Desktop
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { mode: "auto" as DeviceMode, label: "Auto Fluid", icon: <Maximize2 className="w-4 h-4" />, sub: "Window-based" },
            { mode: "phone" as DeviceMode, label: "Phone", icon: <Smartphone className="w-4 h-4" />, sub: "375px Mobile" },
            { mode: "tablet" as DeviceMode, label: "Tablet", icon: <Tablet className="w-4 h-4" />, sub: "768px iPad" },
            { mode: "laptop" as DeviceMode, label: "Laptop", icon: <Laptop className="w-4 h-4" />, sub: "1024px Screen" },
            { mode: "desktop" as DeviceMode, label: "Desktop", icon: <Monitor className="w-4 h-4" />, sub: "1440px Ultra" },
          ].map((dev) => {
            const isSelected = deviceMode === dev.mode;
            return (
              <button
                key={dev.mode}
                onClick={() => onChangeDeviceMode(dev.mode)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "bg-sky-500/20 border-sky-500 text-white ring-1 ring-sky-500/30"
                    : "bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-center mb-1 text-sky-400">{dev.icon}</div>
                <div className="text-xs font-bold">{dev.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{dev.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. Reset & Data Management */}
      <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-slate-300 block">Factory Reset</span>
          <span className="text-[11px] text-slate-400">Erase cached weather and restore initial configurations</span>
        </div>
        <button
          onClick={handleClearCache}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium transition-colors"
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
