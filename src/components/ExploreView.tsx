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

interface ExploreViewProps {
  currentLocation: LocationInfo | null;
  onSelectLocation: (loc: LocationInfo) => void;
  onOpenLocationSearch: () => void;
  isFahrenheit: boolean;
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
}: ExploreViewProps) {
  const [activeTab, setActiveTab] = useState<"hubs" | "compare">("hubs");
  const [hubCategory, setHubCategory] = useState<"all" | "india" | "world">("all");

  const filteredHubs = FEATURED_HUBS.filter(
    (h) => hubCategory === "all" || h.category === hubCategory
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-900/30 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-sky-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Explore & Compare Weather</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Discover meteorological patterns across major Indian hubs, global capitals, and compare destinations side by side
          </p>
        </div>

        {/* Tab switch between Hubs and Comparison View */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("hubs")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "hubs" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Featured Hubs</span>
          </button>
          <button
            onClick={() => setActiveTab("compare")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "compare" ? "bg-sky-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Side-by-Side Comparison</span>
          </button>
        </div>
      </div>

      {activeTab === "hubs" ? (
        <div className="space-y-6">
          {/* Filter Chips & Global Search Trigger */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setHubCategory("all")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  hubCategory === "all" ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                All Metros ({FEATURED_HUBS.length})
              </button>
              <button
                onClick={() => setHubCategory("india")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  hubCategory === "india" ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                India Hubs
              </button>
              <button
                onClick={() => setHubCategory("world")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  hubCategory === "world" ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Global Metros
              </button>
            </div>

            <button
              onClick={onOpenLocationSearch}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 text-xs font-medium text-slate-200 hover:text-white transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-sky-400" />
              <span>Search Any City Worldwide</span>
            </button>
          </div>

          {/* Grid of Hub Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHubs.map((hub) => {
              const isCurrent =
                currentLocation &&
                Math.abs(currentLocation.latitude - hub.latitude) < 0.05 &&
                Math.abs(currentLocation.longitude - hub.longitude) < 0.05;

              return (
                <div
                  key={hub.name}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isCurrent
                      ? "bg-sky-500/10 border-sky-500/50 ring-1 ring-sky-500/30"
                      : "bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white">{hub.name}</span>
                          <span className="text-[10px] uppercase font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                            {hub.countryCode}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {hub.admin1 ? `${hub.admin1}, ` : ""}
                          {hub.country}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/80">
                        {hub.tag}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {hub.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Timezone: {hub.timezone}</span>
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
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        isCurrent
                          ? "bg-sky-500 text-white"
                          : "text-sky-400 hover:text-white hover:bg-sky-500/20"
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
          <ComparisonView isFahrenheit={isFahrenheit} />
        </div>
      )}
    </div>
  );
}
