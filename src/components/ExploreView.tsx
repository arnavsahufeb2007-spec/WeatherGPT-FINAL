import React, { useState } from "react";
import {
  Compass,
  MapPin,
  Search,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Globe,
  ArrowRight,
  GitCompare,
} from "lucide-react";
import { LocationInfo } from "../types.js";
import { ComparisonView } from "./ComparisonView.js";
import { DiurnalPhase, DiurnalPhaseConfig } from "../services/diurnalTheme.js";
import { getTranslations } from "../languages.js";

interface ExploreViewProps {
  currentLocation: LocationInfo | null;
  onSelectLocation: (loc: LocationInfo) => void;
  onOpenLocationSearch: () => void;
  isFahrenheit: boolean;
  diurnalPhase?: DiurnalPhase;
  diurnalConfig?: DiurnalPhaseConfig;
  preferredLanguage?: string;
}

interface HubCity {
  name: string;
  country: string;
  countryCode: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  category: "india" | "world";
  tag: string;
  desc: string;
}

const FEATURED_HUBS: HubCity[] = [
  {
    name: "New Delhi",
    country: "India",
    countryCode: "IN",
    admin1: "Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
    category: "india",
    tag: "National Capital",
    desc: "Northern plains subtropical climate with seasonal monsoons",
  },
  {
    name: "Mumbai",
    country: "India",
    countryCode: "IN",
    admin1: "Maharashtra",
    latitude: 19.076,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
    category: "india",
    tag: "Coastal Megacity",
    desc: "Tropical maritime climate with heavy Arabian Sea rainfall",
  },
  {
    name: "Bengaluru",
    country: "India",
    countryCode: "IN",
    admin1: "Karnataka",
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: "Asia/Kolkata",
    category: "india",
    tag: "Tech Hub",
    desc: "Elevated Deccan Plateau with moderate, pleasant year-round temperatures",
  },
  {
    name: "Chennai",
    country: "India",
    countryCode: "IN",
    admin1: "Tamil Nadu",
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: "Asia/Kolkata",
    category: "india",
    tag: "Coromandel Coast",
    desc: "Tropical wet and dry climate with Northeast monsoon activity",
  },
  {
    name: "Kolkata",
    country: "India",
    countryCode: "IN",
    admin1: "West Bengal",
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: "Asia/Kolkata",
    category: "india",
    tag: "Eastern Hub",
    desc: "Tropical wet-and-dry climate on the Ganges Delta",
  },
  {
    name: "Jaipur",
    country: "India",
    countryCode: "IN",
    admin1: "Rajasthan",
    latitude: 26.9124,
    longitude: 75.7873,
    timezone: "Asia/Kolkata",
    category: "india",
    tag: "Pink City",
    desc: "Semi-arid climate with high summer heat and sunny winter days",
  },
  {
    name: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    admin1: "Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
    category: "world",
    tag: "East Asia",
    desc: "Humid subtropical climate with four distinct seasons",
  },
  {
    name: "London",
    country: "United Kingdom",
    countryCode: "GB",
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: "Europe/London",
    category: "world",
    tag: "Western Europe",
    desc: "Temperate oceanic climate with regular cloud cover and light rain",
  },
  {
    name: "New York",
    country: "United States",
    countryCode: "US",
    admin1: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
    category: "world",
    tag: "North America",
    desc: "Humid continental climate with coastal Atlantic influences",
  },
  {
    name: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: "Asia/Dubai",
    category: "world",
    tag: "Middle East",
    desc: "Desert climate with high sun exposure and warm seas",
  },
];

