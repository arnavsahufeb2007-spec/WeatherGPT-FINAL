import React, { useState, useEffect } from "react";
import { LocationInfo, TravelAnalysis } from "../types.js";
import { analyzeTravelAPI } from "../services/api.js";
import { Car, Bike, Bus, Train, Plane, MapPin, ArrowRight, Clock, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { WeatherIcon } from "./WeatherIcons.js";

interface TravelPlannerProps {
  isFahrenheit: boolean;
  currentLocation?: LocationInfo | null;
}

export function TravelPlanner({ isFahrenheit, currentLocation }: TravelPlannerProps) {
  const [origin, setOrigin] = useState(() => currentLocation?.name || "");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState<"car" | "bike" | "bus" | "train" | "flight">("car");
  const [loading, setLoading] = useState(false);
  const [travelData, setTravelData] = useState<TravelAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentLocation?.name && !origin) {
      setOrigin(currentLocation.name);
    }
  }, [currentLocation?.name]);

  const handleAnalyze = async (orig = origin, dest = destination, m = mode) => {
    if (!orig || !dest) return;
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeTravelAPI(orig, dest, m);
      setTravelData(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze travel route weather");
    } finally {
      setLoading(false);
    }
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
      {/* Route Selector Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-sky-500 dark:text-sky-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase">Route Weather Intelligence</h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Highway & Corridor Weather Analysis</span>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Departure Point</label>
              {currentLocation?.name && origin !== currentLocation.name && (
                <button
                  type="button"
                  onClick={() => setOrigin(currentLocation.name)}
                  className="text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 font-medium cursor-pointer"
                >
                  Use {currentLocation.name}
                </button>
              )}
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-emerald-500 dark:text-emerald-400 absolute left-3 top-3" />
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder={currentLocation?.name ? `e.g. ${currentLocation.name}` : "e.g. Departure city"}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Destination</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-rose-500 dark:text-rose-400 absolute left-3 top-3" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Destination city"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium">
            <button
              onClick={() => setMode("car")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                mode === "car" ? "bg-sky-500 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Car</span>
            </button>
            <button
              onClick={() => setMode("bike")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                mode === "bike" ? "bg-sky-500 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Two-Wheeler</span>
            </button>
            <button
              onClick={() => setMode("bus")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                mode === "bus" ? "bg-sky-500 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>Bus</span>
            </button>
            <button
              onClick={() => setMode("train")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                mode === "train" ? "bg-sky-500 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Train className="w-3.5 h-3.5" />
              <span>Train</span>
            </button>
            <button
              onClick={() => setMode("flight")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                mode === "flight" ? "bg-sky-500 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              <span>Flight</span>
            </button>
          </div>

          <button
            onClick={() => handleAnalyze()}
            disabled={loading || !origin.trim() || !destination.trim()}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Analyzing Corridor..." : "Assess Route Weather"}
          </button>
        </div>

        {/* Popular Route Presets */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold shrink-0">Corridors:</span>
          {currentLocation?.name && (
            <button
              onClick={() => {
                setOrigin(currentLocation.name);
              }}
              className="px-2.5 py-1 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 hover:bg-sky-500/20 dark:hover:bg-sky-500/30 border border-sky-500/20 dark:border-sky-500/30 text-[11px] text-sky-600 dark:text-sky-300 font-semibold whitespace-nowrap transition-colors cursor-pointer"
            >
              Start: {currentLocation.name}
            </button>
          )}
          {[
            { origin: "Delhi", destination: "Jaipur", label: "Delhi → Jaipur" },
            { origin: "Mumbai", destination: "Pune", label: "Mumbai → Pune" },
            { origin: "Bengaluru", destination: "Mysuru", label: "Bengaluru → Mysuru" },
            { origin: "Delhi", destination: "Chandigarh", label: "Delhi → Chandigarh" },
            { origin: "Kolkata", destination: "Digha", label: "Kolkata → Digha" },
          ].map((p, i) => (
            <button
              key={i}
              onClick={() => {
                setOrigin(p.origin);
                setDestination(p.destination);
                handleAnalyze(p.origin, p.destination, mode);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Route Results */}
      {travelData && (
        <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 p-6 shadow-xl space-y-6">
          {/* Summary Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <span>{travelData.origin.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span>{travelData.destination.name}</span>
                <span className="text-slate-400">• Mode: {travelData.mode.toUpperCase()}</span>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">{travelData.routeSummary}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center min-w-[90px]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Distance</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white block mt-0.5">{travelData.totalDistanceKm} km</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center min-w-[90px]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Duration</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white block mt-0.5">
                  {Math.floor(travelData.estimatedDurationMinutes / 60)}h {travelData.estimatedDurationMinutes % 60}m
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center min-w-[100px]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Corridor Risk</span>
                <span
                  className={`text-xs font-bold uppercase mt-1 block ${
                    travelData.weatherRiskLevel === "high"
                      ? "text-rose-500 dark:text-rose-400"
                      : travelData.weatherRiskLevel === "moderate"
                      ? "text-amber-500 dark:text-amber-400"
                      : "text-emerald-500 dark:text-emerald-400"
                  }`}
                >
                  {travelData.weatherRiskLevel} Risk
                </span>
              </div>
            </div>
          </div>

          {/* Key Observations */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-2">Weather Observations Along Route</h4>
            <div className="space-y-1.5">
              {travelData.keyWeatherRisks.map((risk, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Checkpoints Timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-3">Route Checkpoints & Weather Profile</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {travelData.checkpoints.map((cp, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-300 truncate">{cp.name}</span>
                      <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono">{cp.estimatedArrival}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{cp.distanceKm} km mark</span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white block">{formatTemp(cp.weather?.temperature)}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{cp.weather?.condition || "Clear"}</span>
                    </div>
                    {cp.weather && <WeatherIcon code={cp.weather.weatherCode} className="w-5 h-5" />}
                  </div>

                  {cp.riskSummary && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 block border-t border-slate-200 dark:border-slate-900 pt-1">
                      {cp.riskSummary}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations & Mode Tips */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">Transit Recommendations</h4>
            <ul className="space-y-1.5">
              {travelData.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
