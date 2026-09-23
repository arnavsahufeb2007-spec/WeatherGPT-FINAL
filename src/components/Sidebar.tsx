import React from "react";
import {
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
  ChevronRight,
  History,
  Radio,
  CheckCircle2,
} from "lucide-react";
import { WeatherGptLogo } from "./WeatherGptLogo.js";
import { LocationInfo } from "../types.js";
import { UserProfile } from "../services/auth.js";
import { getLanguageConfig } from "../languages.js";

export type NavSection =
  | "home"
  | "forecast"
  | "insights"
  | "travel"
  | "voice"
  | "explore"
  | "history"
  | "settings"
  | "auth";

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

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ReactNode;
  badge?: string;
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

  const navItems: NavItem[] = [
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
      className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-[#0F141B] dark:bg-[#0F141B] light:bg-[#F8FAFC] border-r border-[#252A32] dark:border-[#252A32] light:border-slate-200 z-30 select-none transition-colors"
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-[#252A32] dark:border-[#252A32] light:border-slate-200 bg-[#0F141B] dark:bg-[#0F141B] light:bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] bg-gradient-to-b from-[#2A231C] to-[#171410] border border-[#F4A261]/30 flex items-center justify-center shrink-0 p-1 shadow-sm">
            <WeatherGptLogo size={28} />
          </div>
          <div className="overflow-hidden flex-1">
            <div className="flex items-center">
              <span className="font-extrabold text-sm tracking-tight text-slate-100 dark:text-slate-100 light:text-slate-900 truncate">
                WeatherGPT
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F4A261]/15 text-[#F4A261] border border-[#F4A261]/30 ml-1.5 shrink-0">
                V2.0
              </span>
            </div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500 truncate mt-0.5">
              ATMOSPHERIC SCIENCE
            </p>
          </div>
        </div>

        {/* Station Base Card */}
        <div className="mt-3.5">
          <button
            id="sidebar-location-btn"
            onClick={onOpenLocationSearch}
            className="w-full text-left p-2.5 rounded-[8px] bg-[#14181F] dark:bg-[#14181F] light:bg-slate-50 border border-[#252A32] dark:border-[#252A32] light:border-slate-200 hover:border-[#8ECAE6]/50 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 light:text-slate-500 flex items-center gap-1.5 font-mono">
                <MapPin className="w-3 h-3 text-[#8ECAE6]" />
                STATION BASE
              </span>
              <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-200 group-hover:underline transition-colors">
                Change
              </span>
            </div>
            <div className="font-bold text-xs text-slate-100 dark:text-slate-100 light:text-slate-900 truncate">
              {currentLocation ? currentLocation.name : "Select Station"}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-400 light:text-slate-500 truncate mt-0.5 font-mono">
              {currentLocation?.country || "India"}
            </div>
          </button>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400 light:text-slate-500 px-3 py-1">
          NAVIGATION
        </div>

        {navItems.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-xs transition-colors group cursor-pointer ${
                isActive
                  ? "bg-[#1E232B] dark:bg-[#1E232B] light:bg-slate-200 text-slate-100 dark:text-slate-100 light:text-slate-900 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 font-semibold"
                  : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-slate-900 hover:bg-[#14181F] dark:hover:bg-[#14181F] light:hover:bg-slate-100 border border-transparent font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`transition-colors ${
                    isActive
                      ? "text-slate-100 dark:text-slate-100 light:text-slate-900"
                      : "text-slate-400 dark:text-slate-400 light:text-slate-500 group-hover:text-slate-200"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="tracking-tight">{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#14181F] dark:bg-[#14181F] light:bg-slate-100 text-slate-400 dark:text-slate-400 light:text-slate-600 border border-[#252A32] dark:border-[#252A32] light:border-slate-300 uppercase">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Account Tile (Sync / Profile) */}
      <div className="px-3 pt-2">
        {currentUser ? (
          <button
            onClick={() => onSelectSection("auth")}
            className="w-full flex items-center justify-between p-2 rounded-[8px] bg-[#14181F] dark:bg-[#14181F] light:bg-slate-50 border border-[#252A32] dark:border-[#252A32] light:border-slate-200 hover:border-[#8ECAE6]/40 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name || "User"}
                  className="w-6 h-6 rounded-full object-cover shrink-0 border border-[#252A32]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#1E232B] border border-[#252A32] flex items-center justify-center shrink-0 text-[#8ECAE6]">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="overflow-hidden">
                <div className="text-[11px] font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800 truncate">
                  {currentUser.name || "Signed In"}
                </div>
                <div className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Synced
                </div>
              </div>
            </div>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-200 transition-colors shrink-0" />
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-between p-2 rounded-[8px] bg-[#14181F] dark:bg-[#14181F] light:bg-slate-50 border border-[#252A32] dark:border-[#252A32] light:border-slate-200 hover:border-[#8ECAE6]/40 hover:bg-[#1E232B] dark:hover:bg-[#1E232B] light:hover:bg-slate-100 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#1E232B] border border-[#252A32] flex items-center justify-center shrink-0 text-[#8ECAE6]">
                <LogIn className="w-3 h-3 text-[#8ECAE6]" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">
                  Sync Account
                </div>
                <div className="text-[9px] font-mono text-slate-400">
                  Guest mode
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#8ECAE6] group-hover:underline">
              Sign In
            </span>
          </button>
        )}
      </div>

      {/* Bottom Status & Theme Control */}
      <div className="p-3 border-t border-[#252A32] dark:border-[#252A32] light:border-slate-200 space-y-2 mt-2">
        {/* Live Synoptic Status */}
        <div className="flex items-center justify-between text-xs font-mono px-1">
          <div className="flex items-center gap-1.5 text-slate-300 dark:text-slate-300 light:text-slate-700">
            <span className="w-2 h-2 rounded-full bg-[#8ECAE6]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">LIVE SYNOPTIC</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-400 light:text-slate-500">
            Open-Meteo & METAR
          </span>
        </div>

        {/* Theme Appearance Control */}
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-xs text-slate-400 font-medium">Appearance</span>
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#14181F] dark:bg-[#14181F] light:bg-slate-100 border border-[#252A32] dark:border-[#252A32] light:border-slate-300 hover:border-slate-500 text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 transition-colors cursor-pointer"
          >
            {isDark ? (
              <>
                <Moon className="w-3.5 h-3.5 text-[#8ECAE6]" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-[#F4A261]" />
                <span>Light</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
