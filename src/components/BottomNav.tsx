import React from "react";
import { Home, CloudSun, Lightbulb, Car, Mic, Settings, Compass, History } from "lucide-react";
import { NavSection } from "./Sidebar.js";

interface BottomNavProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  unreadCount?: number;
  deviceMode?: string;
}

export function BottomNav({ currentSection, onSelectSection, deviceMode }: BottomNavProps) {
  const tabs: { id: NavSection; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", icon: <Home className="w-5 h-5" /> },
    { id: "forecast", label: "Forecast", icon: <CloudSun className="w-5 h-5" /> },
    { id: "insights", label: "Insights", icon: <Lightbulb className="w-5 h-5" /> },
    { id: "history", label: "History", icon: <History className="w-5 h-5" /> },
    { id: "voice", label: "Voice", icon: <Mic className="w-5 h-5" /> },
    { id: "explore", label: "Explore", icon: <Compass className="w-5 h-5" /> },
    { id: "settings", label: "Profile", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      className={`${
        deviceMode === "phone" ? "sticky bottom-0 w-full" : "md:hidden fixed bottom-0 left-0 right-0"
      } z-40 bg-slate-950/95 dark:bg-slate-950/95 light:bg-white/95 border-t border-slate-800/90 dark:border-slate-800/90 light:border-slate-200 backdrop-blur-lg px-1.5 py-1.5 safe-area-pb`}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = currentSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectSection(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 min-w-[48px] min-h-[48px] ${
                isActive
                  ? "text-sky-400 font-bold scale-105"
                  : "text-slate-400 dark:text-slate-400 light:text-slate-500 hover:text-slate-200"
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive ? "bg-sky-500/15 text-sky-400" : ""
                }`}
              >
                {tab.icon}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
