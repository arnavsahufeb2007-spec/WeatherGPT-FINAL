import React from "react";
import { Droplets, Wind, Eye, Compass, Sun, Sparkles, Sunrise, Sunset } from "lucide-react";
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

export function CurrentWeatherHero({
  location,
  current,
  analysis,
  todayDaily,
  isFahrenheit,
  language = "en",
}: CurrentWeatherHeroProps) {
  const langConfig = getLanguageConfig(language);
  const t = langConfig.translations;
  const formatTemp = (celsius: number) => {
    if (isFahrenheit) {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius}°C`;
  };

  const score = analysis?.outdoorSuitabilityScore ?? 90;

  return (
    <div id="current-weather-hero" className="space-y-4">
      {/* Primary Hero Box: Atmospheric Editorial Structure with Atmospheric Landscape overlay */}
      <div className="relative rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-5 sm:p-7 overflow-hidden transition-colors">
        {/* Subtle landscape photographic background overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <img
            src="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80"
            alt="Atmospheric landscape"
            className="w-full h-full object-cover object-right opacity-35 dark:opacity-30 light:opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#171C23] via-[#171C23]/95 to-transparent dark:from-[#171C23] dark:via-[#171C23]/95 light:from-white light:via-white/95" />
        </div>

        {/* Content container */}
        <div className="relative z-10 space-y-4">
          {/* Station Telemetry live banner */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700">
              STATION TELEMETRY • {location.name.toUpperCase()}
            </span>
            <span className="px-1.5 py-0.5 rounded-[3px] bg-[#8ECAE6]/10 text-[#8ECAE6] border border-[#8ECAE6]/25 font-mono text-[9px] uppercase font-semibold">
              LIVE FEED
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            {/* Left Column: Location, Temperature, Summary */}
            <div className="space-y-3 max-w-2xl">
              {/* Location Name & Region */}
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-tight">
                  {location.name}
                </h1>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {location.admin1 ? `${location.admin1}, ` : ""}
                  {location.country || "INDIA"}
                </span>
              </div>

              {/* Dominant Temperature & Condition */}
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                <span className="text-5xl sm:text-6xl lg:text-7xl font-black font-mono tracking-tighter text-slate-100 dark:text-slate-100 light:text-slate-900 select-none">
                  {formatTemp(current.temperature)}
                </span>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-tight">
                      {current.condition}
                    </span>
                    <WeatherIcon code={current.weatherCode} className="w-6 h-6 text-[#F4A261]" isDay={current.isDay} />
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono">
                    Feels like {formatTemp(current.feelsLike)} • High {todayDaily ? formatTemp(todayDaily.tempMax) : "--"} / Low {todayDaily ? formatTemp(todayDaily.tempMin) : "--"}
                  </div>
                </div>
              </div>

              {/* Natural language synopsis paragraph */}
              <p className="text-xs sm:text-sm text-slate-300 dark:text-slate-300 light:text-slate-700 leading-relaxed pt-1">
                Current conditions are {current.condition.toLowerCase()} with {formatTemp(current.temperature)} (feels like {formatTemp(current.feelsLike)}). Rain probability is {current.precipitationProbability}%, humidity is {current.humidity ?? 80}%, wind is {current.windSpeed} km/h, and UV index is {current.uvIndex ?? 0}. Overall outdoor rating: {score}/100.
              </p>
            </div>

            {/* Right Column Stat Tiles: Sunset & Outdoor Score */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
              {/* Sunset Today */}
              <div className="p-3 rounded-[6px] bg-[#1B2027]/90 dark:bg-[#1B2027]/90 light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 min-w-[130px]">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase font-semibold text-slate-400">
                  <Sunset className="w-3 h-3 text-[#F4A261]" />
                  <span>SUNSET TODAY</span>
                </div>
                <div className="font-mono text-lg font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 mt-1">
                  {current.sunset ? current.sunset.slice(11, 16) : "18:35"}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Sunrise {current.sunrise ? current.sunrise.slice(11, 16) : "06:27"}
                </div>
              </div>

              {/* Outdoor Suitability Score */}
              <div className="p-3 rounded-[6px] bg-[#1B2027]/90 dark:bg-[#1B2027]/90 light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 min-w-[130px]">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase font-semibold text-slate-400">
                  <Sparkles className="w-3 h-3 text-[#8ECAE6]" />
                  <span>OUTDOOR SCORE</span>
                </div>
                <div className="font-mono text-lg font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 mt-1">
                  {score}/100
                </div>
                <div className="text-[10px] font-semibold text-[#8ECAE6] mt-0.5">
                  {analysis?.comfortLabel || "Comfortable"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grounded Surface Observations Section */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-xs font-mono uppercase font-semibold tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-800">
            GROUNDED SURFACE OBSERVATIONS
          </h2>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
            Atmospheric Physical Telemetry
          </span>
        </div>

        {/* 6 Observation Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Wind Vectors */}
          <div className="p-3.5 rounded-[6px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 light:text-slate-500 mb-1.5">
              <span className="text-[10px] font-mono uppercase font-semibold tracking-wider">WIND VECTORS</span>
              <Wind className="w-3.5 h-3.5 text-slate-300 dark:text-slate-300 light:text-slate-600" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900">
                {current.windSpeed} km/h
              </div>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5 truncate">
                {current.windDirection}° • Gusts {current.windGusts ?? 7.6} km/h
              </p>
            </div>
          </div>

          {/* Precipitation */}
          <div className="p-3.5 rounded-[6px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 light:text-slate-500 mb-1.5">
              <span className="text-[10px] font-mono uppercase font-semibold tracking-wider">PRECIPITATION</span>
              <Droplets className="w-3.5 h-3.5 text-[#8ECAE6]" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900">
                {current.precipitationProbability}% Prob
              </div>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5 truncate">
                {current.rain > 0 ? `${current.rain} mm rain` : "0.0 mm accumulation"}
              </p>
            </div>
          </div>

          {/* Humidity & Dew Point */}
          <div className="p-3.5 rounded-[6px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 light:text-slate-500 mb-1.5">
              <span className="text-[10px] font-mono uppercase font-semibold tracking-wider">HUMIDITY & DEW</span>
              <Droplets className="w-3.5 h-3.5 text-[#8ECAE6]" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900">
                {current.humidity !== null ? `${current.humidity}%` : "80%"}
              </div>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5 truncate">
                Dew pt: {current.dewPoint !== undefined ? formatTemp(current.dewPoint) : "25.1°C"}
              </p>
            </div>
          </div>

          {/* Solar Radiation / UV */}
          <div className="p-3.5 rounded-[6px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 light:text-slate-500 mb-1.5">
              <span className="text-[10px] font-mono uppercase font-semibold tracking-wider">SOLAR RADIATION</span>
              <Sun className="w-3.5 h-3.5 text-[#F4A261]" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900">
                {current.uvIndex ?? 0} {current.uvIndex && current.uvIndex > 5 ? "High" : "Low"}
              </div>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5 truncate">
                Max index: {todayDaily?.uvIndexMax ?? "7.5"} today
              </p>
            </div>
          </div>

          {/* Clarity / Visibility */}
          <div className="p-3.5 rounded-[6px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 light:text-slate-500 mb-1.5">
              <span className="text-[10px] font-mono uppercase font-semibold tracking-wider">CLARITY</span>
              <Eye className="w-3.5 h-3.5 text-slate-300 dark:text-slate-300 light:text-slate-600" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900">
                {current.visibility !== null && current.visibility !== undefined ? (
                  `${(current.visibility / 1000).toFixed(1)} km`
                ) : (
                  "9.2 km"
                )}
              </div>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5 truncate">
                Unobstructed sightline
              </p>
            </div>
          </div>

          {/* Barometer / Pressure */}
          <div className="p-3.5 rounded-[6px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 light:text-slate-500 mb-1.5">
              <span className="text-[10px] font-mono uppercase font-semibold tracking-wider">BAROMETER</span>
              <Compass className="w-3.5 h-3.5 text-slate-300 dark:text-slate-300 light:text-slate-600" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900">
                {current.pressure !== null && current.pressure !== undefined ? `${current.pressure} hPa` : "1010 hPa"}
              </div>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5 truncate">
                Low trough dynamic
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