export function ExploreView({
  currentLocation,
  onSelectLocation,
  onOpenLocationSearch,
  isFahrenheit,
  diurnalPhase,
  diurnalConfig,
  preferredLanguage,
}: ExploreViewProps) {
  const t = getTranslations(preferredLanguage);
  const [activeTab, setActiveTab] = useState<"hubs" | "compare">("hubs");
  const [hubCategory, setHubCategory] = useState<"all" | "india" | "world">("all");

  const filteredHubs = FEATURED_HUBS.filter(
    (h) => hubCategory === "all" || h.category === hubCategory
  );

  return (
    <div id="explore-view" className="space-y-4 sm:space-y-5 max-w-6xl mx-auto">
      {/* Explore Hero Banner with Telemetry HUD */}
      <div
        data-atmospheric-banner="true"
        className="hero-atmospheric-card atmospheric-hero-card relative rounded-[8px] bg-[#0F141B] border border-[#30353D] p-5 sm:p-6 overflow-hidden transition-colors shadow-lg"
        style={diurnalConfig ? { borderColor: `${diurnalConfig.accentColor}40` } : undefined}
      >
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <img
            key={diurnalConfig?.backgrounds.explore.photoUrl || "standard-explore"}
            src={
              diurnalConfig?.backgrounds.explore.photoUrl ||
              "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80"
            }
            alt={diurnalConfig?.backgrounds.explore.photoAlt || "Global Atmospheric Satellite View"}
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
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-[3px] bg-[#0F141B]/80 border transition-colors"
                style={{
                  color: diurnalConfig ? diurnalConfig.accentColor : "#8ECAE6",
                  borderColor: diurnalConfig ? `${diurnalConfig.accentColor}40` : "rgba(142, 202, 230, 0.3)",
                }}
              >
                {t.exploreBannerTag || "SYNOPTIC RADAR • GLOBAL & INDIAN METRO CORRIDORS"}
              </span>
              {diurnalConfig && (
                <span
                  className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-[4px] backdrop-blur-sm"
                  style={{
                    backgroundColor: `${diurnalConfig.accentColor}25`,
                    color: diurnalConfig.accentColor,
                    border: `1px solid ${diurnalConfig.accentColor}50`,
                  }}
                >
                  {diurnalConfig.solarStatusBadge}
                </span>
              )}
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
              {t.exploreBannerTitle || "Explore & Compare Weather"}
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed">
              {t.exploreBannerDesc || "Discover deterministic physical weather patterns across Indian regional hubs, global metropolitan centers, and compare atmospheric parameters side-by-side."}
            </p>
          </div>

          {/* Telemetry HUD */}
          <div className="bg-[#0F141B]/85 backdrop-blur-md border border-white/10 p-3 rounded-[6px] hidden sm:flex flex-col gap-1.5 min-w-[210px] text-[11px] font-mono shrink-0 shadow-inner">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">SATELLITE ORBIT</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span> INSAT-3D
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">METRO HUBS:</span>
              <span className="text-[#8ECAE6] font-semibold">{FEATURED_HUBS.length} STATIONS</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">DATA SYNC:</span>
              <span className="text-slate-200 font-semibold">HOURLY DELTA</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">GRID PRECISION:</span>
              <span className="text-[#F4A261] font-semibold">0.05° RESOLUTION</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700" />
            <h3 className="text-xs font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900 uppercase font-mono tracking-wider">
              {t.tabExplore || "REGIONAL & WORLD TELEMETRY"}
            </h3>
          </div>
          <p className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5">
            Switch between curated metropolitan hubs or compare multi-city microclimates
          </p>
        </div>

        {/* Tab switch between Hubs and Comparison View */}
        <div className="inline-flex items-center gap-1 bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 p-1 rounded-[4px] border border-[#30353D] dark:border-[#30353D] light:border-slate-300 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("hubs")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs font-mono transition-colors cursor-pointer ${
              activeTab === "hubs"
                ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-white light:hover:text-slate-900 font-medium"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t.tabFeaturedHubs || "Featured Hubs"}</span>
          </button>
          <button
            onClick={() => setActiveTab("compare")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs font-mono transition-colors cursor-pointer ${
              activeTab === "compare"
                ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-white light:hover:text-slate-900 font-medium"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{t.tabCompareCities || "Side-by-Side Comparison"}</span>
          </button>
        </div>
      </div>

      {activeTab === "hubs" ? (
        <div className="space-y-4 sm:space-y-5">
          {/* Active Resolved Location Info Banner */}
          {currentLocation && (
            <div className="p-3.5 sm:p-4 rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-center text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">
                      {currentLocation.name}
                    </span>
                    <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded-[3px] bg-[#252A32] dark:bg-[#252A32] light:bg-sky-50 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 border border-[#8ECAE6]/30 dark:border-[#8ECAE6]/30 light:border-sky-300">
                      Active Location
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5 break-words">
                    {currentLocation.admin1 ? `${currentLocation.admin1}, ` : ""}
                    {currentLocation.country} • Timezone: {currentLocation.timezone || "Local"} • Coordinates: {currentLocation.latitude.toFixed(2)}°, {currentLocation.longitude.toFixed(2)}°
                  </p>
                </div>
              </div>
              <button
                onClick={onOpenLocationSearch}
                className="px-3 py-1.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-200 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 text-xs font-mono font-medium self-start sm:self-auto transition-colors cursor-pointer shrink-0"
              >
                Change Location
              </button>
            </div>
          )}

          {/* Filter Chips & Global Search Trigger */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 bg-[#171C23] dark:bg-[#171C23] light:bg-slate-100 p-1 rounded-[4px] border border-[#30353D] dark:border-[#30353D] light:border-slate-300 overflow-x-auto no-scrollbar max-w-full self-start">
              <button
                onClick={() => setHubCategory("all")}
                className={`px-3 py-1 rounded-[3px] text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  hubCategory === "all"
                    ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                    : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-white light:hover:text-slate-900"
                }`}
              >
                All Metros ({FEATURED_HUBS.length})
              </button>
              <button
                onClick={() => setHubCategory("india")}
                className={`px-3 py-1 rounded-[3px] text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  hubCategory === "india"
                    ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                    : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-white light:hover:text-slate-900"
                }`}
              >
                India Hubs
              </button>
              <button
                onClick={() => setHubCategory("world")}
                className={`px-3 py-1 rounded-[3px] text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  hubCategory === "world"
                    ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                    : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-white light:hover:text-slate-900"
                }`}
              >
                Global Metros
              </button>
            </div>

            <button
              onClick={onOpenLocationSearch}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-[4px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-300 hover:border-[#8ECAE6]/50 dark:hover:border-[#8ECAE6]/50 light:hover:border-sky-500 text-xs font-mono text-slate-200 dark:text-slate-200 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
            >
              <Search className="w-3.5 h-3.5 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700" />
              <span>Search Any City Worldwide</span>
            </button>
          </div>

          {/* Grid of Hub Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredHubs.map((hub) => {
              const isCurrent =
                currentLocation &&
                Math.abs(currentLocation.latitude - hub.latitude) < 0.05 &&
                Math.abs(currentLocation.longitude - hub.longitude) < 0.05;

              return (
                <div
                  key={hub.name}
                  className={`p-4 rounded-[8px] border transition-all duration-200 flex flex-col justify-between ${
                    isCurrent
                      ? "bg-[#1B2027] dark:bg-[#1B2027] light:bg-amber-50/50 border-2 border-[#F4A261] ring-2 ring-[#F4A261]/20 shadow-md"
                      : "bg-[#171C23] dark:bg-[#171C23] light:bg-white hover:bg-[#1B2027] dark:hover:bg-[#1B2027] light:hover:bg-slate-50 border-[#30353D] dark:border-[#30353D] light:border-slate-200 hover:border-[#8ECAE6]/40 dark:hover:border-[#8ECAE6]/40 light:hover:border-sky-300 shadow-sm"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-100 dark:text-slate-100 light:text-slate-900">
                            {hub.name}
                          </span>
                          <span className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded-[3px] border ${
                            isCurrent
                              ? "bg-[#F4A261] text-[#0F141B] border-[#F4A261]"
                              : "text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 bg-[#252A32] dark:bg-[#252A32] light:bg-sky-50 border-[#8ECAE6]/30 dark:border-[#8ECAE6]/30 light:border-sky-300"
                          }`}>
                            {hub.countryCode}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5">
                          {hub.admin1 ? `${hub.admin1}, ` : ""}
                          {hub.country}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[3px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 text-slate-300 dark:text-slate-300 light:text-slate-700 border border-[#30353D] dark:border-[#30353D] light:border-slate-200">
                        {hub.tag}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed line-clamp-2">
                      {hub.desc}
                    </p>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
                      Timezone: {hub.timezone}
                    </span>
                    <button
                      onClick={() =>
                        onSelectLocation({
                          name: hub.name,
                          country: hub.country,
                          countryCode: hub.countryCode,
                          admin1: hub.admin1,
                          latitude: hub.latitude,
                          longitude: hub.longitude,
                          timezone: hub.timezone,
                        })
                      }
                      className={`flex items-center gap-1 text-xs font-mono font-semibold px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer ${
                        isCurrent
                          ? "bg-[#F4A261] text-[#0F141B] font-bold border border-[#F4A261]"
                          : "text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-sky-50 hover:text-white dark:hover:text-white light:hover:text-sky-950 border border-transparent hover:border-[#30353D] dark:hover:border-[#30353D] light:hover:border-sky-200"
                      }`}
                    >
                      <span>{isCurrent ? "Active City" : "View Weather"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Side by Side Comparison Module */
        <div className="space-y-4">
          <ComparisonView
            isFahrenheit={isFahrenheit}
            currentLocation={currentLocation}
            diurnalPhase={diurnalPhase}
            diurnalConfig={diurnalConfig}
            preferredLanguage={preferredLanguage}
          />
        </div>
      )}
    </div>
  );
}
