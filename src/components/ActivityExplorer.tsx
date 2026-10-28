import React, { useState, useEffect } from "react";
import { ActivityAnalysis, ActivityType, CurrentWeatherData, DailyForecastItem, HourlyForecastItem, LocationInfo } from "../types.js";
import { analyzeActivityAPI } from "../services/api.js";
import { Activity, Clock, CheckCircle2, AlertCircle, XCircle, Sparkles, ChevronRight, Shield } from "lucide-react";
import { DiurnalPhase, DiurnalPhaseConfig } from "../services/diurnalTheme.js";
import { getTranslations, UIStrings } from "../languages.js";

interface ActivityExplorerProps {
  location: LocationInfo;
  current: CurrentWeatherData;
  hourly?: HourlyForecastItem[];
  daily?: DailyForecastItem[];
  isFahrenheit: boolean;
  diurnalPhase?: DiurnalPhase;
  diurnalConfig?: DiurnalPhaseConfig;
  preferredLanguage?: string;
}

const ACTIVITIES: { id: ActivityType; key: keyof UIStrings; fallback: string; icon: string }[] = [
  { id: "cricket", key: "activityCricket", fallback: "Cricket", icon: "🏏" },
  { id: "running", key: "activityRunning", fallback: "Running", icon: "🏃" },
  { id: "cycling", key: "activityCycling", fallback: "Cycling", icon: "🚴" },
  { id: "football", key: "activityFootball", fallback: "Football", icon: "⚽" },
  { id: "walking", key: "activityWalking", fallback: "Walking", icon: "🚶" },
  { id: "picnic", key: "activityPicnic", fallback: "Picnic", icon: "🧺" },
  { id: "hiking", key: "activityHiking", fallback: "Hiking", icon: "🥾" },
  { id: "photography", key: "activityPhotography", fallback: "Photography", icon: "📷" },
  { id: "gardening", key: "activityGardening", fallback: "Gardening", icon: "🌱" },
  { id: "outdoor_events", key: "activityEvents", fallback: "Events", icon: "🎪" },
];

