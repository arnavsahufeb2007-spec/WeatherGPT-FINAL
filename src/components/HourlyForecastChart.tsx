import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar, ComposedChart } from "recharts";
import { HourlyForecastItem } from "../types.js";
import { WeatherIcon } from "./WeatherIcons.js";
import { Clock, Droplets, Thermometer } from "lucide-react";

interface HourlyForecastChartProps {
  hourly: HourlyForecastItem[];
  isFahrenheit: boolean;
}

export function HourlyForecastChart({ hourly, isFahrenheit }: HourlyForecastChartProps) {
  const [metricMode, setMetricMode] = useState<"temp" | "rain">("temp");

  // Display next 24 hours
  const displayHours = hourly.slice(0, 24);

  const formatTemp = (celsius: number) => {
    if (isFahrenheit) {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  };

  const chartData = displayHours.map((h) => ({
    time: h.formattedTime,
    temp: formatTemp(h.temperature),
    feelsLike: formatTemp(h.feelsLike),
    rainProb: h.precipitationProbability,
    rainMm: h.rain,
    condition: h.condition,
    weatherCode: h.weatherCode,
  }));

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">24-Hour Forecast Progression</h3>
        </div>

        {/* Chart View Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setMetricMode("temp")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              metricMode === "temp" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Temperature</span>
          </button>
          <button
            onClick={() => setMetricMode("rain")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              metricMode === "rain" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Precipitation %</span>
          </button>
        </div>
      </div>

      {/* Recharts Graphical Visualization */}
      <div className="h-44 w-full pt-2 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          {metricMode === "temp" ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs shadow-xl">
                        <p className="font-semibold text-white">{d.time}</p>
                        <p className="text-sky-400 font-bold mt-1">
                          Temp: {d.temp}°{isFahrenheit ? "F" : "C"}
                        </p>
                        <p className="text-slate-300">Feels like: {d.feelsLike}°{isFahrenheit ? "F" : "C"}</p>
                        <p className="text-slate-400 mt-0.5">{d.condition}</p>
                        <p className="text-blue-300">Rain Prob: {d.rainProb}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="temp" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#tempGradient)" />
            </AreaChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs shadow-xl">
                        <p className="font-semibold text-white">{d.time}</p>
                        <p className="text-blue-400 font-bold mt-1">Rain Prob: {d.rainProb}%</p>
                        <p className="text-slate-300">Precipitation: {d.rainMm} mm</p>
                        <p className="text-slate-400">{d.condition}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="rainProb" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Horizontal Scannable Hourly Strip */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {displayHours.map((h, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/60 min-w-[76px] shrink-0 text-center"
          >
            <span className="text-[11px] font-medium text-slate-400">{h.formattedTime}</span>
            <div className="my-1.5">
              <WeatherIcon code={h.weatherCode} className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">
              {formatTemp(h.temperature)}°
            </span>
            <div className="flex items-center gap-0.5 text-[10px] text-blue-400 font-medium mt-1">
              <Droplets className="w-2.5 h-2.5" />
              <span>{h.precipitationProbability}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
