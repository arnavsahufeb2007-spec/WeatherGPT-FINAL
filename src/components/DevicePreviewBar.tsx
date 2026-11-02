import React from "react";
import { Smartphone, Tablet, Laptop, Monitor, Maximize2, X } from "lucide-react";
import { getTranslations } from "../translations/registry.js";

export type DeviceMode = "auto" | "phone" | "tablet" | "laptop" | "desktop";

interface DevicePreviewBarProps {
  deviceMode: DeviceMode;
  onChangeDeviceMode: (mode: DeviceMode) => void;
  onClose?: () => void;
  preferredLanguage?: string;
}

export function DevicePreviewBar({ deviceMode, onChangeDeviceMode, onClose, preferredLanguage }: DevicePreviewBarProps) {
  const t = getTranslations(preferredLanguage);
  const devices: { mode: DeviceMode; label: string; icon: React.ReactNode; width: string }[] = [
    { mode: "auto", label: t.responsiveAuto || "Auto (Responsive)", icon: <Maximize2 className="w-3.5 h-3.5" />, width: "100%" },
    { mode: "phone", label: t.phone || "Phone", icon: <Smartphone className="w-3.5 h-3.5" />, width: "375px" },
    { mode: "tablet", label: t.tablet || "Tablet", icon: <Tablet className="w-3.5 h-3.5" />, width: "768px" },
    { mode: "laptop", label: t.laptop || "Laptop", icon: <Laptop className="w-3.5 h-3.5" />, width: "1024px" },
    { mode: "desktop", label: t.desktop || "Desktop", icon: <Monitor className="w-3.5 h-3.5" />, width: "1440px" },
  ];

  return (
    <div className="bg-[#0F141B] dark:bg-[#0F141B] light:bg-slate-100 border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200 py-1 px-4 text-xs flex items-center justify-between z-40 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {t.viewport || "VIEWPORT:"}
        </span>
        <div className="flex items-center gap-0.5 bg-[#171C23] dark:bg-[#171C23] light:bg-white p-0.5 rounded-[4px] border border-[#30353D] dark:border-[#30353D] light:border-slate-200">
          {devices.map((d) => {
            const isSelected = deviceMode === d.mode;
            return (
              <button
                key={d.mode}
                onClick={() => onChangeDeviceMode(d.mode)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] text-[11px] font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#252A32] dark:bg-[#252A32] light:bg-slate-200 text-slate-100 dark:text-slate-100 light:text-slate-900 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 font-semibold"
                    : "text-slate-400 hover:text-slate-100 dark:text-slate-400 dark:hover:text-slate-100 light:text-slate-600 light:hover:text-slate-900 hover:bg-[#1B2027] dark:hover:bg-[#1B2027] light:hover:bg-slate-100 border border-transparent"
                }`}
                title={`Simulate ${d.label} (${d.width})`}
              >
                {d.icon}
                <span className="hidden sm:inline">{d.label}</span>
                {isSelected && d.mode !== "auto" && (
                  <span className="text-[9px] font-mono opacity-80 hidden md:inline">({d.width})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400 hidden lg:inline">
          Breakpoints test calibrated
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-[3px] text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            title="Hide preview bar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
