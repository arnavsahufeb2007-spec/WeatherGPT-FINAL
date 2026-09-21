import React, { useState, useEffect } from "react";
import { ActivityAnalysis, ActivityType, CurrentWeatherData, DailyForecastItem, HourlyForecastItem, LocationInfo } from "../types.js";
import { analyzeActivityAPI } from "../services/api.js";
import { Activity, Clock, CheckCircle2, AlertCircle, XCircle, Sparkles, ChevronRight, Shield } from "lucide-react";

interface ActivityExplorerProps {
  location: LocationInfo;
  current: CurrentWeatherData;
  hourly?: HourlyForecastItem[];
  daily?: DailyForecastItem[];
  isFahrenheit: boolean;
}

const ACTIVITIES: { id: ActivityType; label: string; icon: string }[] = [
  { id: "cricket", label: "Cricket", icon: "🏏" },
  { id: "running", label: "Running", icon: "🏃" },
  { id: "cycling", label: "Cycling", icon: "🚴" },
  { id: "football", label: "Football", icon: "⚽" },
  { id: "walking", label: "Walking", icon: "🚶" },
  { id: "picnic", label: "Picnic", icon: "🧺" },
  { id: "hiking", label: "Hiking", icon: "🥾" },
  { id: "photography", label: "Photography", icon: "📷" },
  { id: "gardening", label: "Gardening", icon: "🌱" },
  { id: "outdoor_events", label: "Events", icon: "🎪" },
];

export function ActivityExplorer({ location, current, hourly, daily, isFahrenheit }: ActivityExplorerProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>("cricket");
  const [analysis, setAnalysis] = useState<ActivityAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadAnalysis() {
      setLoading(true);
      try {
        const res = await analyzeActivityAPI(selectedActivity, location.name, location.latitude, location.longitude);
        if (isMounted) {
          setAnalysis(res.activityAnalysis);
        }
      } catch (err) {
        console.error("Activity analysis failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAnalysis();
    return () => {
      isMounted = false;
    };
  }, [selectedActivity, location.latitude, location.longitude, location.name]);

  const getSuitabilityColor = (s: string) => {
    switch (s) {
      case "excellent":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "good":
        return "bg-sky-500/20 text-sky-300 border-sky-500/40";
      case "fair":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "poor":
      case "unfavorable":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const getImpactIcon = (impact: "positive" | "negative" | "neutral") => {
    if (impact === "positive") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (impact === "negative") return <XCircle className="w-4 h-4 text-rose-400" />;
    return <AlertCircle className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header & Activity selector chips */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 p-5 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase">Activity Weather Intelligence</h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Assessing {location.name}</span>
        </div>

        {/* Activity Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {ACTIVITIES.map((act) => (
            <button
              key={act.id}
              onClick={() => setSelectedActivity(act.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedActivity === act.id
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                  : "bg-slate-50 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <span>{act.icon}</span>
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Card */}
      {loading ? (
        <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
          Computing deterministic meteorological factors...
        </div>
      ) : analysis ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 p-6 shadow-xl space-y-6">
          {/* Top Verdict Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider block">Suitability Verdict</span>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{analysis.activityName}</span>
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${getSuitabilityColor(analysis.suitability)}`}>
                  {analysis.suitability}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 min-w-[100px]">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Suitability Score</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{analysis.suitabilityScore}<span className="text-xs font-normal text-slate-500 dark:text-slate-400">/100</span></span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 min-w-[90px]">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Risk Level</span>
                <span className={`text-xs font-bold uppercase mt-1 ${analysis.riskLevel === "high" || analysis.riskLevel === "severe" ? "text-rose-500 dark:text-rose-400" : analysis.riskLevel === "moderate" ? "text-amber-500 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400"}`}>
                  {analysis.riskLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Assessment Reasons */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-2">Key Weather Observations</h4>
            <ul className="space-y-1.5">
              {analysis.primaryReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400 shrink-0 mt-1.5" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weather Factors Impact Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-3">Meteorological Factor Impact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {analysis.weatherFactors.map((f, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block">{f.factor}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">{f.value}</span>
                  </div>
                  <div className="shrink-0">{getImpactIcon(f.impact)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Best Time Window */}
          {analysis.bestTimeWindow && (
            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-500/20 flex items-start gap-3 text-xs text-sky-800 dark:text-sky-200">
              <Clock className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sky-900 dark:text-sky-300 font-semibold mb-0.5">Recommended Time Window</strong>
                <span>{analysis.bestTimeWindow}</span>
              </div>
            </div>
          )}

          {/* Practical Tips */}
          {analysis.tips && analysis.tips.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-2">Practical Action Tips</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analysis.tips.map((tip, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
