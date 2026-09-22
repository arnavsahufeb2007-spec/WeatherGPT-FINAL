import React from "react";
import { AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { WeatherAdvisory } from "../types.js";

interface AdvisoriesCardProps {
  advisories: WeatherAdvisory[];
}

export function AdvisoriesCard({ advisories }: AdvisoriesCardProps) {
  if (!advisories || advisories.length === 0) {
    return (
      <div className="rounded-[8px] bg-emerald-950/20 border border-emerald-500/20 p-3.5 sm:p-4 flex items-center gap-3 text-xs text-emerald-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <span className="font-semibold block text-emerald-200">No Active Weather Advisories</span>
          <span>Atmospheric conditions are within standard safe operational thresholds.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {advisories.map((adv) => {
        const isExtreme = adv.severity === "extreme";
        const isSevere = adv.severity === "severe";

        const badgeColor = isExtreme
          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
          : isSevere
          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
          : "bg-[#8ECAE6]/20 text-[#8ECAE6] border-[#8ECAE6]/40";

        const cardBorder = isExtreme
          ? "border-rose-500/30 bg-rose-950/20"
          : isSevere
          ? "border-amber-500/30 bg-amber-950/20"
          : "border-[#8ECAE6]/30 bg-[#171C23]";

        return (
          <div key={adv.id} className={`rounded-[8px] border p-3.5 sm:p-4 transition-colors ${cardBorder}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${isExtreme ? "text-rose-400" : isSevere ? "text-[#F4A261]" : "text-[#8ECAE6]"}`} />
                <h4 className="text-xs sm:text-sm font-bold text-white font-mono">{adv.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-[3px] border ${badgeColor}`}>
                  {adv.severity}
                </span>
                <span className="text-[11px] font-mono text-slate-400">{adv.timeframe}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{adv.description}</p>

            <div className="mt-3 pt-2.5 border-t border-[#30353D] flex items-start gap-2 text-xs text-slate-300">
              <strong className="text-white shrink-0 font-mono">Action Advice:</strong>
              <span>{adv.recommendation}</span>
            </div>

            <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-400 shrink-0" />
              <span>WeatherGPT Deterministic Advisory — generated from factual meteorological thresholds.</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
