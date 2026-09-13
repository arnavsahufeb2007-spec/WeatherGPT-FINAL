import React from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudSnow,
  CloudFog,
  LucideProps,
} from "lucide-react";

export function WeatherIcon({ code, className = "w-6 h-6", isDay = true }: { code: number; className?: string; isDay?: boolean }) {
  if (code === 0) {
    return <Sun className={`${className} text-amber-400`} />;
  }
  if (code === 1 || code === 2) {
    return <CloudSun className={`${className} text-amber-300`} />;
  }
  if (code === 3) {
    return <Cloud className={`${className} text-slate-300`} />;
  }
  if (code === 45 || code === 48) {
    return <CloudFog className={`${className} text-slate-400`} />;
  }
  if ([51, 53, 55, 56, 57].includes(code)) {
    return <CloudDrizzle className={`${className} text-sky-400`} />;
  }
  if ([61, 63, 65, 80, 81, 82].includes(code)) {
    return <CloudRain className={`${className} text-blue-400`} />;
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return <CloudSnow className={`${className} text-cyan-200`} />;
  }
  if ([95, 96, 99].includes(code)) {
    return <CloudLightning className={`${className} text-yellow-400`} />;
  }
  return <CloudSun className={`${className} text-sky-300`} />;
}
