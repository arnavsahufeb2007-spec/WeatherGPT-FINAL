import React from "react";
import { NasaEnvironmentalData } from "../types.js";
import { Satellite, Flame, Wind, ShieldAlert, Sun, Info, ExternalLink, Compass } from "lucide-react";

interface NasaIntelligenceCardProps {
  nasaData: NasaEnvironmentalData | null;
  loading?: boolean;
}

export const NasaIntelligenceCard: React.FC<NasaIntelligenceCardProps> = ({ nasaData, loading = false }) => {
  if (loading) {
    return (
      <div id="nasa-intelligence-loading" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">
            Querying NASA Earth Observatory & POWER climatology layers...
          </p>
        </div>
      </div>
    );
  }

  if (!nasaData || nasaData.status === "unavailable") {
    return null;
  }

  const { naturalEvents, climateContext, radiusKm } = nasaData;
  const hasEvents = naturalEvents && naturalEvents.events.length > 0;

  return (
    <div
      id="nasa-intelligence-card"
      className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-200/60">
            <Satellite className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">NASA Earth Observation & Climate Context</h3>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                Supplementary Layer
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Natural hazard monitoring via NASA EONET v3 and 20-year climatology via NASA POWER
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Near-Real-Time Curation
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Column: Natural Hazards / EONET */}
        <div id="nasa-hazard-section" className="flex flex-col justify-between rounded-lg bg-slate-50/70 p-4 border border-slate-150">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Active Hazards within {radiusKm} km
              </span>
              <span className="text-xs font-medium text-slate-500">
                {naturalEvents.count} detected
              </span>
            </div>

            {hasEvents ? (
              <div className="space-y-2.5">
                {naturalEvents.events.map((ev) => (
                  <div
                    key={ev.id}
                    id={`nasa-event-${ev.id}`}
                    className="rounded-md border border-slate-200 bg-white p-3 text-xs shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        {ev.category === "wildfires" ? (
                          <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        ) : ev.category === "severeStorms" ? (
                          <Wind className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <Compass className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                        )}
                        <span>{ev.title}</span>
                      </div>
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                        ~{ev.distanceKm} km
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-slate-500 text-[11px]">
                      <span>Category: {ev.categoryTitle}</span>
                      {ev.sources && ev.sources.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span>Source:</span>
                          {ev.sources.map((s, idx) => (
                            <a
                              key={idx}
                              href={s.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-0.5 text-sky-600 hover:text-sky-700 underline"
                            >
                              {s.id}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-5 text-center">
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium text-slate-700">No Severe Hazard Events</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  No active wildfires, severe cyclones, or volcanic plumes curated by NASA Earth Observatory within {radiusKm} km.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="h-3 w-3 shrink-0" />
            <span>Updated periodically (1-6h latency) from satellite sensor analysts.</span>
          </div>
        </div>

        {/* Right Column: 20-Year Climatology Baseline / NASA POWER */}
        <div id="nasa-climate-section" className="flex flex-col justify-between rounded-lg bg-slate-50/70 p-4 border border-slate-150">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <Sun className="h-4 w-4 text-amber-500" />
                20-Year Climatological Baseline
              </span>
              {climateContext && (
                <span className="text-xs font-medium text-slate-500">
                  {climateContext.month} Normal
                </span>
              )}
            </div>

            {climateContext ? (
              <div className="space-y-3">
                <div className="rounded-md border border-slate-200 bg-white p-3 shadow-2xs">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Historical Monthly Mean:</span>
                    <span className="text-sm font-bold text-slate-900">
                      {climateContext.historicalNormalTempC}°C
                    </span>
                  </div>
                  {climateContext.currentTempDeltaC !== undefined && (
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Current vs Historical:</span>
                      <span
                        className={`font-semibold ${
                          climateContext.currentTempDeltaC > 0
                            ? "text-rose-600"
                            : climateContext.currentTempDeltaC < 0
                            ? "text-sky-600"
                            : "text-slate-700"
                        }`}
                      >
                        {climateContext.currentTempDeltaC > 0 ? "+" : ""}
                        {climateContext.currentTempDeltaC}°C vs normal
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-3 shadow-2xs">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Solar Irradiance:</span>
                    <span className="text-sm font-bold text-slate-900">
                      {climateContext.allSkySolarIrradianceKwhM2Day} <span className="text-xs font-normal text-slate-500">kWh/m²/day</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    All-sky surface solar energy potential for renewable solar planning and daylight exposure.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">
                Climatological baseline data currently unavailable for these coordinates.
              </p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="h-3 w-3 shrink-0" />
            <span>Based on NASA POWER MERRA-2 reanalysis (2001–2020 monthly normals).</span>
          </div>
        </div>
      </div>
    </div>
  );
};
