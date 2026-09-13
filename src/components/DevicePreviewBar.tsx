import React from "react";
import { Smartphone, Tablet, Laptop, Monitor, Maximize2, X } from "lucide-react";

export type DeviceMode = "auto" | "phone" | "tablet" | "laptop" | "desktop";

interface DevicePreviewBarProps {
  deviceMode: DeviceMode;
  onChangeDeviceMode: (mode: DeviceMode) => void;
  onClose?: () => void;
}

export function DevicePreviewBar({ deviceMode, onChangeDeviceMode, onClose }: DevicePreviewBarProps) {
  const devices: { mode: DeviceMode; label: string; icon: React.ReactNode; width: string }[] = [
    { mode: "auto", label: "Auto (Responsive)", icon: <Maximize2 className="w-3.5 h-3.5" />, width: "100%" },
    { mode: "phone", label: "Phone", icon: <Smartphone className="w-3.5 h-3.5" />, width: "375px" },
    { mode: "tablet", label: "Tablet", icon: <Tablet className="w-3.5 h-3.5" />, width: "768px" },
    { mode: "laptop", label: "Laptop", icon: <Laptop className="w-3.5 h-3.5" />, width: "1024px" },
    { mode: "desktop", label: "Desktop", icon: <Monitor className="w-3.5 h-3.5" />, width: "1440px" },
  ];

  return (
    <div className="bg-slate-900/95 dark:bg-slate-950/95 light:bg-slate-100 border-b border-slate-800 dark:border-slate-800 light:border-slate-300 py-1.5 px-4 text-xs flex items-center justify-between z-40 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Device Layout:
        </span>
        <div className="flex items-center gap-1 bg-slate-950/70 dark:bg-slate-900/80 light:bg-white p-0.5 rounded-lg border border-slate-800 dark:border-slate-800 light:border-slate-300">
          {devices.map((d) => {
            const isSelected = deviceMode === d.mode;
            return (
              <button
                key={d.mode}
                onClick={() => onChangeDeviceMode(d.mode)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isSelected
                    ? "bg-sky-500 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-white dark:text-slate-400 dark:hover:text-white light:text-slate-600 light:hover:text-slate-900"
                }`}
                title={`Simulate ${d.label} (${d.width})`}
              >
                {d.icon}
                <span className="hidden sm:inline">{d.label}</span>
                {isSelected && d.mode !== "auto" && (
                  <span className="text-[9px] opacity-80 hidden md:inline">({d.width})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400 hidden lg:inline">
          Testing layout across all viewport breakpoints
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
            title="Hide preview bar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
