import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ConversationContext,
  CurrentWeatherData,
  DailyForecastItem,
  HourlyForecastItem,
  LocationInfo,
  WeatherAdvisory,
  WeatherAnalysis,
} from "./types.js";
import {
  getCurrentWeatherAPI,
  getHourlyWeatherAPI,
  getDailyWeatherAPI,
  searchLocationsAPI,
} from "./services/api.js";
import { Sidebar, NavSection } from "./components/Sidebar.js";
import { BottomNav } from "./components/BottomNav.js";
import { HeaderBar } from "./components/HeaderBar.js";
import { DevicePreviewBar, DeviceMode } from "./components/DevicePreviewBar.js";
import { CurrentWeatherHero } from "./components/CurrentWeatherHero.js";
import { HourlyForecastChart } from "./components/HourlyForecastChart.js";
import { DailyForecastList } from "./components/DailyForecastList.js";
import { AdvisoriesCard } from "./components/AdvisoriesCard.js";
import { ActivityExplorer } from "./components/ActivityExplorer.js";
import { TravelPlanner } from "./components/TravelPlanner.js";
import { VoiceStudioView } from "./components/VoiceStudioView.js";
import { ExploreView } from "./components/ExploreView.js";
import { SettingsView } from "./components/SettingsView.js";
import { WeatherChat } from "./components/WeatherChat.js";
import { HistoryView } from "./components/HistoryView.js";
import { LocationSearchDialog } from "./components/LocationSearchDialog.js";
import { AuthModal } from "./components/AuthModal.js";
import { AuthPage } from "./components/AuthPage.js";
import { authService, UserProfile } from "./services/auth.js";
import { useVoiceMode } from "./services/voice/useVoiceMode.js";
import { savedLocationsService } from "./services/savedLocationsService.js";
import { preferencesService } from "./services/preferencesService.js";
import { ConversationRecord } from "./types.js";
import { WeatherGptLogo } from "./components/WeatherGptLogo.js";
import { processSevereAdvisories } from "./services/notificationService.js";
import { Sparkles, AlertCircle, RefreshCw, Search, Navigation, Globe, MapPin } from "lucide-react";
import {
  DiurnalPhase,
  determineDiurnalPhase,
  DIURNAL_PHASE_CONFIGS,
} from "./services/diurnalTheme.js";
import { SolarAtmosphereBar } from "./components/SolarAtmosphereBar.js";

const LOCATION_STORAGE_KEY = "weathergpt_active_location";
const THEME_STORAGE_KEY = "weathergpt_theme";

