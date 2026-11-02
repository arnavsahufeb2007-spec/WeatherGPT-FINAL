import React from "react";
import { DailyForecastItem } from "../types.js";
import { WeatherIcon } from "./WeatherIcons.js";
import { Calendar, Droplets, Sun } from "lucide-react";
import { getTranslations, getLocalizedDayName, getLocalizedWeatherCondition } from "../languages.js";

interface DailyForecastListProps {
  daily: DailyForecastItem[];
  isFahrenheit: boolean;
  preferredLanguage?: string;
}

export function DailyForecastList({ daily, isFahrenheit, preferredLanguage }: DailyForecastListProps) {
  const t = getTranslations(preferredLanguage);

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
    <div id="daily-forecast-list" className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-5 transition-colors">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8ECAE6]" />
            <h3 className="text-xs font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-wider uppercase">
              {t.sevenDayOutlook}
            </h3>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
            {t.deterministicProgression}
          </p>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[3px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 text-slate-400 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 shrink-0">
          {t.badgeDeterministic}
        </span>
      </div>

      <div className="divide-y divide-[#30353D] dark:divide-[#30353D] light:divide-slate-200">
        {daily.map((item, idx) => {
          const leftPercent = Math.max(0, ((item.tempMin - globalMin) / tempRange) * 100);
          const barWidth = Math.max(12, ((item.tempMax - item.tempMin) / tempRange) * 100);
          const isToday = idx === 0;

          return (
            <div
              key={item.date}
              className={`py-3 px-2 sm:px-3 rounded-[6px] my-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition-all duration-150 ${
                isToday
                  ? "bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#F4A261]/50 shadow-sm"
                  : "border border-transparent hover:bg-[#1B2027]/50 dark:hover:bg-[#1B2027]/50 light:hover:bg-slate-50/60"
              }`}
            >
              {/* Day & Condition */}
              <div className="flex items-center gap-2.5 sm:w-44 shrink-0">
                <WeatherIcon code={item.weatherCode} className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-semibold block truncate ${
                        isToday
                          ? "text-[#F4A261] font-bold"
                          : "text-slate-200 dark:text-slate-200 light:text-slate-900"
                      }`}
                    >
                      {idx === 0
                        ? t.today
                        : idx === 1
                        ? t.tomorrow
                        : getLocalizedDayName(item.date, item.dayName, preferredLanguage)}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-[3px] bg-[#F4A261] text-[#0F141B] font-bold">
                        {t.activeBadge || "Active"}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500 capitalize block truncate">
                    {getLocalizedWeatherCondition(item.weatherCode, item.condition, preferredLanguage)}
                  </span>
                </div>
              </div>

              {/* Rain & UV */}
              <div className="flex items-center gap-3 text-xs sm:w-40 shrink-0 font-mono">
                <div className="flex items-center gap-1 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 font-medium">
                  <Droplets className="w-3 h-3 shrink-0" />
                  <span>{item.precipitationProbabilityMax}%</span>
                  {item.rainSum > 0 && <span className="text-slate-400 text-[10px]">({item.rainSum}mm)</span>}
                </div>
                <div className="flex items-center gap-1 text-[#F4A261] dark:text-[#F4A261] light:text-amber-700 font-medium">
                  <Sun className="w-3 h-3 shrink-0" />
                  <span>UV {item.uvIndexMax}</span>
                </div>
              </div>

              {/* Temperature Bar & Min/Max Values */}
              <div className="flex items-center gap-2.5 flex-1 min-w-[140px]">
                <span className="text-xs font-mono font-semibold text-slate-400 dark:text-slate-400 light:text-slate-500 w-8 text-right shrink-0">
                  {formatTemp(item.tempMin)}°
                </span>

                <div className="relative h-1.5 flex-1 bg-[#252A32] dark:bg-[#252A32] light:bg-slate-200 rounded-[2px] overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 rounded-[2px] bg-gradient-to-r from-[#8ECAE6] to-[#F4A261]"
                    style={{ left: `${leftPercent}%`, width: `${barWidth}%` }}
                  />
                </div>

                <span className="text-xs font-mono font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 w-8 shrink-0">
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
