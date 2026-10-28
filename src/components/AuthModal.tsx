import React, { useState } from "react";
import { X, Sparkles, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { WeatherGptLogo } from "./WeatherGptLogo.js";
import { authService, UserProfile } from "../services/auth.js";
import { isSupabaseConfigured } from "../services/supabase.js";
import { getTranslations } from "../translations/registry.js";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: UserProfile) => void;
  preferredLanguage?: string;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess, preferredLanguage }: AuthModalProps) {
  const t = getTranslations(preferredLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabaseConfigured = isSupabaseConfigured();

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await authService.signInWithGoogle();
      if (!result.success) {
        setError(result.error || "Google sign-in could not be completed.");
      } else {
        const user = authService.getCurrentUser();
        if (user && onAuthSuccess) {
          onAuthSuccess(user);
        }
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected authentication failure.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    onClose();
  };

  return (
    <div id="auth-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#171C23] text-slate-100 border border-[#30353D] rounded-[8px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#30353D] bg-[#1B2027] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[6px] bg-[#1B2027] border border-[#30353D] flex items-center justify-center p-1 shadow-sm shrink-0">
              <WeatherGptLogo size={28} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold font-mono text-slate-100">{t.authTitle || "WeatherGPT Account"}</h3>
              <p className="text-xs font-mono text-slate-400">{t.authSubtitle || "Cloud history, sync & preferences"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-slate-400 hover:text-white hover:bg-[#252A32] transition-colors cursor-pointer"
            aria-label={t.close || "Close modal"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
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
                Supabase database is not yet linked. Set <code className="bg-[#1B2027] border border-[#30353D] px-1 py-0.5 rounded-[3px] text-[#F4A261] font-mono">VITE_SUPABASE_URL</code> and <code className="bg-[#1B2027] border border-[#30353D] px-1 py-0.5 rounded-[3px] text-[#F4A261] font-mono">VITE_SUPABASE_ANON_KEY</code> in your environment to enable real Google OAuth cloud sync. You can continue seamlessly in Guest mode right now.
              </div>
            </div>
          )}

          <div className="text-center space-y-1.5">
            <h4 className="text-xs sm:text-sm font-semibold font-mono text-slate-100">{t.continueWithGoogle || "Sign In with Google"}</h4>
            <p className="text-xs font-mono text-slate-400 leading-relaxed">
              Connect your verified Google account via Supabase Auth. Your meteorological data and conversation history are protected by PostgreSQL Row Level Security (RLS).
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-[4px] bg-white hover:bg-slate-100 text-slate-900 font-mono font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60"
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

            {/* Guest Mode fallback */}
            <button
              type="button"
              onClick={handleContinueAsGuest}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[4px] bg-[#1B2027] hover:bg-[#252A32] text-slate-300 hover:text-white text-xs font-mono border border-[#30353D] transition-colors cursor-pointer"
            >
              <span>{t.continueAsGuest || "Continue as Guest (No Cloud Sync)"}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#1B2027] border-t border-[#30353D] text-center text-[10px] font-mono text-slate-400">
          PostgreSQL Row Level Security • Strict Data Privacy
        </div>
      </div>
    </div>
  );
}