export default function App() {
  // Theme state: dark mode default with localStorage persistence
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) return saved === "dark";
      return true; // Default to obsidian dark
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
      if (isDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    } catch {
      // Ignore storage errors
    }
  }, [isDark]);

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // Auth & user profile state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    // If this window was opened as an OAuth popup and has returned from Supabase,
    // postMessage back to the opener window and close this popup.
    if (typeof window !== "undefined" && window.opener && window.opener !== window) {
      try {
        window.opener.postMessage(
          {
            type: "SUPABASE_AUTH_SUCCESS",
            hash: window.location.hash,
            search: window.location.search,
            href: window.location.href,
          },
          "*"
        );
      } catch {
        // Ignore cross-origin postMessage errors
      }
      setTimeout(() => {
        try {
          window.close();
        } catch {
          // Ignore close errors
        }
      }, 500);
    }
  }, []);

  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Responsive device preview simulator: auto, phone, tablet, laptop, desktop
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("auto");

  // Navigation section
  const [currentSection, setCurrentSection] = useState<NavSection>("home");

  // Active cloud conversation session state
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationTitle, setActiveConversationTitle] = useState<string | null>(null);

  // Load saved location from localStorage if previously chosen by user
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(() => {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
          // Purge corrupted 'My, Belgium' location if persisted from previous session
          if (parsed.name?.toLowerCase() === "my" && (parsed.countryCode === "BE" || parsed.country?.toLowerCase() === "belgium")) {
            localStorage.removeItem(LOCATION_STORAGE_KEY);
            return null;
          }
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

  // Dedicated voice mode instance for the settings view
  const voice = useVoiceMode(preferredLanguage);

  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    currentLocation: currentLocation || undefined,
    lastQueryTimestamp: new Date().toISOString(),
  });

  const locationVersionRef = useRef<number>(0);
  const hasInitializedLocationRef = useRef<boolean>(false);

  // Fetch weather data for a specific location with race-condition prevention
  const fetchWeather = useCallback(async (loc: LocationInfo, version?: number) => {
    const v = typeof version === "number" ? version : ++locationVersionRef.current;
    setLoading(true);
    setError(null);
    try {
      const weatherBundle = await getCurrentWeatherAPI({
        lat: loc.latitude,
        lon: loc.longitude,
        location: loc.name,
        timezone: loc.timezone,
      });

      // If a newer location request was initiated while waiting, discard stale data
      if (v !== locationVersionRef.current) {
        return;
      }

      const hourly = weatherBundle.hourly || (await getHourlyWeatherAPI(loc.latitude, loc.longitude, loc.timezone));
      const daily = weatherBundle.daily || (await getDailyWeatherAPI(loc.latitude, loc.longitude, loc.timezone));

      if (v !== locationVersionRef.current) {
        return;
      }

      setCurrentWeather(weatherBundle.current);
      setWeatherAnalysis(weatherBundle.analysis);
      setAdvisories(weatherBundle.advisories || []);
      setHourlyForecast(hourly);
      setDailyForecast(daily);

      setConversationContext((prev) => ({
        ...prev,
        currentLocation: loc,
      }));
    } catch (err: any) {
      if (v === locationVersionRef.current) {
        setError(err.message || "Failed to load meteorological observations.");
      }
    } finally {
      if (v === locationVersionRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Trigger browser notifications for severe weather advisories in current location
  useEffect(() => {
    if (advisories && advisories.length > 0) {
      processSevereAdvisories(advisories, currentLocation?.name);
    }
  }, [advisories, currentLocation?.name]);

  // Handler when user selects any location from search or hubs
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
    if (hasInitializedLocationRef.current) return;
    hasInitializedLocationRef.current = true;

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

      setIsLocationSearchOpen(true);
    }

    autoResolveDynamicLocation();
  }, [currentLocation, fetchWeather, handleSelectLocation]);

  // Geolocation detection handler
  const handleUseGeolocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser environment.");
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsDetectingLocation(false);
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lon = Math.round(pos.coords.longitude * 10000) / 10000;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

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

  // Sync guest data to cloud on user login and restore user cloud preferences
  useEffect(() => {
    if (currentUser && !currentUser.isGuest) {
      // Sync guest saved locations to Supabase
      savedLocationsService.syncGuestLocationsToCloud(currentUser.id);

      // Load user preferences from Supabase
      preferencesService.getPreferences(currentUser.id, false).then((prefs) => {
        if (prefs) {
          if (prefs.preferred_language) setPreferredLanguage(prefs.preferred_language);
          if (typeof prefs.is_fahrenheit === "boolean") setIsFahrenheit(prefs.is_fahrenheit);
          if (prefs.theme) setIsDark(prefs.theme === "dark");
        }
      });
    }
  }, [currentUser?.id, currentUser?.isGuest]);

  // Sync preference changes to Supabase when user updates them
  useEffect(() => {
    if (currentUser && !currentUser.isGuest) {
      preferencesService.savePreferences(currentUser.id, false, {
        preferred_language: preferredLanguage,
        is_fahrenheit: isFahrenheit,
        theme: isDark ? "dark" : "light",
      });
    }
  }, [preferredLanguage, isFahrenheit, isDark, currentUser?.id, currentUser?.isGuest]);

  // Select a conversation from HistoryView to restore chat session
  const handleSelectConversation = useCallback(
    (conv: ConversationRecord) => {
      setActiveConversationId(conv.id);
      setActiveConversationTitle(conv.title);
      if (conv.location_name && conv.latitude && conv.longitude) {
        const convLoc: LocationInfo = {
          name: conv.location_name,
          latitude: conv.latitude,
          longitude: conv.longitude,
          country: "Saved Session",
          timezone: "UTC",
        };
        handleSelectLocation(convLoc);
      }
      setCurrentSection("home");
    },
    [handleSelectLocation]
  );

  // Start a new conversation session
  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setActiveConversationTitle(null);
    setCurrentSection("home");
  }, []);

  // Device simulation wrapper style
  const getDeviceFrameClass = () => {
    switch (deviceMode) {
      case "phone":
        return "max-w-[375px] mx-auto border-x-4 border-slate-700/80 shadow-2xl rounded-3xl overflow-hidden min-h-[812px] my-4";
      case "tablet":
        return "max-w-[768px] mx-auto border border-slate-700/80 shadow-2xl rounded-2xl overflow-hidden my-4";
      case "laptop":
        return "max-w-[1024px] mx-auto border border-slate-700/80 shadow-2xl rounded-xl overflow-hidden my-4";
      case "desktop":
        return "max-w-[1440px] mx-auto border border-slate-700/80 shadow-2xl rounded-xl overflow-hidden my-4";
      default:
        return "w-full";
    }
  };

  // Full-Page Diurnal Atmospheric Theme System (Permanent Core Feature)
  const [activePhaseOverride, setActivePhaseOverride] = useState<DiurnalPhase | "auto">(() => {
    try {
      const saved = localStorage.getItem("weathergpt_diurnal_phase") as DiurnalPhase | "auto" | null;
      return saved || "auto";
    } catch {
      return "auto";
    }
  });

  const handleSelectPhase = (phase: DiurnalPhase | "auto") => {
    setActivePhaseOverride(phase);
    try {
      localStorage.setItem("weathergpt_diurnal_phase", phase);
    } catch {}
  };

  const detectedDiurnalPhase = useMemo(() => {
    if (currentWeather) {
      return determineDiurnalPhase(
        currentWeather.time,
        currentWeather.sunrise,
        currentWeather.sunset,
        currentWeather.isDay
      );
    }
    const nowStr = new Date().toTimeString().slice(0, 5);
    return determineDiurnalPhase(nowStr, undefined, undefined, true);
  }, [currentWeather]);

  const activeDiurnalPhase: DiurnalPhase =
    activePhaseOverride === "auto" ? detectedDiurnalPhase : activePhaseOverride;
  const activeDiurnalConfig = DIURNAL_PHASE_CONFIGS[activeDiurnalPhase];
  const activeDiurnalTheme = isDark
    ? activeDiurnalConfig.darkTheme
    : activeDiurnalConfig.lightTheme;
  const activePageBg =
    activeDiurnalConfig.backgrounds[currentSection] ||
    activeDiurnalConfig.backgrounds.home;

  return (
    <div
      data-diurnal-theme="true"
      data-diurnal-trial="true"
      data-diurnal-phase={activeDiurnalPhase}
      className={`min-h-screen relative flex flex-col selection:bg-[#8ECAE6]/30 selection:text-white transition-colors duration-500`}
      style={{
        backgroundColor: activeDiurnalTheme.bodyBase,
        color: isDark ? "#F8FAFC" : "#0F172A",
        "--diurnal-border": activeDiurnalTheme.borderTone,
        "--diurnal-card-bg": activeDiurnalTheme.cardBg,
        "--diurnal-accent": activeDiurnalConfig.accentColor,
      } as React.CSSProperties}
    >
      {/* Full-Page Diurnal Photographic Atmospheric Backdrop (Permanent Core Feature) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-1000">
        <img
          key={`${currentSection}-${activeDiurnalPhase}`}
          src={activePageBg.photoUrl}
          alt={activePageBg.photoAlt}
          className="w-full h-full object-cover object-center opacity-80 sm:opacity-85 scale-105 transition-all duration-1000 ease-out"
        />
        {/* Atmospheric multi-layer gradient vignette */}
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{
            background: activeDiurnalTheme.overlay,
          }}
        />
        {/* Radial ambient solar glow */}
        <div
          className="absolute inset-0 transition-all duration-700 pointer-events-none"
          style={{
            background: activeDiurnalTheme.ambientGlow,
          }}
        />
      </div>

      {/* Device Mode Preview Switcher Top Bar */}
      <DevicePreviewBar
        deviceMode={deviceMode}
        onChangeDeviceMode={setDeviceMode}
      />

      {/* Permanent Solar Atmosphere Phase Option Bar */}
      <SolarAtmosphereBar
        selectedPhase={activePhaseOverride}
        onSelectPhase={handleSelectPhase}
        detectedPhase={detectedDiurnalPhase}
        currentSection={currentSection}
        isDark={isDark}
        localTimeStr={currentWeather?.time}
        cityName={currentLocation?.name}
      />

      {/* Main Responsive Layout Shell */}
      <div className={`flex-1 flex flex-col relative z-10 ${getDeviceFrameClass()}`}>
        <div className="flex-1 flex flex-row min-h-screen">
          {/* Laptop & Desktop Sidebar Navigation (Hidden in mobile phone layout) */}
          {deviceMode !== "phone" && (
            <Sidebar
              currentSection={currentSection}
              onSelectSection={setCurrentSection}
              currentLocation={currentLocation}
              onOpenLocationSearch={() => setIsLocationSearchOpen(true)}
              isDark={isDark}
              onToggleTheme={handleToggleTheme}
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              preferredLanguage={preferredLanguage}
            />
          )}

          {/* Center Main Stage Content */}
          <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-6">
            {/* Unified Top Header Bar */}
            <HeaderBar
              currentSection={currentSection}
              currentLocation={currentLocation}
              currentWeather={currentWeather}
              isFahrenheit={isFahrenheit}
              onToggleUnit={() => setIsFahrenheit((prev) => !prev)}
              onOpenLocationSearch={() => setIsLocationSearchOpen(true)}
              onUseGeolocation={handleUseGeolocation}
              isDetectingLocation={isDetectingLocation}
              isDark={isDark}
              onToggleTheme={handleToggleTheme}
              currentUser={currentUser}
              onOpenAuth={() => setCurrentSection("auth")}
              onOpenSettings={() => setCurrentSection("settings")}
              deviceMode={deviceMode}
              onChangeDeviceMode={setDeviceMode}
              preferredLanguage={preferredLanguage}
            />

            {/* Error Banner */}
            {error && (
              <div className="mx-4 lg:mx-8 mt-4 p-3.5 rounded-[6px] bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
                {currentLocation && (
                  <button
                    onClick={() => fetchWeather(currentLocation)}
                    className="flex items-center gap-1 font-semibold text-rose-200 hover:text-white underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            )}

            {/* Content Area */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-8 py-6">
              {/* No Location Welcome Hero */}
              {!currentLocation && !loading && (
                <div className="py-16 text-center max-w-xl mx-auto space-y-5">
                  <div className="w-16 h-16 rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-center mx-auto p-1.5 shadow-xl shadow-sky-500/10">
                    <WeatherGptLogo size={52} />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-bold tracking-tight text-slate-100 dark:text-slate-100 light:text-slate-900">
                      Welcome to WeatherGPT
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed max-w-md mx-auto">
                      Search and select any city worldwide to access verified weather observations, deterministic
                      forecasts, and conversational AI insights.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                    <button
                      id="welcome-search-location-btn"
                      onClick={() => setIsLocationSearchOpen(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-[4px] bg-[#252A32] dark:bg-[#252A32] light:bg-slate-900 hover:bg-[#30353D] dark:hover:bg-[#30353D] light:hover:bg-slate-800 text-slate-100 dark:text-slate-100 light:text-white border border-[#30353D] dark:border-[#30353D] light:border-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5 text-[#8ECAE6]" />
                      <span>Search Location Worldwide</span>
                    </button>
                    <button
                      id="welcome-use-gps-btn"
                      onClick={handleUseGeolocation}
                      disabled={isDetectingLocation}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-200 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-slate-300 dark:text-slate-300 light:text-slate-800 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Navigation className={`w-3.5 h-3.5 text-[#8ECAE6] ${isDetectingLocation ? "animate-spin" : ""}`} />
                      <span>Use Current GPS</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 1. HOME SECTION: Focused on Location, Current Weather Hero, and AI Chat */}
              {currentSection === "home" && (
                <div className="space-y-6">
                  {/* Current Weather Hero Summary */}
                  {currentWeather && currentLocation && (
                    <CurrentWeatherHero
                      location={currentLocation}
                      current={currentWeather}
                      analysis={weatherAnalysis || undefined}
                      todayDaily={dailyForecast[0]}
                      isFahrenheit={isFahrenheit}
                      language={preferredLanguage}
                      activePhaseOverride={activePhaseOverride}
                      onPhaseChange={handleSelectPhase}
                    />
                  )}

                  {/* Conversational AI Weather Assistant with Voice and Multilingual Grounding */}
                  <div className="space-y-2">
                    <WeatherChat
                      currentLocation={currentLocation}
                      currentWeather={currentWeather}
                      weatherAnalysis={weatherAnalysis}
                      dailyForecast={dailyForecast}
                      context={conversationContext}
                      onUpdateContext={setConversationContext}
                      onSelectLocation={handleSelectLocation}
                      preferredLanguage={preferredLanguage}
                      isFahrenheit={isFahrenheit}
                      currentUser={currentUser}
                      activeConversationId={activeConversationId}
                      activeConversationTitle={activeConversationTitle}
                      onActiveConversationChange={(id, title) => {
                        setActiveConversationId(id);
                        if (title) setActiveConversationTitle(title);
                      }}
                      onNewChat={handleNewChat}
                    />
                  </div>
                </div>
              )}

              {/* 2. FORECAST SECTION: Detailed Hourly Chart, 7-Day List, Advisories */}
              {currentSection === "forecast" && (
                <div className="space-y-4">
                  {currentWeather && currentLocation ? (
                    <>
                      {/* Atmospheric Forecast Hero Banner */}
                      <div
                        data-atmospheric-banner="true"
                        className="hero-atmospheric-card atmospheric-hero-card relative rounded-[8px] bg-[#0F141B] border border-[#30353D] p-5 sm:p-6 overflow-hidden transition-colors shadow-lg"
                        style={{ borderColor: `${activeDiurnalConfig.accentColor}40` }}
                      >
                        <div className="absolute inset-0 z-0 pointer-events-none select-none">
                          <img
                            key={activeDiurnalConfig.backgrounds.forecast.photoUrl}
                            src={activeDiurnalConfig.backgrounds.forecast.photoUrl}
                            alt={activeDiurnalConfig.backgrounds.forecast.photoAlt}
                            className="w-full h-full object-cover object-center opacity-75 dark:opacity-70 transition-opacity duration-700"
                          />
                          <div
                            className="absolute inset-0 transition-colors duration-700"
                            style={{
                              background: "linear-gradient(90deg, rgba(13,19,26,0.94) 0%, rgba(13,19,26,0.80) 55%, rgba(13,19,26,0.25) 100%)",
                            }}
                          />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1.5 max-w-xl">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-[3px] bg-[#0F141B]/80 border transition-colors"
                                style={{
                                  color: activeDiurnalConfig.accentColor,
                                  borderColor: `${activeDiurnalConfig.accentColor}40`,
                                }}
                              >
                                METEOROLOGICAL FORECAST • {activeDiurnalConfig.stationTelemetrySub}
                              </span>
                              <span
                                className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-[4px] backdrop-blur-sm"
                                style={{
                                  backgroundColor: `${activeDiurnalConfig.accentColor}25`,
                                  color: activeDiurnalConfig.accentColor,
                                  border: `1px solid ${activeDiurnalConfig.accentColor}50`,
                                }}
                              >
                                {activeDiurnalConfig.solarStatusBadge}
                              </span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
                              Multi-Day & Hourly Trajectory • {currentLocation.name}
                            </h2>
                            <p className="text-xs text-slate-200 leading-relaxed">
                              High-resolution thermodynamic temperature projections, precipitation probabilities, barometric pressure trends, and wind vector curves.
                            </p>
                          </div>
                        </div>
                      </div>

                      {advisories.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-600 uppercase tracking-wider mb-2 font-mono">
                            Active Meteorological Advisories
                          </h3>
                          <AdvisoriesCard advisories={advisories} />
                        </div>
                      )}

                      <HourlyForecastChart hourly={hourlyForecast} isFahrenheit={isFahrenheit} />

                      <DailyForecastList daily={dailyForecast} isFahrenheit={isFahrenheit} />
                    </>
                  ) : (
                    <div className="py-16 text-center text-slate-400 text-xs">
                      {loading ? (
                        "Loading verified forecast data..."
                      ) : (
                        <button
                          onClick={() => setIsLocationSearchOpen(true)}
                          className="text-[#8ECAE6] hover:underline font-medium cursor-pointer"
                        >
                          Select a location to view hourly and 7-day forecast
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. AI INSIGHTS SECTION: Activity Weather Intelligence, Comfort, and Suitability */}
              {currentSection === "insights" && (
                <div className="space-y-4 sm:space-y-5">
                  {currentWeather && currentLocation ? (
                    <ActivityExplorer
                      location={currentLocation}
                      current={currentWeather}
                      hourly={hourlyForecast}
                      daily={dailyForecast}
                      isFahrenheit={isFahrenheit}
                      diurnalPhase={activeDiurnalPhase}
                      diurnalConfig={activeDiurnalConfig}
                    />
                  ) : (
                    <div className="py-16 text-center text-slate-400 text-xs font-mono">
                      {loading ? (
                        "Evaluating meteorological suitability..."
                      ) : (
                        <button
                          onClick={() => setIsLocationSearchOpen(true)}
                          className="text-[#8ECAE6] hover:underline font-medium cursor-pointer"
                        >
                          Select a location to evaluate outdoor activities
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 4. TRAVEL SECTION: Travel & Route Weather Intelligence */}
              {currentSection === "travel" && (
                <div className="space-y-4 sm:space-y-5">
                  <TravelPlanner
                    isFahrenheit={isFahrenheit}
                    currentLocation={currentLocation}
                    diurnalPhase={activeDiurnalPhase}
                    diurnalConfig={activeDiurnalConfig}
                  />
                </div>
              )}

              {/* 5. VOICE SECTION: Dedicated Multilingual Hands-Free Voice Studio */}
              {currentSection === "voice" && (
                <div className="space-y-4 sm:space-y-5">
                  <VoiceStudioView
                    currentLocation={currentLocation}
                    preferredLanguage={preferredLanguage}
                    isFahrenheit={isFahrenheit}
                    onOpenLocationSearch={() => setIsLocationSearchOpen(true)}
                    context={conversationContext}
                    onUpdateContext={setConversationContext}
                    diurnalPhase={activeDiurnalPhase}
                    diurnalConfig={activeDiurnalConfig}
                  />
                </div>
              )}

              {/* 6. EXPLORE SECTION: Curated Hubs & Side-by-Side Comparison */}
              {currentSection === "explore" && (
                <div className="space-y-4 sm:space-y-5">
                  <ExploreView
                    currentLocation={currentLocation}
                    onSelectLocation={handleSelectLocation}
                    onOpenLocationSearch={() => setIsLocationSearchOpen(true)}
                    isFahrenheit={isFahrenheit}
                    diurnalPhase={activeDiurnalPhase}
                    diurnalConfig={activeDiurnalConfig}
                  />
                </div>
              )}

              {/* 7. CLOUD HISTORY SECTION: Search, Restore, and Manage Sessions */}
              {currentSection === "history" && (
                <div className="space-y-4 sm:space-y-5">
                  <HistoryView
                    currentUser={currentUser}
                    activeConversationId={activeConversationId}
                    onSelectConversation={handleSelectConversation}
                    onNewChat={handleNewChat}
                    onRequestAuth={() => setIsAuthModalOpen(true)}
                    diurnalPhase={activeDiurnalPhase}
                    diurnalConfig={activeDiurnalConfig}
                  />
                </div>
              )}

              {/* 8. SETTINGS SECTION: Profile, Appearance, Units, Languages, Voice Dialects */}
              {currentSection === "settings" && (
                <div className="space-y-4 sm:space-y-5">
                  <SettingsView
                    currentUser={currentUser}
                    onOpenAuth={() => setCurrentSection("auth")}
                    isDark={isDark}
                    onToggleTheme={handleToggleTheme}
                    isFahrenheit={isFahrenheit}
                    onToggleUnit={() => setIsFahrenheit((prev) => !prev)}
                    preferredLanguage={preferredLanguage}
                    onChangeLanguage={handleLanguageChange}
                    deviceMode={deviceMode}
                    onChangeDeviceMode={setDeviceMode}
                    onSelectLocation={handleSelectLocation}
                    voice={{
                      inputLanguage: voice.inputLanguage,
                      outputLanguage: voice.outputLanguage,
                      effectiveInputLanguage: voice.effectiveInputLanguage,
                      effectiveOutputLanguage: voice.effectiveOutputLanguage,
                      autoSpeak: voice.autoSpeak,
                      speechRate: voice.settings.speechRate,
                      setInputLanguage: voice.setInputLanguage,
                      setOutputLanguage: voice.setOutputLanguage,
                      toggleAutoSpeak: voice.toggleAutoSpeak,
                      setSpeechRate: voice.setSpeechRate,
                      resetVoiceLanguages: voice.resetVoiceLanguages,
                      speak: voice.speak,
                      stopSpeaking: voice.stopSpeaking,
                      isSpeaking: voice.isSpeaking,
                    }}
                  />
                </div>
              )}

              {/* 8. AUTH SECTION: Dedicated Modern Login & Sign Up Page */}
              {currentSection === "auth" && (
                <div className="space-y-4 sm:space-y-5">
                  <AuthPage
                    onSuccess={(user) => {
                      setCurrentUser(user);
                      setCurrentSection("home");
                    }}
                    onCancel={() => setCurrentSection("home")}
                  />
                </div>
              )}
            </main>

            {/* Desktop / Laptop Subtle Footer */}
            <footer className="mt-auto border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 bg-[#171C23] dark:bg-[#171C23] light:bg-white py-3 text-center text-xs text-slate-400 px-4 transition-colors">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-400 light:text-slate-600 text-xs">
                  <Globe className="w-3.5 h-3.5 text-[#8ECAE6]" />
                  <span>Atmospheric intelligence distilled from verified Open-Meteo & NOAA METAR telemetry</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 light:text-slate-600">
                  <span>OSRM Route Models</span>
                  <span>•</span>
                  <span>39+ Indian & Global Dialects</span>
                  <span>•</span>
                  <span>Strict Data Privacy</span>
                </div>
              </div>
            </footer>
          </div>
        </div>

        {/* Mobile Phone Bottom Navigation (Shown on mobile or when Phone device mode is active) */}
        {(deviceMode === "phone" || deviceMode === "auto") && (
          <BottomNav
            currentSection={currentSection}
            onSelectSection={setCurrentSection}
            deviceMode={deviceMode}
          />
        )}
      </div>

      {/* Global Location Search Dialog */}
      <LocationSearchDialog
        isOpen={isLocationSearchOpen}
        onClose={() => setIsLocationSearchOpen(false)}
        onSelectLocation={handleSelectLocation}
      />

      {/* Modern Authentication Dialog */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}
