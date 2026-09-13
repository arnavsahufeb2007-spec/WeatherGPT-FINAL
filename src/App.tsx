import React, { useState, useEffect, useCallback } from "react";
import {
  ConversationContext,
  CurrentWeatherData,
  DailyForecastItem,
  HourlyForecastItem,
  LocationInfo,
  NasaEnvironmentalData,
  WeatherAdvisory,
  WeatherAnalysis,
} from "./types.js";
import {
  getCurrentWeatherAPI,
  getHourlyWeatherAPI,
  getDailyWeatherAPI,
  getNasaEnvironmentalAPI,
  searchLocationsAPI,
} from "./services/api.js";
import { Navbar } from "./components/Navbar.js";
import { CurrentWeatherHero } from "./components/CurrentWeatherHero.js";
import { HourlyForecastChart } from "./components/HourlyForecastChart.js";
import { DailyForecastList } from "./components/DailyForecastList.js";
import { AdvisoriesCard } from "./components/AdvisoriesCard.js";
import { NasaIntelligenceCard } from "./components/NasaIntelligenceCard.js";
import { ActivityExplorer } from "./components/ActivityExplorer.js";
import { TravelPlanner } from "./components/TravelPlanner.js";
import { ComparisonView } from "./components/ComparisonView.js";
import { WeatherChat } from "./components/WeatherChat.js";
import { LocationSearchDialog } from "./components/LocationSearchDialog.js";
import { Sparkles, AlertCircle, RefreshCw, Search, Navigation, Globe, MapPin } from "lucide-react";

const LOCATION_STORAGE_KEY = "weathergpt_active_location";

