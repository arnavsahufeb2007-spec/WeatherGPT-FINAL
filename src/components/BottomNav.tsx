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
    { id: "home", label: "Home", icon: <Home className="w-4 h-4" /> },
    { id: "forecast", label: "Forecast", icon: <CloudSun className="w-4 h-4" /> },
    { id: "insights", label: "Insights", icon: <Lightbulb className="w-4 h-4" /> },
    { id: "history", label: "History", icon: <History className="w-4 h-4" /> },
    { id: "voice", label: "Voice", icon: <Mic className="w-4 h-4" /> },
    { id: "explore", label: "Explore", icon: <Compass className="w-4 h-4" /> },
    { id: "settings", label: "Profile", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      className={`${
        deviceMode === "phone" ? "sticky bottom-0 w-full" : "md:hidden fixed bottom-0 left-0 right-0"
      } z-40 bg-[#171C23] dark:bg-[#171C23] light:bg-white border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 px-1 py-1 safe-area-pb transition-colors`}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = currentSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectSection(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-0.5 min-[360px]:px-1 sm:px-1.5 rounded-[4px] transition-colors min-w-[40px] min-[360px]:min-w-[44px] min-h-[44px] cursor-pointer ${
                isActive
                  ? "text-[#8ECAE6] font-semibold"
                  : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900"
              }`}
            >
              <div
                className={`p-1 rounded-[3px] transition-colors ${
                  isActive ? "bg-[#252A32] text-[#8ECAE6] border border-[#30353D]" : ""
                }`}
              >
                {tab.icon}
              </div>
              <span className="text-[9px] min-[360px]:text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
