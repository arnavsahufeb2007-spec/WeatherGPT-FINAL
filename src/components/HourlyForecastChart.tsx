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
    <div id="hourly-forecast-chart" className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8ECAE6]" />
            <h3 className="text-xs font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-wider uppercase">
              24-Hour Diurnal Horizon
            </h3>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
            Continuous curve tracking real-time physical temperature shifts
          </p>
        </div>

        {/* Chart View Toggle: Restrained Editorial Control */}
        <div className="flex items-center bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 p-0.5 rounded-[4px] border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setMetricMode("temp")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-xs transition-colors cursor-pointer ${
              metricMode === "temp"
                ? "bg-[#252A32] dark:bg-[#252A32] light:bg-white text-slate-100 dark:text-slate-100 light:text-slate-900 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 font-semibold"
                : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900 border border-transparent"
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-[#F4A261]" />
            <span>Thermal Curve</span>
          </button>
          <button
            onClick={() => setMetricMode("rain")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-xs transition-colors cursor-pointer ${
              metricMode === "rain"
                ? "bg-[#252A32] dark:bg-[#252A32] light:bg-white text-slate-100 dark:text-slate-100 light:text-slate-900 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 font-semibold"
                : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900 border border-transparent"
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-[#8ECAE6]" />
            <span>Precipitation</span>
          </button>
        </div>
      </div>

      {/* Recharts Graphical Visualization - Atmospheric Editorial Curve */}
      <div className="h-44 w-full pt-1 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          {metricMode === "temp" ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="editorialCurveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F4A261" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F4A261" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F4A261" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F4A261" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-2.5 rounded-[4px] text-xs shadow-xl font-mono">
                        <p className="font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900 font-sans">{d.time}</p>
                        <p className="text-[#F4A261] font-bold mt-1">
                          Temp: {d.temp}°{isFahrenheit ? "F" : "C"}
                        </p>
                        <p className="text-slate-400 dark:text-slate-400 light:text-slate-600">Feels: {d.feelsLike}°{isFahrenheit ? "F" : "C"}</p>
                        <p className="text-slate-300 dark:text-slate-300 light:text-slate-700 font-sans mt-0.5">{d.condition}</p>
                        <p className="text-[#8ECAE6]">Rain Prob: {d.rainProb}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="temp" stroke="#F4A261" strokeWidth={2} fillOpacity={1} fill="url(#editorialCurveGradient)" />
            </AreaChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-2.5 rounded-[4px] text-xs shadow-xl font-mono">
                        <p className="font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900 font-sans">{d.time}</p>
                        <p className="text-[#8ECAE6] font-bold mt-1">Rain Prob: {d.rainProb}%</p>
                        <p className="text-slate-400 dark:text-slate-400 light:text-slate-600">Precipitation: {d.rainMm} mm</p>
                        <p className="text-slate-300 dark:text-slate-300 light:text-slate-700 font-sans">{d.condition}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="rainProb" fill="#8ECAE6" radius={[2, 2, 0, 0]} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Horizontal Scannable Hourly Strip */}
      <div className="mt-3.5 pt-3.5 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {displayHours.map((h, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-between p-2 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 min-w-[72px] shrink-0 text-center transition-colors"
          >
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">{h.formattedTime}</span>
            <div className="my-1">
              <WeatherIcon code={h.weatherCode} className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold font-mono text-slate-100 dark:text-slate-100 light:text-slate-900">
              {formatTemp(h.temperature)}°
            </span>
            <div className="flex items-center gap-0.5 text-[10px] font-mono text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 font-medium mt-0.5">
              <Droplets className="w-2.5 h-2.5" />
              <span>{h.precipitationProbability}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