export default function App() {
  // Load saved location from localStorage if previously chosen by user
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(() => {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  });

  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherData | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecastItem[]>([]);
  const [dailyForecast, setDailyForecast] = useState<DailyForecastItem[]>([]);
  const [weatherAnalysis, setWeatherAnalysis] = useState<WeatherAnalysis | null>(null);
  const [advisories, setAdvisories] = useState<WeatherAdvisory[]>([]);
  const [nasaData, setNasaData] = useState<NasaEnvironmentalData | null>(null);

  const [activeTab, setActiveTab] = useState<"chat" | "overview" | "activity" | "travel" | "compare">("chat");
  const [isFahrenheit, setIsFahrenheit] = useState<boolean>(false);
  const [preferredLanguage, setPreferredLanguage] = useState<string>(() => {
    try {
      return localStorage.getItem("weathergpt_lang") || "en";
    } catch {
      return "en";
    }
  });

  const handleLanguageChange = (lang: string) => {
    setPreferredLanguage(lang);
    try {
      localStorage.setItem("weathergpt_lang", lang);
    } catch {
      // Ignore localStorage errors
    }
  };

  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    currentLocation: currentLocation || undefined,
    lastQueryTimestamp: new Date().toISOString(),
  });

  const locationVersionRef = React.useRef<number>(0);

  // Fetch weather data for a specific location with race-condition prevention
  const fetchWeather = useCallback(async (loc: LocationInfo, version: number) => {
    setLoading(true);
    setError(null);
    try {
      const [currentRes, hourlyRes, dailyRes, nasaRes] = await Promise.all([
        getCurrentWeatherAPI({
          lat: loc.latitude,
          lon: loc.longitude,
          location: loc.name,
          timezone: loc.timezone,
        }),
        getHourlyWeatherAPI(loc.latitude, loc.longitude, loc.timezone),
        getDailyWeatherAPI(loc.latitude, loc.longitude, loc.timezone),
        getNasaEnvironmentalAPI(loc.latitude, loc.longitude).catch((err) => {
          console.warn("NASA Earth observation layer degraded gracefully:", err);
          return null;
        }),
      ]);

      // If a newer location request was initiated while waiting, discard stale data
      if (version !== locationVersionRef.current) {
        console.warn(`Discarding stale weather response for version ${version} (current: ${locationVersionRef.current})`);
        return;
      }

      setCurrentWeather(currentRes.current);
      setWeatherAnalysis(currentRes.analysis);
      setAdvisories(currentRes.advisories || []);
      setHourlyForecast(hourlyRes);
      setDailyForecast(dailyRes);
      setNasaData(nasaRes);

      setConversationContext((prev) => ({
        ...prev,
        currentLocation: loc,
      }));
    } catch (err: any) {
      if (version === locationVersionRef.current) {
        setError(err.message || "Failed to load meteorological observations.");
      }
    } finally {
      if (version === locationVersionRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Handler when user selects any location from dynamic search
  const handleSelectLocation = useCallback(
    (loc: LocationInfo) => {
      const newVersion = ++locationVersionRef.current;
      setCurrentLocation(loc);
      try {
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
      } catch {
        // Ignore localStorage errors
      }
      setConversationContext((prev) => ({
        ...prev,
        currentLocation: loc,
      }));
      fetchWeather(loc, newVersion);
    },
    [fetchWeather]
  );

  // Initial startup: if no location saved, dynamically resolve browser's timezone city via Open-Meteo
  useEffect(() => {
    if (currentLocation) {
      const currentVersion = ++locationVersionRef.current;
      fetchWeather(currentLocation, currentVersion);
      return;
    }

    async function autoResolveDynamicLocation() {
      setLoading(true);
      try {
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const tzCity = userTz && userTz.includes("/") ? userTz.split("/")[1].replace(/_/g, " ") : "";

        if (tzCity) {
          const results = await searchLocationsAPI(tzCity, 1);
          if (results.length > 0) {
            handleSelectLocation(results[0]);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not automatically resolve initial location via timezone:", err);
      } finally {
        setLoading(false);
      }

      // If dynamic resolution didn't yield a location, open location picker dialog for user
      setIsLocationSearchOpen(true);
    }

    autoResolveDynamicLocation();
  }, [currentLocation, fetchWeather, handleSelectLocation]);

  // Geolocation detection handler
  const handleUseGeolocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser environment.");
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsDetectingLocation(false);
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lon = Math.round(pos.coords.longitude * 10000) / 10000;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

        // Try to reverse resolve place name via geocoding query or fallback to coordinates
        const detectedLoc: LocationInfo = {
          name: "Current GPS Location",
          country: "Detected via GPS",
          latitude: lat,
          longitude: lon,
          timezone: tz,
        };

        handleSelectLocation(detectedLoc);
      },
      (err) => {
        setIsDetectingLocation(false);
        console.warn("Geolocation detection declined or failed:", err.message);
        setIsLocationSearchOpen(true);
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentLocation={currentLocation}
        isFahrenheit={isFahrenheit}
        onToggleUnit={() => setIsFahrenheit((prev) => !prev)}
        onOpenLocationSearch={() => setIsLocationSearchOpen(true)}
        onUseGeolocation={handleUseGeolocation}
        isDetectingLocation={isDetectingLocation}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        preferredLanguage={preferredLanguage}
        onChangeLanguage={handleLanguageChange}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            {currentLocation && (
              <button
                onClick={() => fetchWeather(currentLocation)}
                className="flex items-center gap-1 font-semibold text-rose-200 hover:text-white underline"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* No Location Selected Welcome Hero */}
        {!currentLocation && !loading && (
          <div className="py-16 text-center max-w-xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-600/20 border border-sky-500/30 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/10">
              <Globe className="w-8 h-8 text-sky-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">Welcome to WeatherGPT</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Search and select any city, town, state, or region worldwide to access real-time verified weather data,
                deterministic analysis, and conversational AI insights.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                id="welcome-search-location-btn"
                onClick={() => setIsLocationSearchOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 transition-all"
              >
                <Search className="w-4 h-4" />
                <span>Search Location Worldwide</span>
              </button>
              <button
                id="welcome-use-gps-btn"
                onClick={handleUseGeolocation}
                disabled={isDetectingLocation}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-medium transition-colors"
              >
                <Navigation className={`w-4 h-4 text-sky-400 ${isDetectingLocation ? "animate-spin" : ""}`} />
                <span>Use Current Location</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Conversational AI Assistant */}
        {activeTab === "chat" && (
          <div className="space-y-6">
            <WeatherChat
              currentLocation={currentLocation}
              context={conversationContext}
              onUpdateContext={setConversationContext}
              onSelectLocation={handleSelectLocation}
              preferredLanguage={preferredLanguage}
              isFahrenheit={isFahrenheit}
            />

            {/* Weather snapshot beneath chat */}
            {currentWeather && currentLocation && (
              <div className="pt-2 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>Live Observations: {currentLocation.name}</span>
                    {currentLocation.countryCode && (
                      <span className="text-[10px] uppercase font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                        {currentLocation.countryCode}
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={() => setIsLocationSearchOpen(true)}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium"
                  >
                    Change City
                  </button>
                </div>
                <CurrentWeatherHero
                  location={currentLocation}
                  current={currentWeather}
                  analysis={weatherAnalysis || undefined}
                  todayDaily={dailyForecast[0]}
                  isFahrenheit={isFahrenheit}
                  language={preferredLanguage}
                />
                {nasaData && nasaData.status === "available" && (
                  <NasaIntelligenceCard nasaData={nasaData} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Forecast Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {currentWeather && currentLocation ? (
              <>
                <CurrentWeatherHero
                  location={currentLocation}
                  current={currentWeather}
                  analysis={weatherAnalysis || undefined}
                  todayDaily={dailyForecast[0]}
                  isFahrenheit={isFahrenheit}
                  language={preferredLanguage}
                />

                {advisories.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Active Deterministic Advisories
                    </h3>
                    <AdvisoriesCard advisories={advisories} />
                  </div>
                )}

                {/* NASA Earth Observation & Environmental Layer */}
                {nasaData && nasaData.status === "available" && (
                  <div>
                    <NasaIntelligenceCard nasaData={nasaData} />
                  </div>
                )}

                <HourlyForecastChart hourly={hourlyForecast} isFahrenheit={isFahrenheit} />

                <DailyForecastList daily={dailyForecast} isFahrenheit={isFahrenheit} />
              </>
            ) : (
              <div className="py-16 text-center text-slate-400 text-sm">
                {loading ? (
                  "Loading verified weather data..."
                ) : (
                  <button
                    onClick={() => setIsLocationSearchOpen(true)}
                    className="text-sky-400 underline font-medium"
                  >
                    Select a location to view forecasts
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Activity Weather Intelligence */}
        {activeTab === "activity" && (
          <div className="space-y-6">
            {currentWeather && currentLocation ? (
              <ActivityExplorer
                location={currentLocation}
                current={currentWeather}
                hourly={hourlyForecast}
                daily={dailyForecast}
                isFahrenheit={isFahrenheit}
              />
            ) : (
              <div className="py-16 text-center text-slate-400 text-sm">
                {loading ? (
                  "Loading weather observations..."
                ) : (
                  <button
                    onClick={() => setIsLocationSearchOpen(true)}
                    className="text-sky-400 underline font-medium"
                  >
                    Select a location to evaluate outdoor activities
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Travel & Route Weather Intelligence */}
        {activeTab === "travel" && (
          <div className="space-y-6">
            <TravelPlanner isFahrenheit={isFahrenheit} />
          </div>
        )}

        {/* Tab 5: Location Weather Comparison */}
        {activeTab === "compare" && (
          <div className="space-y-6">
            <ComparisonView isFahrenheit={isFahrenheit} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/60 py-5 text-center text-xs text-slate-400 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>WeatherGPT • Conversational AI & Weather Intelligence</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Verified Open-Meteo & OSRM Engine</span>
            <span>•</span>
            <span>NASA Earth Observation Layer</span>
            <span>•</span>
            <span>Deterministic Analytics</span>
            <span>•</span>
            <span>Grounded Gemini NLU</span>
          </div>
        </div>
      </footer>

      {/* Location Search Dialog */}
      <LocationSearchDialog
        isOpen={isLocationSearchOpen}
        onClose={() => setIsLocationSearchOpen(false)}
        onSelectLocation={handleSelectLocation}
      />
    </div>
  );
}
