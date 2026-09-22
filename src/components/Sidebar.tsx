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
  History,
} from "lucide-react";
import { LocationInfo } from "../types.js";
import { UserProfile } from "../services/auth.js";
import { getLanguageConfig } from "../languages.js";

export type NavSection = "home" | "forecast" | "insights" | "travel" | "voice" | "explore" | "history" | "settings" | "auth";

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
      badge: "HOURLY & 7D",
    },
    {
      id: "insights",
      label: "AI Insights",
      icon: <Lightbulb className="w-4 h-4" />,
      badge: "GROUNDED",
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
      badge: "MULTILINGUAL",
    },
    {
      id: "explore",
      label: "Explore & Compare",
      icon: <Compass className="w-4 h-4" />,
    },
    {
      id: "history",
      label: "Cloud History",
      icon: <History className="w-4 h-4" />,
      badge: "SYNC",
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
      className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-[#171C23] dark:bg-[#171C23] light:bg-white border-r border-[#30353D] dark:border-[#30353D] light:border-slate-200 z-30 select-none transition-colors"
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[4px] bg-[#252A32] border border-[#30353D] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#8ECAE6]" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-slate-100 dark:text-slate-100 light:text-slate-900 truncate">
                WeatherGPT
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-[#F4A261]/20 text-[#F4A261] border border-[#F4A261]/40 shrink-0 font-bold">
                v2.0
              </span>
            </div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500 truncate">
              ATMOSPHERIC SCIENCE
            </p>
          </div>
        </div>

        {/* Current Active Location Card */}
        <div className="mt-3.5">
          <button
            onClick={onOpenLocationSearch}
            className="w-full text-left p-2.5 rounded-[6px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 hover:border-[#8ECAE6]/50 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1 font-mono">
                <MapPin className="w-3 h-3 text-[#8ECAE6]" />
                STATION BASE
              </span>
              <span className="text-[10px] text-[#8ECAE6] group-hover:underline">Change</span>
            </div>
            <div className="font-semibold text-xs text-slate-100 dark:text-slate-100 light:text-slate-900 truncate">
              {currentLocation ? currentLocation.name : "Select City"}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {currentLocation?.country || "India"}
            </div>
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-1 scrollbar-none">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2 font-mono">
          NAVIGATION
        </div>
        {navItems.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-xs transition-colors group cursor-pointer ${
                isActive
                  ? "bg-[#252A32] dark:bg-[#252A32] light:bg-slate-100 text-slate-100 dark:text-slate-100 light:text-slate-900 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 font-semibold"
                  : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-slate-900 hover:bg-[#1B2027] dark:hover:bg-[#1B2027] light:hover:bg-slate-100 border border-transparent font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? "text-[#8ECAE6]" : "text-slate-400 group-hover:text-slate-200"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[3px] border ${
                    isActive
                      ? "bg-[#171C23] text-[#8ECAE6] border-[#30353D]"
                      : "bg-[#1B2027] text-slate-400 border-[#30353D] dark:bg-[#1B2027] dark:text-slate-400 light:bg-slate-200 light:text-slate-700 light:border-slate-300"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Status & Theme Control */}
      <div className="p-3 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 space-y-2">
        {/* Live Synoptic Status */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700">
            LIVE SYNOPTIC
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#252A32] text-slate-400 border border-[#30353D] ml-auto">
            Open-Meteo & METAR
          </span>
        </div>

        {/* Theme Appearance Control */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200">
          <span className="text-xs font-medium text-slate-400">Appearance</span>
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[#252A32] dark:bg-[#252A32] light:bg-white text-xs font-medium text-slate-200 dark:text-slate-200 light:text-slate-800 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 hover:border-[#8ECAE6]/40 transition-colors cursor-pointer"
            title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          >
            {isDark ? <Moon className="w-3.5 h-3.5 text-[#8ECAE6]" /> : <Sun className="w-3.5 h-3.5 text-[#F4A261]" />}
            <span>{isDark ? "Dark" : "Light"}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
