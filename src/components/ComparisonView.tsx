import React, { useState, useEffect } from "react";
import { ComparisonAnalysis, LocationInfo } from "../types.js";
import { compareLocationsAPI } from "../services/api.js";
import { GitCompare, MapPin, Sparkles, Plus, Trash2, Calendar, AlertCircle, Zap, ShieldCheck } from "lucide-react";
import { WeatherIcon } from "./WeatherIcons.js";

const DEFAULT_PRESET_COMPARISONS = [
  { label: "Bhopal vs Ujjain", cities: ["Bhopal", "Ujjain"] },
  { label: "Delhi vs Mumbai", cities: ["Delhi", "Mumbai"] },
  { label: "Bengaluru vs Hyderabad", cities: ["Bengaluru", "Hyderabad"] },
  { label: "London vs Paris", cities: ["London", "Paris"] },
];

interface ComparisonViewProps {
  isFahrenheit: boolean;
  currentLocation?: LocationInfo | null;
}

export function ComparisonView({ isFahrenheit, currentLocation }: ComparisonViewProps) {
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
    <div className="space-y-6">
      {/* Comparison Selector */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Location Weather Comparison</h3>
          </div>
          <span className="text-xs text-slate-400">Deterministic Multi-City Atmospheric Comparison</span>
        </div>

        {/* Time Window Switcher */}
        <div className="flex items-center gap-2 pt-1">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-300 font-medium mr-2">Target Forecast Window:</span>
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setSelectedDay("current")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedDay === "current"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Current Weather
            </button>
            <button
              onClick={() => setSelectedDay("tomorrow")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedDay === "tomorrow"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tomorrow
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {cityInputs.map((city, idx) => (
            <div key={idx} className="relative flex items-center">
              <MapPin className="w-4 h-4 text-sky-400 absolute left-3" />
              <input
                type="text"
                value={city}
                onChange={(e) => updateCity(idx, e.target.value)}
                placeholder={`City ${idx + 1}`}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {cityInputs.length > 2 && (
                <button
                  onClick={() => removeCity(idx)}
                  className="absolute right-2.5 text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            {cityInputs.length < 4 && (
              <button
                onClick={addCity}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add City</span>
              </button>
            )}
          </div>

          <button
            onClick={() => handleCompare()}
            disabled={loading || cityInputs.filter((c) => c.trim()).length < 2}
            className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Comparing Data..." : `Run Side-by-Side Comparison (${selectedDay === "tomorrow" ? "Tomorrow" : "Now"})`}
          </button>
        </div>

        {/* Preset suggestions */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] text-slate-400 uppercase font-semibold shrink-0">Presets:</span>
          {currentLocation?.name && (
            <button
              onClick={() => {
                const next = [currentLocation.name, ""];
                setCityInputs(next);
              }}
              className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-[11px] text-sky-300 font-semibold whitespace-nowrap transition-colors cursor-pointer"
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
              className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-6 shadow-xl space-y-6">
          {/* Failed Locations Alert if any */}
          {comparison.failedLocations && comparison.failedLocations.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Note: Weather data could not be retrieved for: <strong>{comparison.failedLocations.join(", ")}</strong>.
              </span>
            </div>
          )}

          {/* Synthesis & Recommendation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Comparative Synthesis {comparison.targetDay ? `(${comparison.targetDay.toUpperCase()})` : ""}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{comparison.comparativeSummary}</p>
              </div>
            </div>

            {comparison.recommendation && (
              <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span>Weather-Based Recommendation</span>
                  </div>
                  <p className="text-xs text-sky-100 leading-relaxed font-medium">
                    {comparison.recommendation}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Side-by-side Location Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparison.locations.map((locRes, i) => {
              const tf = locRes.targetForecast;
              return (
                <div key={i} className="rounded-xl bg-slate-950 p-5 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white">{locRes.location.name}</h4>
                          {tf && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-950 border border-sky-500/30 text-[10px] font-bold text-sky-300 uppercase">
                              {tf.targetDay}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {locRes.location.admin1 ? `${locRes.location.admin1}, ` : ""}
                          {locRes.location.country}
                        </span>
                      </div>
                      <WeatherIcon code={tf ? tf.weatherCode : locRes.current.weatherCode} className="w-7 h-7" />
                    </div>

                    {tf ? (
                      /* Daily Forecast Display */
                      <div className="mt-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-extrabold text-white">
                            High {formatTemp(tf.tempMax)}
                          </span>
                          <span className="text-xs text-slate-400">
                            Low {formatTemp(tf.tempMin)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium text-slate-300">{tf.condition}</span>
                          {tf.isThunderstorm && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[10px] font-semibold text-amber-300">
                              <Zap className="w-2.5 h-2.5" /> Thunderstorms
                            </span>
                          )}
                        </div>

                        {/* Forecast Metrics Table */}
                        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Rain Probability</span>
                            <span className="font-semibold text-blue-400">{tf.precipitationProbability}%</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Expected Precipitation</span>
                            <span className="font-semibold">{tf.rainSum} mm</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Max Wind Speed</span>
                            <span className="font-semibold">{tf.windSpeedMax} km/h</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Max UV Index</span>
                            <span className="font-semibold">{tf.uvIndexMax}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Current Observations Display */
                      <div className="mt-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-white">{formatTemp(locRes.current.temperature)}</span>
                          <span className="text-xs text-slate-400">Feels {formatTemp(locRes.current.feelsLike)}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-300 block mt-0.5">{locRes.current.condition}</span>

                        {/* Current Metrics Table */}
                        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Rain Probability</span>
                            <span className="font-semibold text-blue-400">{locRes.current.precipitationProbability}%</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Humidity</span>
                            <span className="font-semibold">{locRes.current.humidity !== null ? `${locRes.current.humidity}%` : "N/A"}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Wind</span>
                            <span className="font-semibold">{locRes.current.windSpeed} km/h</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">UV Index</span>
                            <span className="font-semibold">{locRes.current.uvIndex}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Visibility</span>
                            <span className="font-semibold">{locRes.current.visibility !== null && locRes.current.visibility !== undefined ? `${(locRes.current.visibility / 1000).toFixed(1)} km` : "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Outdoor Score:</span>
                    <span className="font-bold text-sky-400">{locRes.analysis.outdoorSuitabilityScore}/100</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Metric Differences */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Metric Deltas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {comparison.metricDeltas.map((delta, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-xs font-bold text-white block mb-1">{delta.metric}</span>
                  <p className="text-xs text-slate-300">{delta.highlight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
