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
    <div id="travel-planner" className="space-y-4 sm:space-y-5">
      {/* Route Intelligence Hero Banner */}
      <div className="relative rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-5 sm:p-6 overflow-hidden transition-colors">
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <img
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80"
            alt="Scenic Highway"
            className="w-full h-full object-cover object-center opacity-30 dark:opacity-25 light:opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#171C23] via-[#171C23]/90 to-transparent dark:from-[#171C23] dark:via-[#171C23]/90 light:from-white light:via-white/90" />
        </div>
        <div className="relative z-10 space-y-1.5">
          <span className="text-[10px] font-mono uppercase font-semibold text-[#8ECAE6] tracking-wider">
            ROUTE METEOROLOGICAL DISPATCH • CORRIDOR SURVEILLANCE
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 font-mono tracking-tight">
            Route Weather Intelligence
          </h2>
          <p className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 max-w-xl leading-relaxed">
            Real-time highway corridors, transit checkpoints, and deterministic weather forecasts along your trajectory.
          </p>
        </div>
      </div>

      {/* Route Selector Card */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-[#8ECAE6]" />
            <h3 className="text-xs font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-wider uppercase font-mono">
              PLAN CORRIDOR TRANSIT
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
            Highway & Corridor Weather Analysis
          </span>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300 dark:text-slate-300 light:text-slate-700">
                Departure Point
              </label>
              {currentLocation?.name && origin !== currentLocation.name && (
                <button
                  type="button"
                  onClick={() => setOrigin(currentLocation.name)}
                  className="text-[11px] font-mono text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 hover:underline cursor-pointer"
                >
                  Use {currentLocation.name}
                </button>
              )}
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder={currentLocation?.name ? `e.g. ${currentLocation.name}` : "e.g. Departure city"}
                className="w-full pl-9 pr-4 py-2 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-xs sm:text-sm text-slate-100 dark:text-slate-100 light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#8ECAE6]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 dark:text-slate-300 light:text-slate-700 block mb-1.5">
              Destination
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-rose-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Destination city"
                className="w-full pl-9 pr-4 py-2 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-xs sm:text-sm text-slate-100 dark:text-slate-100 light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#8ECAE6]"
              />
            </div>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1 bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 p-1 rounded-[4px] border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-xs font-medium overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setMode("car")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[3px] transition-colors cursor-pointer shrink-0 ${
                mode === "car"
                  ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                  : "text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-800"
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Car</span>
            </button>
            <button
              onClick={() => setMode("bike")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[3px] transition-colors cursor-pointer shrink-0 ${
                mode === "bike"
                  ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                  : "text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-800"
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Two-Wheeler</span>
            </button>
            <button
              onClick={() => setMode("bus")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[3px] transition-colors cursor-pointer shrink-0 ${
                mode === "bus"
                  ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                  : "text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-800"
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>Bus</span>
            </button>
            <button
              onClick={() => setMode("train")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[3px] transition-colors cursor-pointer shrink-0 ${
                mode === "train"
                  ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                  : "text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-800"
              }`}
            >
              <Train className="w-3.5 h-3.5" />
              <span>Train</span>
            </button>
            <button
              onClick={() => setMode("flight")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[3px] transition-colors cursor-pointer shrink-0 ${
                mode === "flight"
                  ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                  : "text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-800"
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              <span>Flight</span>
            </button>
          </div>

          <button
            onClick={() => handleAnalyze()}
            disabled={loading || !origin.trim() || !destination.trim()}
            className="w-full sm:w-auto px-4 py-2 rounded-[4px] bg-[#F4A261] hover:bg-[#E76F51] text-[#0F141B] font-semibold border border-[#F4A261] text-xs transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
          >
            {loading ? "Analyzing Corridor..." : "Assess Route Weather"}
          </button>
        </div>

        {/* Popular Route Presets */}
        <div className="pt-2.5 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase font-semibold shrink-0">
            Corridors:
          </span>
          {currentLocation?.name && (
            <button
              onClick={() => {
                setOrigin(currentLocation.name);
              }}
              className="px-2.5 py-1 rounded-[3px] bg-[#252A32] dark:bg-[#252A32] light:bg-sky-50 hover:bg-[#30353D] border border-[#8ECAE6]/40 text-[11px] font-mono text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-800 font-semibold whitespace-nowrap transition-colors cursor-pointer"
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
              className="px-2.5 py-1 rounded-[3px] bg-[#1B2027] hover:bg-[#252A32] dark:bg-[#1B2027] dark:hover:bg-[#252A32] light:bg-slate-100 light:hover:bg-slate-200 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-[11px] font-mono text-slate-300 dark:text-slate-300 light:text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-[4px] bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Route Results */}
      {travelData && (
        <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-6 space-y-5 transition-colors">
          {/* Summary Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase tracking-wider">
                <span>{travelData.origin.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span>{travelData.destination.name}</span>
                <span className="text-slate-500">• Mode: {travelData.mode.toUpperCase()}</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 mt-1 block">
                {travelData.routeSummary}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <div className="p-2.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-center min-w-[85px] flex-1 sm:flex-none">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase font-semibold">Distance</span>
                <span className="text-base sm:text-lg font-mono font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 block mt-0.5">
                  {travelData.totalDistanceKm} km
                </span>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-center min-w-[85px] flex-1 sm:flex-none">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase font-semibold">Duration</span>
                <span className="text-base sm:text-lg font-mono font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 block mt-0.5">
                  {Math.floor(travelData.estimatedDurationMinutes / 60)}h {travelData.estimatedDurationMinutes % 60}m
                </span>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-center min-w-[95px] flex-1 sm:flex-none">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase font-semibold">Corridor Risk</span>
                <span
                  className={`text-xs font-mono font-semibold uppercase mt-1 block ${
                    travelData.weatherRiskLevel === "high"
                      ? "text-rose-400"
                      : travelData.weatherRiskLevel === "moderate"
                      ? "text-[#F4A261]"
                      : "text-emerald-400"
                  }`}
                >
                  {travelData.weatherRiskLevel} Risk
                </span>
              </div>
            </div>
          </div>

          {/* Key Observations */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 uppercase tracking-wider mb-2 font-mono">
              Weather Observations Along Route
            </h4>
            <div className="space-y-1.5">
              {travelData.keyWeatherRisks.map((risk, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-300 dark:text-slate-300 light:text-slate-700">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#F4A261] shrink-0 mt-0.5" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Checkpoints Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 uppercase tracking-wider mb-2.5 font-mono">
              Route Checkpoints & Weather Profile
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {travelData.checkpoints.map((cp, idx) => (
                <div key={idx} className="p-3 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800 truncate">
                        {cp.name}
                      </span>
                      <span className="text-[10px] text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 font-mono">
                        {cp.estimatedArrival}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
                      {cp.distanceKm} km mark
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-mono font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 block">
                        {formatTemp(cp.weather?.temperature)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 light:text-slate-500 capitalize">
                        {cp.weather?.condition || "Clear"}
                      </span>
                    </div>
                    {cp.weather && <WeatherIcon code={cp.weather.weatherCode} className="w-4 h-4 text-slate-200" />}
                  </div>

                  {cp.riskSummary && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 light:text-slate-500 mt-2 block border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 pt-1">
                      {cp.riskSummary}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations & Mode Tips */}
          <div className="pt-4 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 uppercase tracking-wider font-mono">
              Transit Recommendations
            </h4>
            <ul className="space-y-1.5">
              {travelData.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300 dark:text-slate-300 light:text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#8ECAE6] shrink-0 mt-0.5" />
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
