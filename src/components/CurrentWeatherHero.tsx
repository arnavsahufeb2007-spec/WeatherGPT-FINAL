import React from "react";
import { Droplets, Wind, Eye, Compass, Sun, ShieldAlert, Sparkles, Sunrise, Sunset, Flame } from "lucide-react";
import { CurrentWeatherData, DailyForecastItem, LocationInfo, WeatherAnalysis } from "../types.js";
import { WeatherIcon } from "./WeatherIcons.js";
import { getLanguageConfig } from "../languages.js";

interface CurrentWeatherHeroProps {
  location: LocationInfo;
  current: CurrentWeatherData;
  analysis?: WeatherAnalysis;
  todayDaily?: DailyForecastItem;
  isFahrenheit: boolean;
  language?: string;
}

export function CurrentWeatherHero({ location, current, analysis, todayDaily, isFahrenheit, language = "en" }: CurrentWeatherHeroProps) {
  const langConfig = getLanguageConfig(language);
  const t = langConfig.translations;
  const formatTemp = (celsius: number) => {
    if (isFahrenheit) {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius}°C`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 60) return "text-sky-400 bg-sky-500/10 border-sky-500/20";
    if (score >= 40) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  const score = analysis?.outdoorSuitabilityScore ?? 80;

  return (
    <div className="space-y-4">
      {/* Primary Hero Box */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/90 p-6 md:p-8 shadow-xl">
        {/* Subtle atmospheric glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Main Temp & Condition */}
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1 font-medium">
              <span>{location.name}</span>
              {location.admin1 && <span>• {location.admin1}</span>}
              <span>• {location.country}</span>
            </div>

            <div className="flex items-baseline gap-4 mt-2">
              <span className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white">
                {formatTemp(current.temperature)}
              </span>
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-medium text-slate-200">{current.condition}</span>
                <span className="text-xs text-slate-400">{t.feelsLike} {formatTemp(current.feelsLike)}</span>
              </div>
            </div>

            {todayDaily && (
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-300 font-medium">
                <span>High: <strong className="text-white">{formatTemp(todayDaily.tempMax)}</strong></span>
                <span>Low: <strong className="text-white">{formatTemp(todayDaily.tempMin)}</strong></span>
                <span>{t.precipitation}: <strong className="text-white">{todayDaily.precipitationProbabilityMax}%</strong></span>
              </div>
            )}
          </div>

          {/* Icon & Outdoor Score Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 self-start md:self-auto">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center">
              <WeatherIcon code={current.weatherCode} className="w-14 h-14" isDay={current.isDay} />
            </div>

            <div className={`px-4 py-3 rounded-2xl border flex flex-col items-center justify-center min-w-[140px] ${getScoreColor(score)}`}>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.outdoorScore}</span>
              </div>
              <span className="text-2xl font-black mt-0.5">{score} <span className="text-xs font-normal opacity-70">/ 100</span></span>
              <span className="text-[11px] font-medium mt-0.5 text-center">{analysis?.comfortLabel || "Comfortable"}</span>
            </div>
          </div>
        </div>

        {/* Intelligence Statement Bar */}
        {analysis?.summary && (
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
            <div className="p-1 rounded bg-sky-500/10 text-sky-400 shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>{analysis.summary}</span>
          </div>
        )}
      </div>

      {/* Meteorological Parameters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Rain */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{t.precipitation}</span>
            <Droplets className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <span className="text-xl font-bold text-white">{current.precipitationProbability}%</span>
            <p className="text-[11px] text-slate-400 mt-0.5">{current.rain > 0 ? `${current.rain} mm rain` : "No rain falling"}</p>
          </div>
        </div>

        {/* Wind */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{t.windSpeed}</span>
            <Wind className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <span className="text-xl font-bold text-white">{current.windSpeed} <span className="text-xs font-normal text-slate-400">km/h</span></span>
            <p className="text-[11px] text-slate-400 mt-0.5">Gusts: {current.windGusts} km/h • {current.windDirection}°</p>
          </div>
        </div>

        {/* Humidity */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{t.humidity}</span>
            <Droplets className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="text-xl font-bold text-white">{current.humidity}%</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {current.dewPoint !== undefined ? `Dew pt: ${formatTemp(current.dewPoint)}` : "Normal range"}
            </p>
          </div>
        </div>

        {/* UV Index */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{t.uvIndex}</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-xl font-bold text-white">{current.uvIndex} <span className="text-xs font-normal text-slate-400">/ 12</span></span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {current.uvIndex >= 8 ? "Very High risk" : current.uvIndex >= 6 ? "High protection" : current.uvIndex >= 3 ? "Moderate" : "Low risk"}
            </p>
          </div>
        </div>

        {/* Visibility */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{t.visibility}</span>
            <Eye className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-xl font-bold text-white">{(current.visibility / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-400">km</span></span>
            <p className="text-[11px] text-slate-400 mt-0.5">{current.visibility < 3000 ? "Haze or Fog" : "Clear sightline"}</p>
          </div>
        </div>

        {/* Pressure & Sun */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Sun Times</span>
            <Sunrise className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Rise: {current.sunrise.slice(11, 16)}</span>
            <span className="text-xs font-bold text-slate-300 block mt-0.5">Set: {current.sunset.slice(11, 16)}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">{current.pressure} hPa</p>
          </div>
        </div>
      </div>
    </div>
  );
}
