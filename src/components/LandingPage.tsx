import React, { useRef } from "react";
import {
  CloudSun,
  TrendingUp,
  Sparkles,
  Mic,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Languages,
  MapPin,
  ChevronDown,
  Wind,
  Compass,
} from "lucide-react";
import { WeatherGptLogo } from "./WeatherGptLogo.js";
import { getLanguageConfig, getTranslations, ALL_LANGUAGES } from "../languages.js";

interface LandingPageProps {
  preferredLanguage: string;
  onGetStarted: () => void;
  onExploreForecast?: () => void;
  onSelectCity?: (cityName: string) => void;
  onChangeLanguage?: (langCode: string) => void;
  onSelectQuery?: (queryText: string) => void;
}

export function LandingPage({
  preferredLanguage,
  onGetStarted,
  onExploreForecast,
  onSelectCity,
  onChangeLanguage,
  onSelectQuery,
}: LandingPageProps) {
  const langConfig = getLanguageConfig(preferredLanguage);
  const t = getTranslations(preferredLanguage);

  const featuresRef = useRef<HTMLDivElement>(null);

  const scrollToFeatures = () => {
    if (featuresRef.current) {
      featuresRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const popularCities = [
    { name: "Tokyo", country: "Japan", temp: "18°C", cond: "Partly Cloudy" },
    { name: "Delhi", country: "India", temp: "28°C", cond: "Haze" },
    { name: "London", country: "UK", temp: "14°C", cond: "Light Drizzle" },
    { name: "New York", country: "USA", temp: "16°C", cond: "Clear Sky" },
    { name: "Paris", country: "France", temp: "15°C", cond: "Mainly Clear" },
  ];

  const sampleQueries = langConfig.sampleQueries && langConfig.sampleQueries.length > 0
    ? langConfig.sampleQueries
    : [
        "Will it rain in Tokyo today?",
        "Outdoor running conditions in London",
        "Paris to Berlin road trip weather",
        "Compare Mumbai vs New York humidity",
      ];

  return (
    <div id="weathergpt-landing-page" className="min-h-screen bg-[#080F1A] text-[#FDFBF7] font-sans selection:bg-[#F4A261] selection:text-slate-950 flex flex-col justify-between relative overflow-x-hidden antialiased">
      {/* Photographic Atmospheric Background Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-25 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1920&auto=format&fit=crop"
          alt="Atmospheric Clouds"
          className="w-full h-full object-cover object-center filter grayscale contrast-125 scale-105 animate-pulse"
          style={{ animationDuration: "12s" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080F1A]/90 via-[#080F1A]/70 to-[#080F1A]/95" />
      </div>

      {/* Atmospheric Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#8ECAE6]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 right-10 w-96 h-96 bg-[#F4A261]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-3">
          <WeatherGptLogo className="w-8 h-8" />
          <div>
            <span className="text-base font-extrabold tracking-tight text-[#FDFBF7] font-mono block">
              WeatherGPT
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:block uppercase tracking-wider">
              {t.tagline || "Atmospheric Intelligence"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative group">
            <select
              value={preferredLanguage}
              onChange={(e) => onChangeLanguage && onChangeLanguage(e.target.value)}
              className="appearance-none bg-[#111827] border border-slate-700/80 hover:border-amber-500/50 text-[#FDFBF7] text-xs rounded-lg px-3 py-1.5 pr-7 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#F4A261] font-medium"
              aria-label="Select Display Language"
            >
              {ALL_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-[#0F172A] text-white">
                  {l.nativeName ? `${l.name} (${l.nativeName})` : l.name}
                </option>
              ))}
            </select>
            <Languages className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={onGetStarted}
            className="bg-[#F4A261] hover:bg-[#E29578] text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-lg shadow-amber-500/10 flex items-center gap-1.5 cursor-pointer font-mono"
          >
            <span>{t.landingExploreWeather || t.landingGetStarted || "Explore Weather"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-16 z-10 relative flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Editorial Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#17212F] border border-slate-700/80 text-amber-300 text-xs font-mono font-medium tracking-wide">
            <Wind className="w-3.5 h-3.5 text-[#F4A261]" />
            <span>{t.landingHeroBadge || "GROUNDED ATMOSPHERIC INTELLIGENCE"}</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl font-black text-[#FDFBF7] tracking-tight leading-tight sm:leading-tight">
            {t.landingHeroTitle || "Conversational Weather Intelligence, Grounded in Real-Time Physics"}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans max-w-2xl mx-auto">
            {t.landingHeroSubtitle || "Explore verified weather forecasts, multi-day trajectories, travel corridors, and AI insights across 30+ regional and global languages."}
          </p>

          {/* CTAs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={onGetStarted}
              className="bg-gradient-to-r from-[#F4A261] to-[#E29578] hover:from-[#E29578] hover:to-[#F4A261] text-slate-950 font-extrabold text-sm px-7 py-3.5 rounded-xl transition-all shadow-xl shadow-amber-500/15 flex items-center gap-2 cursor-pointer font-mono group"
            >
              <span>{t.landingExploreWeather || t.landingGetStarted || "Explore Weather"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={scrollToFeatures}
              className="bg-[#111827] hover:bg-[#1E293B] text-slate-200 border border-slate-700 font-semibold text-sm px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer font-mono"
            >
              <span>{t.landingDiscoverFeatures || "Discover Features"}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Popular City Shortcuts */}
          <div className="pt-6">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-mono block mb-3">
              {t.landingQuickCities || "Popular Destinations"}:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {popularCities.map((city) => (
                <button
                  key={city.name}
                  onClick={() => {
                    if (onSelectCity) onSelectCity(city.name);
                    onGetStarted();
                  }}
                  className="bg-[#0F172A]/90 hover:bg-[#1E293B] border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer"
                >
                  <MapPin className="w-3 h-3 text-[#8ECAE6]" />
                  <span>{city.name}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{city.temp}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div id="features" ref={featuresRef} className="mt-20 pt-8 border-t border-slate-800/80">
          <div className="text-center mb-8">
            <span className="text-xs text-amber-400 uppercase tracking-widest font-mono font-bold block mb-1">
              ATMOSPHERIC CAPABILITIES
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
              Integrated Weather Science & AI
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-[#0F172A]/90 border border-slate-800 hover:border-sky-500/50 transition-all backdrop-blur-sm group">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-110 transition-transform">
                <CloudSun className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono mb-2">
                {t.featureLiveForecastTitle || "Live Grounded Forecasts"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {t.featureLiveForecastDesc || "Real-time Open-Meteo physical observations including barometric pressure, wind vectors, and humidity."}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-[#0F172A]/90 border border-slate-800 hover:border-amber-500/50 transition-all backdrop-blur-sm group">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#F4A261] mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono mb-2">
                {t.featureTrajectoriesTitle || "Hourly & 7-Day Trajectories"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {t.featureTrajectoriesDesc || "High-resolution thermodynamic temperature curves, precipitation probabilities, and UV index projections."}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-[#0F172A]/90 border border-slate-800 hover:border-emerald-500/50 transition-all backdrop-blur-sm group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono mb-2">
                {t.featureAIChatTitle || "Conversational Weather AI"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {t.featureAIChatDesc || "Ask natural language questions about outdoor sports, travel advice, and weather advisories."}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-[#0F172A]/90 border border-slate-800 hover:border-purple-500/50 transition-all backdrop-blur-sm group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono mb-2">
                {t.featureVoiceMultilingualTitle || "30+ Language Voice Studio"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {t.featureVoiceMultilingualDesc || "Hands-free speech dictation and audio responses in Hindi, Hinglish, Bengali, Tamil, Spanish, and more."}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-[#0F172A]/90 border border-slate-800 hover:border-cyan-500/50 transition-all backdrop-blur-sm group sm:col-span-2 lg:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <Navigation className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono mb-2">
                {t.featureTravelCompareTitle || "Travel Corridors & Comparisons"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {t.featureTravelCompareDesc || "Highway route weather projections and side-by-side climate analysis for global cities."}
              </p>
            </div>
          </div>
        </div>

        {/* Sample Interactive Queries Bar */}
        <div className="mt-12 p-6 rounded-2xl bg-[#0B1321]/90 border border-slate-800 text-center">
          <h4 className="text-xs font-mono uppercase font-semibold text-slate-400 mb-3">
            {t.landingTryQueryTitle || "Sample Weather Inquiries"}:
          </h4>
          <div className="flex flex-wrap justify-center gap-2">
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (onSelectQuery) onSelectQuery(q);
                  onGetStarted();
                }}
                className="bg-[#111827] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-slate-700/60 text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer font-sans text-left"
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>

        {/* Final CTA Invitation */}
        <div className="mt-14 py-10 px-6 rounded-2xl bg-gradient-to-r from-[#17212F] via-[#0F172A] to-[#17212F] border border-amber-500/20 text-center space-y-4">
          <h3 className="text-xl sm:text-2xl font-bold font-mono text-white">
            Ready to Experience WeatherGPT?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto font-sans">
            Access verified real-time weather observations, AI-powered conversational insights, and hands-free voice speech dictation.
          </p>
          <button
            onClick={onGetStarted}
            className="bg-[#F4A261] hover:bg-[#E29578] text-slate-950 font-extrabold text-sm px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-amber-500/15 inline-flex items-center gap-2 cursor-pointer font-mono"
          >
            <span>{t.landingExploreWeather || t.landingGetStarted || "Explore Weather"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono z-20 relative">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>WeatherGPT • Open-Meteo & Gemini AI Grounded</span>
        </div>
        <div>
          <span>{langConfig.name} ({langConfig.nativeName}) Mode</span>
        </div>
      </footer>
    </div>
  );
}
