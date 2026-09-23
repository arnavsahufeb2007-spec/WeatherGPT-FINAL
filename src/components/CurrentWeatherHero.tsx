import React, { useState, useMemo } from "react";
import {
  CurrentWeatherData,
  DailyForecastItem,
  LocationInfo,
  WeatherAnalysis,
} from "../types.js";
import { WeatherIcon } from "./WeatherIcons.js";
import {
  Wind,
  Droplets,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Sparkles,
  Eye,
  Compass,
  MapPin,
  Clock,
  Activity,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { getLanguageConfig } from "../languages.js";
import {
  DiurnalPhase,
  determineDiurnalPhase,
  DIURNAL_PHASE_CONFIGS,
} from "../services/diurnalTheme.js";

export { determineDiurnalPhase, type DiurnalPhase };

interface CurrentWeatherHeroProps {
  location: LocationInfo;
  current: CurrentWeatherData;
  analysis?: WeatherAnalysis;
  todayDaily?: DailyForecastItem;
  isFahrenheit: boolean;
  language?: string;
  activePhaseOverride?: DiurnalPhase | "auto";
  onPhaseChange?: (phase: DiurnalPhase | "auto") => void;
}

export function CurrentWeatherHero({
  location,
  current,
  analysis,
  todayDaily,
  isFahrenheit,
  language = "en",
  activePhaseOverride,
  onPhaseChange,
}: CurrentWeatherHeroProps) {
  const langConfig = getLanguageConfig(language);
  const t = langConfig.translations;

  // Selected phase state: defaults to "auto" (synchronizing with actual solar position) or activePhaseOverride
  const [internalSelectedPhase, setInternalSelectedPhase] = useState<DiurnalPhase | "auto">("auto");
  const selectedPhase = activePhaseOverride !== undefined ? activePhaseOverride : internalSelectedPhase;

  const detectedPhase = useMemo(
    () => determineDiurnalPhase(current.time, current.sunrise, current.sunset, current.isDay),
    [current.time, current.sunrise, current.sunset, current.isDay]
  );

  const activePhase: DiurnalPhase = selectedPhase === "auto" ? detectedPhase : selectedPhase;
  const phaseConfig = DIURNAL_PHASE_CONFIGS[activePhase];

  const cyclePhases: (DiurnalPhase | "auto")[] = ["auto", "dawn", "day", "golden_hour", "dusk", "night"];
  const handleCyclePhase = () => {
    const idx = cyclePhases.indexOf(selectedPhase);
    const nextIdx = (idx + 1) % cyclePhases.length;
    const nextPhase = cyclePhases[nextIdx];
    if (onPhaseChange) {
      onPhaseChange(nextPhase);
    } else {
      setInternalSelectedPhase(nextPhase);
    }
  };

  const formatTemp = (celsius?: number) => {
    if (celsius === undefined || celsius === null) return "--";
    if (isFahrenheit) {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius}°C`;
  };

  const score = analysis?.outdoorSuitabilityScore ?? 100;

  const renderPhaseIcon = () => {
    switch (phaseConfig.iconName) {
      case "sunrise":
        return <Sunrise className="w-3.5 h-3.5" style={{ color: phaseConfig.accentColor }} />;
      case "sun":
        return <Sun className="w-3.5 h-3.5" style={{ color: phaseConfig.accentColor }} />;
      case "sunset":
        return <Sunset className="w-3.5 h-3.5" style={{ color: phaseConfig.accentColor }} />;
      case "sparkles":
        return <Sparkles className="w-3.5 h-3.5" style={{ color: phaseConfig.accentColor }} />;
      case "moon":
        return <Moon className="w-3.5 h-3.5" style={{ color: phaseConfig.accentColor }} />;
      default:
        return <Sun className="w-3.5 h-3.5" style={{ color: phaseConfig.accentColor }} />;
    }
  };

  return (
    <div id="current-weather-hero" className="space-y-4">
      {/* Primary Atmospheric Hero Card with Diurnally Adaptive Backdrop */}
      <div
        id="hero-atmospheric-card"
        data-solar-phase={activePhase}
        className="hero-atmospheric-card relative rounded-[8px] bg-[#0F141B] border border-[#252A32] p-5 sm:p-7 overflow-hidden transition-colors shadow-sm"
      >
        {/* Diurnal photographic backdrop adapting to solar phase */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
          <img
            key={phaseConfig.backgrounds.home.photoUrl}
            src={phaseConfig.backgrounds.home.photoUrl}
            alt={phaseConfig.backgrounds.home.photoAlt}
            className="w-full h-full object-cover object-right opacity-70 transition-opacity duration-700 ease-in-out"
          />
          {/* Multi-stop gradient calibrated per phase for pristine typography contrast & warm solar radiance */}
          <div
            className="absolute inset-0 transition-colors duration-700"
            style={{
              background: `linear-gradient(90deg, rgba(13,19,26,0.95) 0%, rgba(13,19,26,0.85) 60%, rgba(13,19,26,0.3) 100%)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F141B]/80 via-transparent to-transparent" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 space-y-5">
          {/* Top Status Banner: Station Telemetry, Diurnal Phase Interactive Badge & Live Feed */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="hero-surface-badge inline-flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#14181F]/80 border border-[#252A32] backdrop-blur-sm">
                <span
                  className="w-2 h-2 rounded-full shrink-0 transition-colors duration-500"
                  style={{ backgroundColor: phaseConfig.accentColor }}
                />
                <span className="hero-secondary-text text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-200">
                  STATION TELEMETRY • {location.name.toUpperCase()}
                </span>
                <span
                  className="font-mono text-[9px] uppercase font-bold tracking-wider ml-1 transition-colors duration-500"
                  style={{ color: phaseConfig.accentColor }}
                >
                  {phaseConfig.stationTelemetrySub}
                </span>
              </div>

              {/* Diurnal Phase Interactive Tag (Click to cycle through all 5 diurnal phases or return to live) */}
              <button
                type="button"
                id="diurnal-phase-toggle-btn"
                onClick={handleCyclePhase}
                title={`Solar phase: ${phaseConfig.name}. Click to explore other phases of the day.`}
                className="hero-surface-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#14181F]/80 hover:bg-[#1C232D] border border-[#252A32] backdrop-blur-sm text-[11px] font-mono transition-all cursor-pointer select-none group"
              >
                {renderPhaseIcon()}
                <span className="font-semibold uppercase tracking-wider" style={{ color: phaseConfig.accentColor }}>
                  {phaseConfig.solarStatusBadge}
                </span>
                {selectedPhase === "auto" ? (
                  <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider ml-1 px-1 py-0.2 rounded bg-emerald-950/40 border border-emerald-500/30">
                    LIVE
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-[#8ECAE6] font-medium uppercase tracking-wider ml-1">
                    PREVIEW
                  </span>
                )}
              </button>
            </div>

            <div className="hero-surface-badge flex items-center gap-2 text-[11px] font-mono text-slate-300 bg-[#14181F]/70 px-2.5 py-1 rounded-[4px] border border-[#252A32] backdrop-blur-sm">
              <Clock className="w-3.5 h-3.5 text-slate-400 hero-muted-text" />
              <span className="hero-secondary-text text-slate-300">
                {current.time ? current.time.replace("T", " • ") : "Synoptic Real-Time"}
              </span>
            </div>
          </div>

          {/* Location Title Header */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="hero-primary-text text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight">
              {location.name}
            </h1>
            <span className="hero-accent-sky text-xs font-mono font-semibold uppercase tracking-wider text-[#8ECAE6]">
              {location.admin1 ? `${location.admin1.toUpperCase()}, ` : ""}
              {location.country ? location.country.toUpperCase() : "INDIA"}
            </span>
          </div>

          {/* Temperature & Weather Condition Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-5 sm:gap-6 flex-wrap">
              <span className="hero-primary-text text-6xl sm:text-7xl font-light font-mono tracking-tight text-slate-100 select-none">
                {formatTemp(current.temperature)}
              </span>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span className="hero-primary-text text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                    {current.condition}
                  </span>
                  <WeatherIcon
                    code={current.weatherCode}
                    className="w-6 h-6 hero-accent-amber"
                    isDay={activePhase === "day" || activePhase === "dawn" || activePhase === "golden_hour"}
                  />
                </div>
                <div className="hero-muted-text text-xs text-slate-300 mt-1 font-mono">
                  Feels like {formatTemp(current.feelsLike)} • High {todayDaily ? formatTemp(todayDaily.tempMax) : "--"} / Low {todayDaily ? formatTemp(todayDaily.tempMin) : "--"}
                </div>
              </div>
            </div>

            {/* Solar Transition & Outdoor Score Unified Glass Card */}
            <div className="hero-surface-badge p-3.5 rounded-[8px] bg-[#14181F]/80 backdrop-blur-md border border-[#252A32] flex items-center gap-5 shrink-0 self-start sm:self-center">
              {/* Context-Aware Solar Transition (Sunset during Day / Next Sunrise at Night) */}
              <div>
                <div className="hero-muted-text text-[10px] font-mono uppercase text-slate-300 tracking-wider">
                  {activePhase === "night" || activePhase === "dusk" ? "NEXT SUNRISE" : "SUNSET TODAY"}
                </div>
                <div className="hero-primary-text font-mono text-lg font-bold text-slate-100 mt-0.5">
                  {activePhase === "night" || activePhase === "dusk"
                    ? (current.sunrise ? current.sunrise.slice(11, 16) : "06:09")
                    : (current.sunset ? current.sunset.slice(11, 16) : "18:17")}
                </div>
                <div className="hero-muted-text text-[10px] font-mono text-slate-300 mt-0.5">
                  {activePhase === "night" || activePhase === "dusk"
                    ? `Sunset was ${current.sunset ? current.sunset.slice(11, 16) : "18:17"}`
                    : `Sunrise ${current.sunrise ? current.sunrise.slice(11, 16) : "06:09"}`}
                </div>
              </div>

              {/* Vertical hairline divider */}
              <div className="w-px h-10 bg-[#252A32]" />

              {/* Outdoor Score */}
              <div>
                <div className="hero-muted-text text-[10px] font-mono uppercase text-slate-300 tracking-wider">
                  OUTDOOR SCORE
                </div>
                <div className="hero-primary-text font-mono text-lg font-bold text-slate-100 mt-0.5">
                  {score} <span className="hero-muted-text text-xs font-normal text-slate-400 font-mono">/100</span>
                </div>
                <div className="hero-secondary-text text-[10px] text-slate-200 mt-0.5">
                  {analysis?.comfortLabel || "Warm, lightly humid"}
                </div>
              </div>
            </div>
          </div>

          {/* Meteorological Synopsis with Diurnally Coordinated Accent Border */}
          <div
            className="border-l-2 pl-3.5 py-0.5 transition-colors duration-500"
            style={{ borderColor: phaseConfig.accentColor }}
          >
            <p className="hero-secondary-text text-xs sm:text-sm text-slate-200 leading-relaxed max-w-4xl">
              Current conditions are {current.condition.toLowerCase()} with {formatTemp(current.temperature)} (feels like {formatTemp(current.feelsLike)}). Rain probability is {current.precipitationProbability}%, humidity is {current.humidity ?? 80}%, wind is {current.windSpeed} km/h, and UV index is {current.uvIndex ?? 0}. Overall outdoor rating: {score}/100.
            </p>
          </div>
        </div>
      </div>

      {/* Grounded Surface Observations Section with Diurnal Context */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-xs font-mono uppercase font-semibold tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-800">
            GROUNDED SURFACE OBSERVATIONS
          </h2>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
            {phaseConfig.surfaceTelemetrySubtitle}
          </span>
        </div>

        {/* 6 Metric Observation Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Wind Vectors */}
          <div
            className={`p-3.5 rounded-[8px] bg-[#14181F] dark:bg-[#14181F] light:bg-white border border-[#252A32] dark:border-[#252A32] light:border-slate-200 flex flex-col justify-between transition-colors ${
              activePhase === "dusk" ? "ring-1 ring-[#C084FC]/40" : ""
            }`}
          >
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
          <div className="p-3.5 rounded-[8px] bg-[#14181F] dark:bg-[#14181F] light:bg-white border border-[#252A32] dark:border-[#252A32] light:border-slate-200 flex flex-col justify-between transition-colors">
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
          <div
            className={`p-3.5 rounded-[8px] bg-[#14181F] dark:bg-[#14181F] light:bg-white border border-[#252A32] dark:border-[#252A32] light:border-slate-200 flex flex-col justify-between transition-colors ${
              activePhase === "dawn" ? "ring-1 ring-[#E76F51]/40" : ""
            }`}
          >
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
          <div
            className={`p-3.5 rounded-[8px] bg-[#14181F] dark:bg-[#14181F] light:bg-white border border-[#252A32] dark:border-[#252A32] light:border-slate-200 flex flex-col justify-between transition-colors ${
              activePhase === "day" ? "ring-1 ring-[#38BDF8]/40" : ""
            }`}
          >
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
          <div
            className={`p-3.5 rounded-[8px] bg-[#14181F] dark:bg-[#14181F] light:bg-white border border-[#252A32] dark:border-[#252A32] light:border-slate-200 flex flex-col justify-between transition-colors ${
              activePhase === "golden_hour" ? "ring-1 ring-[#F4A261]/40" : ""
            }`}
          >
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
          <div
            className={`p-3.5 rounded-[8px] bg-[#14181F] dark:bg-[#14181F] light:bg-white border border-[#252A32] dark:border-[#252A32] light:border-slate-200 flex flex-col justify-between transition-colors ${
              activePhase === "night" ? "ring-1 ring-[#8ECAE6]/40" : ""
            }`}
          >
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
