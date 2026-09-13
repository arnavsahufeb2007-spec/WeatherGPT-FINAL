import React from "react";
import {
  Sparkles,
  Home,
  CloudSun,
  Lightbulb,
  Car,
  Mic,
  Compass,
  Settings,
  Sun,
  Moon,
  MapPin,
  LogIn,
  User,
  ExternalLink,
  ChevronRight,
  Sliders,
} from "lucide-react";
import { LocationInfo } from "../types.js";
import { UserProfile } from "../services/auth.js";
import { getLanguageConfig } from "../languages.js";

export type NavSection = "home" | "forecast" | "insights" | "travel" | "voice" | "explore" | "settings";

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  currentLocation: LocationInfo | null;
  onOpenLocationSearch: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  preferredLanguage: string;
}

export function Sidebar({
  currentSection,
  onSelectSection,
  currentLocation,
  onOpenLocationSearch,
  isDark,
  onToggleTheme,
  currentUser,
  onOpenAuth,
  preferredLanguage,
}: SidebarProps) {
  const langConfig = getLanguageConfig(preferredLanguage);
  const t = langConfig.translations;

  const navItems: { id: NavSection; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: "home",
      label: "Home & Chat",
      icon: <Home className="w-4 h-4" />,
    },
    {
      id: "forecast",
      label: "Live Forecast",
      icon: <CloudSun className="w-4 h-4" />,
      badge: "Hourly & 7D",
    },
    {
      id: "insights",
      label: "AI Insights",
      icon: <Lightbulb className="w-4 h-4" />,
      badge: "Grounded",
    },
    {
      id: "travel",
      label: "Travel & Route",
      icon: <Car className="w-4 h-4" />,
    },
    {
      id: "voice",
      label: "Voice Studio",
      icon: <Mic className="w-4 h-4" />,
      badge: "Multilingual",
    },
    {
      id: "explore",
      label: "Explore & Compare",
      icon: <Compass className="w-4 h-4" />,
    },
    {
      id: "settings",
      label: "Settings & Profile",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside
      id="desktop-sidebar"
      className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-slate-900/90 dark:bg-slate-950/95 light:bg-white border-r border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 backdrop-blur-md z-30 select-none transition-colors"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white dark:text-white light:text-slate-900 truncate">
                WeatherGPT
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500 truncate">
              Deterministic Multilingual AI
            </p>
          </div>
        </div>

        {/* Current Active Location Card */}
        <div className="mt-4">
          <button
            onClick={onOpenLocationSearch}
            className="w-full text-left p-2.5 rounded-xl bg-slate-950/60 dark:bg-slate-900/60 light:bg-slate-100/90 border border-slate-800 dark:border-slate-800 light:border-slate-200 hover:border-sky-500/50 transition-all group"
          >
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" />
                Active City
              </span>
              <span className="text-[10px] text-sky-400 group-hover:underline">Change</span>
            </div>
            <div className="font-semibold text-xs text-white dark:text-white light:text-slate-900 truncate">
              {currentLocation ? currentLocation.name : "Select City"}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {currentLocation?.country || "Worldwide Open-Meteo"}
            </div>
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-none">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                  : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-slate-800/60 dark:hover:bg-slate-900/60 light:hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? "text-white" : "text-slate-400 group-hover:text-sky-400"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-800 text-slate-400 dark:bg-slate-800 dark:text-slate-400 light:bg-slate-200 light:text-slate-700"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Profile & Theme Control */}
      <div className="p-3 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 space-y-2">
        {/* Theme & Fast Action */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-950/40 dark:bg-slate-900/40 light:bg-slate-100">
          <span className="text-xs font-medium text-slate-400">Appearance</span>
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 dark:bg-slate-800 light:bg-white text-xs font-medium text-slate-200 dark:text-slate-200 light:text-slate-800 hover:text-sky-400 transition-colors shadow-sm"
            title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          >
            {isDark ? <Moon className="w-3.5 h-3.5 text-sky-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            <span>{isDark ? "Dark" : "Light"}</span>
          </button>
        </div>

        {/* User Profile Card / Sign In Button */}
        {currentUser && !currentUser.isGuest ? (
          <button
            onClick={() => onSelectSection("settings")}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-950/60 dark:bg-slate-900/60 light:bg-slate-100 hover:bg-slate-800/60 text-left transition-colors group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full border border-sky-500/40 object-cover shrink-0"
              />
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white dark:text-white light:text-slate-900 truncate">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
              </div>
            </div>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              Pro
            </span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Sign Up</span>
          </button>
        )}
      </div>
    </aside>
  );
}
