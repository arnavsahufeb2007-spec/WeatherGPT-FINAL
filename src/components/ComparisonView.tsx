import React, { useState } from "react";
import { ComparisonAnalysis } from "../types.js";
import { compareLocationsAPI } from "../services/api.js";
import { GitCompare, MapPin, Sparkles, Plus, Trash2 } from "lucide-react";
import { WeatherIcon } from "./WeatherIcons.js";

const PRESET_COMPARISONS = [
  { label: "Delhi vs Mumbai", cities: ["Delhi", "Mumbai"] },
  { label: "Bengaluru vs Hyderabad", cities: ["Bengaluru", "Hyderabad"] },
  { label: "Goa vs Kochi", cities: ["Goa", "Kochi"] },
  { label: "Shimla vs Manali", cities: ["Shimla", "Manali"] },
];

export function ComparisonView({ isFahrenheit }: { isFahrenheit: boolean }) {
  const [cityInputs, setCityInputs] = useState<string[]>(["Delhi", "Mumbai"]);
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async (citiesToCompare = cityInputs) => {
    const valid = citiesToCompare.map((c) => c.trim()).filter(Boolean);
    if (valid.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await compareLocationsAPI(valid);
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
            className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 disabled:opacity-50"
          >
            {loading ? "Comparing Data..." : "Run Side-by-Side Comparison"}
          </button>
        </div>

        {/* Preset suggestions */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] text-slate-400 uppercase font-semibold shrink-0">Presets:</span>
          {PRESET_COMPARISONS.map((p, i) => (
            <button
              key={i}
              onClick={() => {
                setCityInputs(p.cities);
                handleCompare(p.cities);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-6 shadow-xl space-y-6">
          {/* Summary */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Comparative Synthesis</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{comparison.comparativeSummary}</p>
          </div>

          {/* Side-by-side Location Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparison.locations.map((locRes, i) => (
              <div key={i} className="rounded-xl bg-slate-950 p-5 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white">{locRes.location.name}</h4>
                      <span className="text-xs text-slate-400">
                        {locRes.location.admin1 ? `${locRes.location.admin1}, ` : ""}
                        {locRes.location.country}
                      </span>
                    </div>
                    <WeatherIcon code={locRes.current.weatherCode} className="w-7 h-7" />
                  </div>

                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-3xl font-extrabold text-white">{formatTemp(locRes.current.temperature)}</span>
                    <span className="text-xs text-slate-400">Feels {formatTemp(locRes.current.feelsLike)}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-300 block mt-0.5">{locRes.current.condition}</span>

                  {/* Metrics Table */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Rain Probability</span>
                      <span className="font-semibold text-blue-400">{locRes.current.precipitationProbability}%</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Humidity</span>
                      <span className="font-semibold">{locRes.current.humidity}%</span>
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
                      <span className="font-semibold">{(locRes.current.visibility / 1000).toFixed(1)} km</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Outdoor Score:</span>
                  <span className="font-bold text-sky-400">{locRes.analysis.outdoorSuitabilityScore}/100</span>
                </div>
              </div>
            ))}
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
