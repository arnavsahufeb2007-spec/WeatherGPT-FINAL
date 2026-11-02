import React, { useState } from "react";
import {
  Sparkles,
  CloudSun,
  Compass,
  Mic,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Database,
  History,
} from "lucide-react";
import { WeatherGptLogo } from "./WeatherGptLogo.js";
import { authService, UserProfile } from "../services/auth.js";
import { isSupabaseConfigured } from "../services/supabase.js";
import { getTranslations } from "../translations/registry.js";

interface AuthPageProps {
  onSuccess: (user: UserProfile) => void;
  onCancel?: () => void;
  preferredLanguage?: string;
}

export function AuthPage({ onSuccess, onCancel, preferredLanguage }: AuthPageProps) {
  const t = getTranslations(preferredLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabaseConfigured = isSupabaseConfigured();

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await authService.signInWithGoogle();
      if (!result.success) {
        setError(result.error || "Google sign-in could not be completed.");
      } else {
        const user = authService.getCurrentUser();
        if (user) {
          onSuccess(user);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected authentication failure.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div id="auth-page" className="max-w-4xl mx-auto py-6 px-4 space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Auth Hero Banner with Telemetry HUD */}
      <div className="relative rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-5 sm:p-6 overflow-hidden transition-colors shadow-lg">
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <img
            src="https://images.unsplash.com/photo-1516912481808-3406841bd33c?auto=format&fit=crop&w=1600&q=80"
            alt="Atmospheric Sky"
            className="w-full h-full object-cover object-center opacity-30 dark:opacity-25 light:opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F141B] via-[#171C23]/95 to-[#171C23]/60 dark:from-[#0F141B] dark:via-[#171C23]/95 dark:to-[#171C23]/60 light:from-white light:via-white/95 light:to-white/80" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold text-[#8ECAE6] tracking-wider px-2 py-0.5 rounded-[3px] bg-[#0F141B]/80 border border-[#8ECAE6]/30">
                AUTHENTICATION & CLOUD VAULT • SECURE METEOROLOGICAL TELEMETRY
              </span>
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 font-mono tracking-tight">
              WeatherGPT Account Gateway
            </h2>
            <p className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 leading-relaxed">
              Synchronize your meteorological inquiries, route plans, saved cities, and voice preferences across all your devices.
            </p>
          </div>

          {/* Telemetry HUD */}
          <div className="bg-[#0F141B]/80 dark:bg-[#0F141B]/80 light:bg-slate-100/90 backdrop-blur-md border border-[#30353D] dark:border-[#30353D] light:border-slate-300 p-3 rounded-[6px] hidden sm:flex flex-col gap-1.5 min-w-[210px] text-[11px] font-mono shrink-0 shadow-inner">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">GATEWAY</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span> READY
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">ENCRYPTION:</span>
              <span className="text-[#8ECAE6] font-semibold">POSTGRES RLS</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">PROVIDER:</span>
              <span className="text-slate-200 font-semibold">GOOGLE OAUTH 2.0</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">VAULT:</span>
              <span className="text-[#F4A261] font-semibold">SUPABASE REAL-TIME</span>
            </div>
          </div>
        </div>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.back || "Back to WeatherGPT"}</span>
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left Side: Brand & Value Prop */}
        <div className="lg:col-span-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[6px] bg-[#1B2027] border border-[#30353D] flex items-center justify-center p-1 shadow-md shadow-sky-500/10 shrink-0">
              <WeatherGptLogo size={36} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-mono text-slate-100 tracking-tight">{t.authTitle || "WeatherGPT Account"}</h3>
              <p className="text-xs font-mono text-[#F4A261] font-semibold">{t.authSubtitle || "Deterministic Meteorological AI & Cloud Sync"}</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-mono">
            Sign in with your Google account to synchronize your meteorological inquiries, cloud conversation history, favorite cities, and multilingual voice settings across all your devices.
          </p>

          <div className="space-y-2.5 pt-1">
            {[
              {
                icon: <History className="w-3.5 h-3.5 text-[#8ECAE6]" />,
                title: "Cloud Conversation History",
                desc: "Search, restore, and resume your weather chat inquiries anytime.",
              },
              {
                icon: <CloudSun className="w-3.5 h-3.5 text-emerald-400" />,
                title: "Saved Locations Synchronization",
                desc: "Save multiple cities across India and globally with instant 1-click access.",
              },
              {
                icon: <Mic className="w-3.5 h-3.5 text-[#8ECAE6]" />,
                title: "Multilingual Voice Preferences",
                desc: "Preserve decoupled Indian and world speech recognition and audio synthesis settings.",
              },
              {
                icon: <Database className="w-3.5 h-3.5 text-[#F4A261]" />,
                title: "Row Level Security (RLS)",
                desc: "PostgreSQL database policies strictly enforce per-user private data ownership.",
              },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-[6px] bg-[#171C23] border border-[#30353D]">
                <div className="p-2 rounded-[4px] bg-[#1B2027] border border-[#30353D] shrink-0">{feature.icon}</div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-100">{feature.title}</h4>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="lg:col-span-6">
          <div className="bg-[#171C23] border border-[#30353D] rounded-[8px] shadow-2xl overflow-hidden p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold font-mono text-slate-100">{t.continueWithGoogle || "Sign In with Google"}</h3>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Authenticates via Supabase Auth. No passwords required.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-[6px] bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-mono flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{error}</div>
              </div>
            )}

            {!supabaseConfigured && (
              <div className="p-3 rounded-[6px] bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs font-mono flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#F4A261] shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  Supabase database environment variables are not yet configured. Set <code className="bg-[#1B2027] border border-[#30353D] px-1 py-0.5 rounded-[3px] text-[#F4A261] font-mono">VITE_SUPABASE_URL</code> and <code className="bg-[#1B2027] border border-[#30353D] px-1 py-0.5 rounded-[3px] text-[#F4A261] font-mono">VITE_SUPABASE_ANON_KEY</code> in project secrets to enable cloud sync. You can continue using WeatherGPT immediately in Guest mode.
                </div>
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-[4px] bg-white hover:bg-slate-100 text-slate-900 font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{t.continueWithGoogle || "Continue with Google"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[4px] bg-[#1B2027] hover:bg-[#252A32] text-slate-300 hover:text-white text-xs font-mono font-semibold border border-[#30353D] transition-colors cursor-pointer"
              >
                <span>{t.continueAsGuest || "Continue as Guest (No Cloud Sync)"}</span>
              </button>
            </div>

            <div className="pt-3 border-t border-[#30353D] text-center text-[10px] font-mono text-slate-400">
              PostgreSQL Row Level Security • Deterministic meteorological privacy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