export function ActivityExplorer({ location, current, hourly, daily, isFahrenheit, diurnalPhase, diurnalConfig, preferredLanguage }: ActivityExplorerProps) {
  const t = getTranslations(preferredLanguage);
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
        return "bg-emerald-950/40 text-emerald-300 border-emerald-500/30";
      case "good":
        return "bg-[#252A32] text-[#8ECAE6] border-[#8ECAE6]/40";
      case "fair":
        return "bg-amber-950/40 text-[#F4A261] border-amber-500/30";
      case "poor":
      case "unfavorable":
        return "bg-rose-950/40 text-rose-300 border-rose-500/30";
      default:
        return "bg-[#252A32] text-slate-300 border-[#30353D]";
    }
  };

  const getImpactIcon = (impact: "positive" | "negative" | "neutral") => {
    if (impact === "positive") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (impact === "negative") return <XCircle className="w-4 h-4 text-rose-400" />;
    return <AlertCircle className="w-4 h-4 text-[#F4A261]" />;
  };

  return (
    <div id="activity-explorer" className="space-y-4 sm:space-y-5">
      {/* Activity Intelligence Hero Banner */}
      <div
        data-atmospheric-banner="true"
        className="hero-atmospheric-card atmospheric-hero-card relative rounded-[8px] bg-[#0F141B] border border-[#30353D] p-5 sm:p-6 overflow-hidden transition-colors shadow-md"
        style={diurnalConfig ? { borderColor: `${diurnalConfig.accentColor}40` } : undefined}
      >
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <img
            key={diurnalConfig?.backgrounds.insights.photoUrl || "standard"}
            src={
              diurnalConfig?.backgrounds.insights.photoUrl ||
              "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1600&q=80"
            }
            alt={diurnalConfig?.backgrounds.insights.photoAlt || "Outdoor sports activity"}
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
        <div className="relative z-10 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-[10px] font-mono uppercase font-semibold tracking-wider transition-colors duration-500"
              style={{ color: diurnalConfig ? diurnalConfig.accentColor : "#8ECAE6" }}
            >
              {t.activityBannerTag || "OUTDOOR FEASIBILITY • SPORT & LEISURE TELEMETRY"}
            </span>
            {diurnalConfig && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-[4px] backdrop-blur-sm transition-all"
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
            {t.activityBannerTitle || "Activity Weather Intelligence"}
          </h2>
          <p className="text-xs text-slate-200 max-w-xl leading-relaxed">
            {t.activityBannerDesc || "Deterministic outdoor suitability scoring, bio-comfort indices, optimal hourly windows, and activity gear advisories"} ({location.name}).
          </p>
        </div>
      </div>

      {/* Header & Activity selector chips */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 transition-colors">
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#8ECAE6]" />
            <h3 className="text-xs font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-wider uppercase font-mono">
              {t.tabActivity || "SELECT SPORT / RECREATIONAL ACTIVITY"}
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
            {t.stationBase}: {location.name}
          </span>
        </div>

        {/* Activity Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {ACTIVITIES.map((act) => (
            <button
              key={act.id}
              onClick={() => setSelectedActivity(act.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedActivity === act.id
                  ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                  : "bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-300"
              }`}
            >
              <span>{act.icon}</span>
              <span>{t[act.key] || act.fallback}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Card */}
      {loading ? (
        <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-12 text-center text-slate-400 text-xs font-mono">
          {t.evaluatingSuitability || "Computing deterministic meteorological factors..."}
        </div>
      ) : analysis ? (
        <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-6 space-y-5 transition-colors">
          {/* Top Verdict Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200">
            <div>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase tracking-wider block">
                {t.ratingLabel || "Suitability Verdict"}
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xl sm:text-2xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">
                  {analysis.activityName}
                </span>
                <span className={`text-xs font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border ${getSuitabilityColor(analysis.suitability)}`}>
                  {analysis.suitability}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center p-2.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 min-w-[90px]">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase font-semibold">{t.outdoorScore || "Score"}</span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 mt-0.5">
                  {analysis.suitabilityScore}<span className="text-xs font-normal text-slate-500">/100</span>
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-2.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 min-w-[85px]">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase font-semibold">{t.advisories || "Risk Level"}</span>
                <span className={`text-xs font-mono font-semibold uppercase mt-1 ${analysis.riskLevel === "high" || analysis.riskLevel === "severe" ? "text-rose-400" : analysis.riskLevel === "moderate" ? "text-[#F4A261]" : "text-emerald-400"}`}>
                  {analysis.riskLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Assessment Reasons */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 uppercase tracking-wider mb-2 font-mono">
              {t.meteorologicalFactors || "Key Weather Observations"}
            </h4>
            <ul className="space-y-1.5">
              {analysis.primaryReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-[1px] bg-[#8ECAE6] shrink-0 mt-1.5" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weather Factors Impact Grid */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 uppercase tracking-wider mb-2.5 font-mono">
              {t.meteorologicalFactors || "Meteorological Factor Impact"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {analysis.weatherFactors.map((f, i) => (
                <div key={i} className="p-2.5 sm:p-3 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-medium text-slate-200 dark:text-slate-200 light:text-slate-900 block">{f.factor}</span>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 block mt-0.5">{f.value}</span>
                  </div>
                  <div className="shrink-0">{getImpactIcon(f.impact)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Best Time Window */}
          {analysis.bestTimeWindow && (
            <div className="p-3.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-start gap-2.5 text-xs text-slate-200 dark:text-slate-200 light:text-slate-800">
              <Clock className="w-4 h-4 text-[#8ECAE6] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-800 font-semibold font-mono text-xs mb-0.5">
                  {t.recommendedWindow || "Recommended Time Window"}
                </strong>
                <span className="text-slate-300 dark:text-slate-300 light:text-slate-700">{analysis.bestTimeWindow}</span>
              </div>
            </div>
          )}

          {/* Practical Tips */}
          {analysis.tips && analysis.tips.length > 0 && (
            <div className="pt-4 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 uppercase tracking-wider mb-2 font-mono">
                {t.safetyPrecautions || "Practical Action Tips"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analysis.tips.map((tip, i) => (
                  <div key={i} className="p-2.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-[#8ECAE6] shrink-0 mt-0.5" />
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
