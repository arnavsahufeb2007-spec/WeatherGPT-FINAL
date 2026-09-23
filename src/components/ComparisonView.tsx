import React, { useState, useEffect } from "react";
import { ComparisonAnalysis, LocationInfo } from "../types.js";
import { compareLocationsAPI } from "../services/api.js";
import { GitCompare, MapPin, Sparkles, Plus, Trash2, Calendar, AlertCircle, Zap, ShieldCheck } from "lucide-react";
import { WeatherIcon } from "./WeatherIcons.js";
import { DiurnalPhase, DiurnalPhaseConfig } from "../services/diurnalTheme.js";

const DEFAULT_PRESET_COMPARISONS = [
  { label: "Bhopal vs Ujjain", cities: ["Bhopal", "Ujjain"] },
  { label: "Delhi vs Mumbai", cities: ["Delhi", "Mumbai"] },
  { label: "Bengaluru vs Hyderabad", cities: ["Bengaluru", "Hyderabad"] },
  { label: "London vs Paris", cities: ["London", "Paris"] },
];

interface ComparisonViewProps {
  isFahrenheit: boolean;
  currentLocation?: LocationInfo | null;
  diurnalPhase?: DiurnalPhase;
  diurnalConfig?: DiurnalPhaseConfig;
}

export function ComparisonView({ isFahrenheit, currentLocation, diurnalPhase, diurnalConfig }: ComparisonViewProps) {
  const [cityInputs, setCityInputs] = useState<string[]>(() =>
    currentLocation?.name ? [currentLocation.name, ""] : ["", ""]
  );
  const [selectedDay, setSelectedDay] = useState<"current" | "tomorrow">("current");
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentLocation?.name) {
      setCityInputs((prev) => {
        if (!prev[0] || prev[0] === "Delhi") {
          const next = [...prev];
          next[0] = currentLocation.name;
          return next;
        }
        return prev;
      });
    }
  }, [currentLocation?.name]);

  const handleCompare = async (citiesToCompare = cityInputs, targetDay = selectedDay) => {
    const valid = citiesToCompare.map((c) => c.trim()).filter(Boolean);
    if (valid.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const timeContext = targetDay === "tomorrow" ? { isTomorrow: true } : undefined;
      const res = await compareLocationsAPI(valid, timeContext);
      setComparison(res);
    } catch (err: any) {
      setError(err.message || "Failed to compare locations");
    } finally {
      setLoading(false);
    }
  };

  const addCity = () => {
    if (cityInputs.length < 4) {
      setCityInputs([...cityInputs, ""]);
    }
  };

  const removeCity = (index: number) => {
    if (cityInputs.length > 2) {
      const next = [...cityInputs];
      next.splice(index, 1);
      setCityInputs(next);
    }
  };

  const updateCity = (index: number, val: string) => {
    const next = [...cityInputs];
    next[index] = val;
    setCityInputs(next);
  };

  const formatTemp = (celsius?: number) => {
    if (celsius === undefined) return "--";
    if (isFahrenheit) {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius}°C`;
  };

  return (
    <div id="comparison-view" className="space-y-4 sm:space-y-5">
      {/* Comparison Hero Banner with Telemetry HUD */}
      <div
        data-atmospheric-banner="true"
        className="hero-atmospheric-card atmospheric-hero-card relative rounded-[8px] bg-[#0F141B] border border-[#30353D] p-5 sm:p-6 overflow-hidden transition-colors shadow-lg"
        style={diurnalConfig ? { borderColor: `${diurnalConfig.accentColor}40` } : undefined}
      >
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <img
            key={diurnalConfig?.backgrounds.explore.photoUrl || "standard"}
            src={
              diurnalConfig?.backgrounds.explore.photoUrl ||
              "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1600&q=80"
            }
            alt={diurnalConfig?.backgrounds.explore.photoAlt || "Multi-Horizon Sky"}
            className="w-full h-full object-cover object-center opacity-75 dark:opacity-70 transition-opacity duration-700"
          />
          <div
            className="absolute inset-0 transition-colors duration-700"
            style={{
              background: diurnalConfig
                ? "linear-gradient(90deg, rgba(13,19,26,0.94) 0%, rgba(13,19,26,0.80) 55%, rgba(13,19,26,0.25) 100%)"
                : "linear-gradient(90deg, rgba(15,20,27,0.95) 0%, rgba(23,28,35,0.90) 60%, rgba(23,28,35,0.40) 100%)",
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-[3px] bg-[#0F141B]/80 border transition-colors"
                style={{
                  color: diurnalConfig ? diurnalConfig.accentColor : "#8ECAE6",
                  borderColor: diurnalConfig ? `${diurnalConfig.accentColor}40` : "rgba(142, 202, 230, 0.3)",
                }}
              >
                MULTI-STATION COMPARISON • {diurnalConfig ? diurnalConfig.stationTelemetrySub : "SYNOPTIC SATELLITE TELEMETRY"}
              </span>
              {diurnalConfig && (
                <span
                  className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-[4px] backdrop-blur-sm"
                  style={{
                    backgroundColor: `${diurnalConfig.accentColor}25`,
                    color: diurnalConfig.accentColor,
                    border: `1px solid ${diurnalConfig.accentColor}50`,
                  }}
                >
                  {diurnalConfig.solarStatusBadge}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
              Atmospheric Multi-City Comparison
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed">
              Side-by-side physical meteorological comparison across 2 to 4 locations with delta temperature and precipitation differentials.
            </p>
          </div>

          {/* Telemetry HUD */}
          <div className="bg-[#0F141B]/85 backdrop-blur-md border border-white/10 p-3 rounded-[6px] hidden sm:flex flex-col gap-1.5 min-w-[210px] text-[11px] font-mono shrink-0 shadow-inner">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">CORRELATION</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span> ACTIVE
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">INPUT NODES:</span>
              <span className="text-[#8ECAE6] font-semibold">{cityInputs.filter(c => c.trim()).length} / 4 LOCATIONS</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">TIME WINDOW:</span>
              <span className="text-slate-200 font-semibold uppercase">{selectedDay}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">DELTA CALC:</span>
              <span className="text-[#F4A261] font-semibold">SYNOPTIC GFS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Selector */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 transition-colors space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-100 dark:text-slate-100 light:text-slate-900">
              LOCATION WEATHER COMPARISON
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
            Deterministic Multi-City Atmospheric Comparison
          </span>
        </div>

        {/* Time Window Switcher */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 dark:text-slate-300 light:text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 light:text-slate-500" />
            <span>Target Forecast Window:</span>
          </div>
          <div className="inline-flex rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 p-1 border border-[#30353D] dark:border-[#30353D] light:border-slate-300">
            <button
              onClick={() => setSelectedDay("current")}
              className={`px-3 py-1 text-xs font-mono font-semibold rounded-[3px] transition-colors cursor-pointer ${
                selectedDay === "current"
                  ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                  : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-white light:hover:text-slate-900"
              }`}
            >
              Current Weather
            </button>
            <button
              onClick={() => setSelectedDay("tomorrow")}
              className={`px-3 py-1 text-xs font-mono font-semibold rounded-[3px] transition-colors cursor-pointer ${
                selectedDay === "tomorrow"
                  ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                  : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-white light:hover:text-slate-900"
              }`}
            >
              Tomorrow
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {cityInputs.map((city, idx) => (
            <div key={idx} className="relative flex items-center">
              <MapPin className="w-3.5 h-3.5 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 absolute left-2.5" />
              <input
                type="text"
                value={city}
                onChange={(e) => updateCity(idx, e.target.value)}
                placeholder={`City ${idx + 1}`}
                className="w-full pl-8 pr-8 py-2 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-xs font-mono text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#8ECAE6] transition-colors"
              />
              {cityInputs.length > 2 && (
                <button
                  onClick={() => removeCity(idx)}
                  className="absolute right-2 text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                  title="Remove city"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            {cityInputs.length < 4 && (
              <button
                onClick={addCity}
                className="flex items-center gap-1 px-3 py-1.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-200 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-xs font-mono text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-slate-950 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add City</span>
              </button>
            )}
          </div>

          <button
            onClick={() => handleCompare()}
            disabled={loading || cityInputs.filter((c) => c.trim()).length < 2}
            className="w-full sm:w-auto px-4 py-2 rounded-[4px] bg-[#F4A261] hover:bg-[#E76F51] text-[#0F141B] border border-[#F4A261] text-xs font-mono font-bold transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
          >
            {loading ? "Comparing Data..." : `Run Side-by-Side Comparison (${selectedDay === "tomorrow" ? "Tomorrow" : "Now"})`}
          </button>
        </div>

        {/* Preset suggestions */}
        <div className="pt-2 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase font-semibold shrink-0">
            Presets:
          </span>
          {currentLocation?.name && (
            <button
              onClick={() => {
                const next = [currentLocation.name, ""];
                setCityInputs(next);
              }}
              className="px-2.5 py-1 rounded-[3px] bg-[#F4A261] hover:bg-[#E76F51] text-[#0F141B] font-bold text-[11px] font-mono whitespace-nowrap transition-colors cursor-pointer shadow-sm"
            >
              Compare {currentLocation.name}
            </button>
          )}
          {DEFAULT_PRESET_COMPARISONS.map((p, i) => (
            <button
              key={i}
              onClick={() => {
                setCityInputs(p.cities);
                handleCompare(p.cities);
              }}
              className="px-2.5 py-1 rounded-[3px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-200 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-[11px] font-mono text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-slate-950 whitespace-nowrap transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-[8px] bg-rose-950/40 dark:bg-rose-950/40 light:bg-rose-50 border border-rose-500/30 text-rose-200 dark:text-rose-200 light:text-rose-800 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 transition-colors space-y-4 sm:space-y-5 shadow-sm">
          {/* Failed Locations Alert if any */}
          {comparison.failedLocations && comparison.failedLocations.length > 0 && (
            <div className="p-3.5 rounded-[6px] bg-amber-950/30 dark:bg-amber-950/30 light:bg-amber-50 border border-[#F4A261]/30 text-[#F4A261] dark:text-[#F4A261] light:text-amber-800 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#F4A261]" />
              <span>
                Note: Weather data could not be retrieved for: <strong>{comparison.failedLocations.join(", ")}</strong>.
              </span>
            </div>
          )}

          {/* Synthesis & Recommendation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <div className="p-3.5 sm:p-4 rounded-[6px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Comparative Synthesis {comparison.targetDay ? `(${comparison.targetDay.toUpperCase()})` : ""}
                  </span>
                </div>
                <p className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 leading-relaxed font-normal">
                  {comparison.comparativeSummary}
                </p>
              </div>
            </div>

            {comparison.recommendation && (
              <div className="p-3.5 sm:p-4 rounded-[6px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-emerald-50/50 border border-[#30353D] dark:border-[#30353D] light:border-emerald-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400 dark:text-emerald-400 light:text-emerald-700 mb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-400 light:text-emerald-600" />
                    <span>Weather-Based Recommendation</span>
                  </div>
                  <p className="text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 leading-relaxed font-medium">
                    {comparison.recommendation}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Side-by-side Location Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {comparison.locations.map((locRes, i) => {
              const tf = locRes.targetForecast;
              return (
                <div
                  key={i}
                  className="rounded-[6px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 p-4 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex flex-col justify-between transition-colors shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm sm:text-base font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">
                            {locRes.location.name}
                          </h4>
                          {tf && (
                            <span className="px-1.5 py-0.5 rounded-[3px] bg-[#252A32] dark:bg-[#252A32] light:bg-sky-50 border border-[#8ECAE6]/30 dark:border-[#8ECAE6]/30 light:border-sky-300 text-[10px] font-mono font-bold text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 uppercase">
                              {tf.targetDay}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
                          {locRes.location.admin1 ? `${locRes.location.admin1}, ` : ""}
                          {locRes.location.country}
                        </span>
                      </div>
                      <WeatherIcon code={tf ? tf.weatherCode : locRes.current.weatherCode} className="w-7 h-7 shrink-0 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700" />
                    </div>

                    {tf ? (
                      /* Daily Forecast Display */
                      <div className="mt-3.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold font-mono text-white dark:text-white light:text-slate-950">
                            High {formatTemp(tf.tempMax)}
                          </span>
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
                            Low {formatTemp(tf.tempMin)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium text-slate-300 dark:text-slate-300 light:text-slate-700">{tf.condition}</span>
                          {tf.isThunderstorm && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] bg-amber-950/60 dark:bg-amber-950/60 light:bg-amber-100 border border-[#F4A261]/40 text-[10px] font-mono font-semibold text-[#F4A261] dark:text-[#F4A261] light:text-amber-800">
                              <Zap className="w-2.5 h-2.5" /> Thunderstorms
                            </span>
                          )}
                        </div>

                        {/* Forecast Metrics Table */}
                        <div className="mt-3.5 pt-3 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 space-y-1.5 text-xs font-mono">
                          <div className="flex justify-between text-slate-300 dark:text-slate-300 light:text-slate-700">
                            <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">Rain Probability</span>
                            <span className="font-semibold text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700">{tf.precipitationProbability}%</span>
                          </div>
                          <div className="flex justify-between text-slate-300 dark:text-slate-300 light:text-slate-700">
                            <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">Expected Precipitation</span>
                            <span className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">{tf.rainSum} mm</span>
                          </div>
                          <div className="flex justify-between text-slate-300 dark:text-slate-300 light:text-slate-700">
                            <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">Max Wind Speed</span>
                            <span className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">{tf.windSpeedMax} km/h</span>
                          </div>
                          <div className="flex justify-between text-slate-300 dark:text-slate-300 light:text-slate-700">
                            <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">Max UV Index</span>
                            <span className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">{tf.uvIndexMax}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Current Observations Display */
                      <div className="mt-3.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white dark:text-white light:text-slate-950">
                            {formatTemp(locRes.current.temperature)}
                          </span>
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
                            Feels {formatTemp(locRes.current.feelsLike)}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-300 dark:text-slate-300 light:text-slate-700 block mt-0.5">
                          {locRes.current.condition}
                        </span>

                        {/* Current Metrics Table */}
                        <div className="mt-3.5 pt-3 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 space-y-1.5 text-xs font-mono">
                          <div className="flex justify-between text-slate-300 dark:text-slate-300 light:text-slate-700">
                            <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">Rain Probability</span>
                            <span className="font-semibold text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700">
                              {locRes.current.precipitationProbability}%
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-300 dark:text-slate-300 light:text-slate-700">
                            <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">Humidity</span>
                            <span className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">
                              {locRes.current.humidity !== null ? `${locRes.current.humidity}%` : "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-300 dark:text-slate-300 light:text-slate-700">
                            <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">Wind</span>
                            <span className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">
                              {locRes.current.windSpeed} km/h
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-300 dark:text-slate-300 light:text-slate-700">
                            <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">UV Index</span>
                            <span className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">
                              {locRes.current.uvIndex}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-300 dark:text-slate-300 light:text-slate-700">
                            <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">Visibility</span>
                            <span className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">
                              {locRes.current.visibility !== null && locRes.current.visibility !== undefined
                                ? `${(locRes.current.visibility / 1000).toFixed(1)} km`
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">Outdoor Score:</span>
                    <span className="font-bold text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700">
                      {locRes.analysis.outdoorSuitabilityScore}/100
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Metric Differences */}
          <div>
            <h4 className="text-xs font-mono font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 uppercase tracking-wider mb-2.5">
              Metric Deltas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {comparison.metricDeltas.map((delta, i) => (
                <div key={i} className="p-3 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 shadow-sm">
                  <span className="text-xs font-mono font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 block mb-0.5">
                    {delta.metric}
                  </span>
                  <p className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-600">{delta.highlight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
