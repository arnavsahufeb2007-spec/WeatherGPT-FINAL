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
import { authService, UserProfile } from "../services/auth.js";
import { isSupabaseConfigured } from "../services/supabase.js";

interface AuthPageProps {
  onSuccess: (user: UserProfile) => void;
  onCancel?: () => void;
}

export function AuthPage({ onSuccess, onCancel }: AuthPageProps) {
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
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8 animate-in fade-in duration-200">
      {onCancel && (
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to WeatherGPT</span>
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Brand & Value Prop */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">WeatherGPT Account</h1>
              <p className="text-xs text-sky-400 font-semibold">Deterministic Meteorological AI & Cloud Sync</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            Sign in with your Google account to synchronize your meteorological inquiries, cloud conversation history, favorite cities, and multilingual voice settings across all your devices.
          </p>

          <div className="space-y-3 pt-1">
            {[
              {
                icon: <History className="w-4 h-4 text-sky-400" />,
                title: "Cloud Conversation History",
                desc: "Search, restore, and resume your weather chat inquiries anytime.",
              },
              {
                icon: <CloudSun className="w-4 h-4 text-emerald-400" />,
                title: "Saved Locations Synchronization",
                desc: "Save multiple cities across India and globally with instant 1-click access.",
              },
              {
                icon: <Mic className="w-4 h-4 text-indigo-400" />,
                title: "Multilingual Voice Preferences",
                desc: "Preserve decoupled Indian and world speech recognition and audio synthesis settings.",
              },
              {
                icon: <Database className="w-4 h-4 text-amber-400" />,
                title: "Row Level Security (RLS)",
                desc: "PostgreSQL database policies strictly enforce per-user private data ownership.",
              },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="p-2 rounded-lg bg-slate-800 shrink-0">{feature.icon}</div>
                <div>
                  <h4 className="text-xs font-bold text-white">{feature.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="lg:col-span-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Sign In with Google</h3>
              <p className="text-xs text-slate-400 mt-1">
                Authenticates via Supabase Auth. No passwords required.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{error}</div>
              </div>
            )}

            {!supabaseConfigured && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  Supabase database environment variables are not yet configured. Set <code className="bg-amber-950 px-1 py-0.5 rounded text-amber-300 font-mono">VITE_SUPABASE_URL</code> and <code className="bg-amber-950 px-1 py-0.5 rounded text-amber-300 font-mono">VITE_SUPABASE_ANON_KEY</code> in project secrets to enable cloud sync. You can continue using WeatherGPT immediately in Guest mode.
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-lg shadow-white/5 transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
              >
                <span>Continue as Guest (No Cloud Sync)</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 text-center text-[11px] text-slate-400">
              PostgreSQL Row Level Security • Deterministic meteorological privacy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
