import React from "react";
import {
  Compass,
  Sunrise,
  Sun,
  Sunset,
  Sparkles,
  Moon,
  Clock,
} from "lucide-react";
import { DiurnalPhase, DIURNAL_PHASE_CONFIGS } from "../services/diurnalTheme.js";
import { getTranslations } from "../translations/registry.js";

interface SolarAtmosphereBarProps {
  selectedPhase: DiurnalPhase | "auto";
  onSelectPhase: (phase: DiurnalPhase | "auto") => void;
  detectedPhase: DiurnalPhase;
  currentSection?: string;
  isDark: boolean;
  localTimeStr?: string;
  cityName?: string;
  preferredLanguage?: string;
}

export function SolarAtmosphereBar({
  selectedPhase,
  onSelectPhase,
  detectedPhase,
  isDark,
  localTimeStr,
  cityName,
  preferredLanguage,
}: SolarAtmosphereBarProps) {
  const t = getTranslations(preferredLanguage);
  const activeEffectivePhase =
    selectedPhase === "auto" ? detectedPhase : selectedPhase;
  const activeConfig = DIURNAL_PHASE_CONFIGS[activeEffectivePhase];

  const phaseButtons: {
    id: DiurnalPhase | "auto";
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
  }[] = [
    {
      id: "auto",
      label: t.liveAuto || "Live Auto",
      icon: <Compass className="w-3.5 h-3.5" />,
      color: "#8ECAE6",
      description: `Follow real-time solar cycle (${DIURNAL_PHASE_CONFIGS[detectedPhase].name})`,
    },
    {
      id: "dawn",
      label: t.dawn || "Dawn",
      icon: <Sunrise className="w-3.5 h-3.5" />,
      color: "#F4A261",
      description: "First light, cool morning mist, rising horizon",
    },
    {
      id: "day",
      label: t.solarApex || "Solar Apex",
      icon: <Sun className="w-3.5 h-3.5" />,
      color: "#FFB703",
      description: "High noon, maximum ambient irradiance, crisp visibility",
    },
    {
      id: "golden_hour",
      label: t.goldenHour || "Golden Hour",
      icon: <Sunset className="w-3.5 h-3.5" />,
      color: "#E76F51",
      description: "Low-angle amber rays, long silhouettes, evening transition",
    },
    {
      id: "dusk",
      label: t.dusk || "Dusk",
      icon: <Sparkles className="w-3.5 h-3.5" />,
      color: "#C77DFF",
      description: "Post-sunset twilight, deep violet skies, planetary glow",
    },
    {
      id: "night",
      label: t.night || "Night",
      icon: <Moon className="w-3.5 h-3.5" />,
      color: "#48CAE4",
      description: "Starlight, nocturne chill, nocturnal planetary horizon",
    },
  ];

  return (
    <div
      className="relative z-30 py-1.5 px-3 sm:px-4 text-xs border-b transition-colors duration-500 overflow-x-auto no-scrollbar"
      style={{
        backgroundColor: isDark
          ? "rgba(15, 20, 27, 0.92)"
          : "rgba(255, 255, 255, 0.90)",
        borderColor: `${activeConfig.accentColor}30`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 min-w-max">
        {/* Left Side: Atmosphere Label & Permanent Option Switcher */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            <span
              className="w-2 h-2 rounded-full animate-pulse shrink-0"
              style={{ backgroundColor: activeConfig.accentColor }}
            />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-700">
              SOLAR ATMOSPHERE:
            </span>
          </div>

          {/* Permanent Solar Phase Option Buttons Group */}
          <div className="flex items-center gap-0.5 bg-[#171C23] dark:bg-[#171C23] light:bg-slate-200/80 p-0.5 rounded-[5px] border border-[#30353D] dark:border-[#30353D] light:border-slate-300 shadow-inner">
            {phaseButtons.map((btn) => {
              const isSelected = selectedPhase === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => onSelectPhase(btn.id)}
                  title={btn.description}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-mono transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#252A32] dark:bg-[#252A32] light:bg-white text-white dark:text-white light:text-slate-950 border border-[#3F4754] dark:border-[#3F4754] light:border-slate-400 shadow-sm font-bold"
                      : "text-slate-400 dark:text-slate-400 light:text-slate-700 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-950 hover:bg-[#1B2027]/70 dark:hover:bg-[#1B2027]/70 light:hover:bg-white/80 border border-transparent font-medium"
                  }`}
                >
                  <span
                    style={{
                      color: isSelected ? btn.color : undefined,
                    }}
                    className="shrink-0 transition-colors"
                  >
                    {btn.icon}
                  </span>
                  <span>{btn.label}</span>
                  {btn.id === "auto" && selectedPhase === "auto" && (
                    <span
                      className="text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-tight hidden sm:inline"
                      style={{
                        backgroundColor: `${activeConfig.accentColor}25`,
                        color: isDark ? activeConfig.accentColor : "#0369a1",
                      }}
                    >
                      {activeConfig.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Solar Telemetry Status Badge */}
        <div className="hidden lg:flex items-center gap-2.5 font-mono text-[11px] shrink-0">
          {localTimeStr && (
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-400 light:text-slate-700 font-medium">
              <Clock className="w-3 h-3" />
              <span>
                {cityName ? `${cityName} • ` : ""}
                {localTimeStr.slice(11, 16) || localTimeStr}
              </span>
            </div>
          )}
          <div
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] border text-[10px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: isDark ? `${activeConfig.accentColor}18` : "rgba(255, 255, 255, 0.95)",
              borderColor: `${activeConfig.accentColor}60`,
              color: isDark ? activeConfig.accentColor : "#0f172a",
            }}
          >
            <span style={{ color: isDark ? activeConfig.accentColor : "#0284c7" }}>
              {activeConfig.solarStatusBadge}
            </span>
            <span className="text-slate-400 dark:text-slate-400 light:text-slate-500 font-normal">|</span>
            <span className="text-slate-300 dark:text-slate-300 light:text-slate-700 font-medium">{activeConfig.stationTelemetrySub}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
