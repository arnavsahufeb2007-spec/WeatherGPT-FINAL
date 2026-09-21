import React from "react";
import { DailyForecastItem } from "../types.js";
import { WeatherIcon } from "./WeatherIcons.js";
import { Calendar, Droplets, Sun } from "lucide-react";

interface DailyForecastListProps {
  daily: DailyForecastItem[];
  isFahrenheit: boolean;
}

export function DailyForecastList({ daily, isFahrenheit }: DailyForecastListProps) {
  const formatTemp = (celsius: number) => {
    if (isFahrenheit) {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  };

  // Find min and max across entire 7-day range for proportional bar width
  const allMins = daily.map((d) => d.tempMin);
  const allMaxs = daily.map((d) => d.tempMax);
  const globalMin = Math.min(...allMins);
  const globalMax = Math.max(...allMaxs);
  const tempRange = Math.max(1, globalMax - globalMin);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-sky-500 dark:text-sky-400" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase">7-Day Extended Outlook</h3>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
        {daily.map((item, idx) => {
          const leftPercent = Math.max(0, ((item.tempMin - globalMin) / tempRange) * 100);
          const barWidth = Math.max(12, ((item.tempMax - item.tempMin) / tempRange) * 100);

          return (
            <div key={item.date} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Day & Condition */}
              <div className="flex items-center gap-3 sm:w-48 shrink-0">
                <WeatherIcon code={item.weatherCode} className="w-6 h-6" />
                <div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                    {idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : item.dayName}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{item.condition}</span>
                </div>
              </div>

              {/* Rain & UV */}
              <div className="flex items-center gap-4 text-xs sm:w-40 shrink-0">
                <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400 font-medium">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>{item.precipitationProbabilityMax}%</span>
                  {item.rainSum > 0 && <span className="text-slate-400 text-[11px]">({item.rainSum} mm)</span>}
                </div>
                <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-medium">
                  <Sun className="w-3.5 h-3.5" />
                  <span>UV {item.uvIndexMax}</span>
                </div>
              </div>

              {/* Temperature Bar & Values */}
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-8 text-right">
                  {formatTemp(item.tempMin)}°
                </span>

                <div className="relative h-2 flex-1 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-400 to-amber-400"
                    style={{ left: `${leftPercent}%`, width: `${barWidth}%` }}
                  />
                </div>

                <span className="text-xs font-bold text-slate-900 dark:text-white w-8">
                  {formatTemp(item.tempMax)}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
