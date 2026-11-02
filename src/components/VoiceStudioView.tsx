import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Play,
  Square,
  Sliders,
  RotateCcw,
  Languages,
  Check,
  ArrowRight,
  Send,
  MessageSquare,
  HelpCircle,
  AlertCircle,
  Zap,
} from "lucide-react";
import { LocationInfo, ConversationContext } from "../types.js";
import { useVoiceMode } from "../services/voice/useVoiceMode.js";
import { getLanguageConfig, getTranslations } from "../languages.js";
import { queryWeatherAPI } from "../services/api.js";
import { VoiceLanguageModal } from "./VoiceLanguageModal.js";
import { GeminiLiveModal } from "./GeminiLiveModal.js";
import { DiurnalPhase, DiurnalPhaseConfig } from "../services/diurnalTheme.js";

interface VoiceStudioViewProps {
  currentLocation: LocationInfo | null;
  preferredLanguage: string;
  isFahrenheit: boolean;
  onOpenLocationSearch: () => void;
  context?: ConversationContext;
  onUpdateContext?: (ctx: ConversationContext) => void;
  diurnalPhase?: DiurnalPhase;
  diurnalConfig?: DiurnalPhaseConfig;
}

interface VoiceTranscriptMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  language?: string;
}

export function VoiceStudioView({
  currentLocation,
  preferredLanguage,
  isFahrenheit,
  onOpenLocationSearch,
  context,
  onUpdateContext,
  diurnalPhase,
  diurnalConfig,
}: VoiceStudioViewProps) {
  const t = getTranslations(preferredLanguage);
  const voice = useVoiceMode(preferredLanguage);
  const langConfig = getLanguageConfig(preferredLanguage);
  const inputLangConfig = getLanguageConfig(voice.effectiveInputLanguage);
  const outputLangConfig = getLanguageConfig(voice.effectiveOutputLanguage);

  const [localContext, setLocalContext] = useState<ConversationContext>(() => {
    return (
      context || {
        currentLocation: currentLocation || undefined,
        lastQueryTimestamp: new Date().toISOString(),
      }
    );
  });

  React.useEffect(() => {
    if (context) {
      setLocalContext(context);
    }
  }, [context]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [messages, setMessages] = useState<VoiceTranscriptMessage[]>([
    {
      id: "welcome_voice",
      sender: "assistant",
      text: `Hello! I'm your WeatherGPT voice companion. Tap the microphone below or select a prompt to ask about weather in ${
        currentLocation ? currentLocation.name : "your city"
      }.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Suggested spoken prompts
  const samplePrompts = React.useMemo(() => {
    switch (voice.effectiveInputLanguage) {
      case "hi":
        return [
          "आज का मौसम कैसा रहेगा?",
          "क्या आज शाम बारिश होने की संभावना है?",
          "हवा की गति और उमस कितनी है?",
          "क्या बाहर जॉगिंग के लिए मौसम अनुकूल है?",
        ];
      case "hinglish":
        return [
          "Aaj ka weather kaisa rahega?",
          "Kya aaj shaam baarish hogi?",
          "Outdoor running ke liye safe hai kya?",
          "Temperature aur humidity kitna hai?",
        ];
      case "bn":
        return [
          "আজকের আবহাওয়া কেমন থাকবে?",
          "আজ কি বৃষ্টি হতে পারে?",
          "বাইরে বের হওয়ার জন্য আবহাওয়া কেমন?",
        ];
      case "te":
        return [
          "ఈ రోజు వాతావరణం ఎలా ఉంటుంది?",
          "ఈ రోజు వర్షం పడే అవకాశం ఉందా?",
          "ఉష్ణోగ్రత మరియు గాలి వేగం ఎంత?",
        ];
      case "ta":
        return [
          "இன்றைய வானிலை எப்படி இருக்கிறது?",
          "இன்று மழை பெய்ய வாய்ப்பு உள்ளதா?",
          "வெப்பநிலை மற்றும் காற்றின் வேகம் என்ன?",
        ];
      default:
        return [
          "What is the current weather forecast?",
          "Is there any precipitation expected today?",
          "What's the UV index and wind speed?",
          "Is it a good time for an outdoor workout?",
        ];
    }
  }, [voice.effectiveInputLanguage]);

  const handleSendVoiceQuery = async (queryText: string) => {
    if (!queryText.trim() || isProcessing) return;

    const userMsg: VoiceTranscriptMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const targetLang =
        voice.outputLanguage && voice.outputLanguage !== "auto"
          ? voice.outputLanguage
          : preferredLanguage;

      const res = await queryWeatherAPI(queryText, localContext, targetLang, currentLocation || undefined);

      if (res.context) {
        setLocalContext(res.context);
        onUpdateContext?.(res.context);
      }

      const botMsg: VoiceTranscriptMessage = {
        id: `bot_${Date.now()}`,
        sender: "assistant",
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        language: res.language || targetLang,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Speak response out loud if autoSpeak enabled
      if (voice.autoSpeak) {
        voice.speak(res.reply, res.language || voice.effectiveOutputLanguage);
      }
    } catch (err: any) {
      const errMsg: VoiceTranscriptMessage = {
        id: `bot_err_${Date.now()}`,
        sender: "assistant",
        text: "I couldn't fetch the weather observation for that query. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleMic = () => {
    if (voice.isListening) {
      voice.stopListening();
    } else if (voice.isSpeaking) {
      voice.stopSpeaking();
    } else {
      voice.unlockAudio();
      voice.startListening((finalTranscript) => {
        if (finalTranscript.trim()) {
          handleSendVoiceQuery(finalTranscript);
        }
      });
    }
  };

  return (
    <div id="voice-studio" className="space-y-4 sm:space-y-5 max-w-4xl mx-auto">
      {/* Voice Studio Hero Banner with Atmospheric HUD */}
      <div
        data-atmospheric-banner="true"
        className="hero-atmospheric-card atmospheric-hero-card relative rounded-[8px] bg-[#0F141B] border border-[#30353D] p-5 sm:p-6 overflow-hidden transition-colors shadow-lg"
        style={diurnalConfig ? { borderColor: `${diurnalConfig.accentColor}40` } : undefined}
      >
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <img
            key={diurnalConfig?.backgrounds.home.photoUrl || "standard-voice"}
            src={
              diurnalConfig?.backgrounds.home.photoUrl ||
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80"
            }
            alt={diurnalConfig?.backgrounds.home.photoAlt || "Acoustic Voice Studio"}
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
                {t.voiceBannerTag || "VOICE DISPATCH • BIDIRECTIONAL ACOUSTIC STUDIO"}
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
              {t.voiceBannerTitle || "Hands-Free Voice Studio"}
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed">
              {t.voiceBannerDesc || "Speak in your native Indian or international language and listen to natural meteorological audio with decoupled input and speech synthesis engines."}
            </p>
          </div>

          {/* Telemetry HUD Badge */}
          <div className="bg-[#0F141B]/85 backdrop-blur-md border border-white/10 p-3 rounded-[6px] hidden sm:flex flex-col gap-1.5 min-w-[210px] text-[11px] font-mono shrink-0 shadow-inner">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">DUPLEX AUDIO</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span> ONLINE
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">LATENCY:</span>
              <span className="text-[#8ECAE6] font-semibold">&lt; 250ms</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">AUDIO ENCODE:</span>
              <span className="text-slate-200 font-semibold">48 kHz PCM</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[10px] text-slate-400">TARGET:</span>
              <span className="text-[#F4A261] font-semibold truncate max-w-[110px]">{currentLocation ? currentLocation.name : "Active GPS"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Error Banner */}
      {voice.error && (
        <div className="rounded-[8px] bg-rose-950/40 light:bg-rose-50 border border-rose-500/30 light:border-rose-300 p-3.5 flex items-start justify-between gap-3 text-xs text-rose-200 light:text-rose-800 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 light:text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-rose-300 light:text-rose-900 font-mono">{voice.error.message}</div>
              {voice.error.actionHint && (
                <div className="text-[11px] font-mono text-rose-300/80 light:text-rose-700">{voice.error.actionHint}</div>
              )}
            </div>
          </div>
          <button
            onClick={voice.clearError}
            className="text-[11px] font-mono text-rose-300 light:text-rose-700 hover:text-white light:hover:text-rose-950 underline shrink-0 px-2 py-0.5 rounded-[3px] hover:bg-rose-900/40 light:hover:bg-rose-100 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Studio Header Banner */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 transition-colors shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-tight font-mono">
                  SPEECH ENGINE CHANNELS
                </h3>
                <span className="text-[10px] font-mono uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded-[3px] bg-[#252A32] dark:bg-[#252A32] light:bg-sky-50 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 border border-[#8ECAE6]/30 dark:border-[#8ECAE6]/30 light:border-sky-300">
                  Decoupled
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 mt-0.5">
                Target city: {currentLocation ? currentLocation.name : "Active Geolocation"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiveModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#F4A261] hover:bg-[#F4A261]/90 text-xs font-mono font-bold text-[#0F141B] border border-[#F4A261] transition-colors cursor-pointer shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-[#0F141B]" />
              <span>{t.geminiLive || "Gemini Live (Voice Duplex)"}</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0F141B] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0F141B]"></span>
              </span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-200 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-xs font-mono font-semibold text-slate-200 dark:text-slate-200 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-slate-950 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700" />
              <span>{t.configureVoice || "Configure Voice & Dialects"}</span>
            </button>
          </div>
        </div>

        {/* Dual Language Indicator Badge */}
        <div className="mt-4 pt-3 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-emerald-50 border border-[#30353D] dark:border-[#30353D] light:border-emerald-200 text-emerald-400 dark:text-emerald-400 light:text-emerald-700 font-medium">
            <Mic className="w-3.5 h-3.5" />
            <span>Spoken Input: <strong>{inputLangConfig.name}</strong></span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-sky-50 border border-[#30353D] dark:border-[#30353D] light:border-sky-200 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 font-medium">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice Output: <strong>{outputLangConfig.name}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-400 light:text-slate-500 ml-auto text-[11px]">
            <span>Speed: <strong className="text-slate-200 dark:text-slate-200 light:text-slate-800">{voice.settings.speechRate.toFixed(1)}x</strong></span>
            <span>•</span>
            <span>Auto-Speak: <strong className="text-slate-200 dark:text-slate-200 light:text-slate-800">{voice.autoSpeak ? "Enabled" : "Muted"}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Interactive Mic Stage */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-5 transition-colors relative shadow-sm">
        {/* Subtle halo when listening or speaking */}
        {voice.isListening && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full border border-rose-500/20 bg-rose-500/5 animate-ping duration-1000" />
            <div className="w-36 h-36 rounded-full border border-rose-500/30 bg-rose-500/10 animate-pulse duration-700" />
          </div>
        )}

        {voice.isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full border border-[#8ECAE6]/20 bg-[#8ECAE6]/5 animate-pulse duration-500" />
          </div>
        )}

        {/* Dynamic Status Text */}
        <div className="space-y-1">
          <div className="text-sm font-semibold font-mono text-slate-200 dark:text-slate-200 light:text-slate-800">
            {voice.isListening
              ? `${t.listening || "Listening"} (${inputLangConfig.name})...`
              : voice.isSpeaking
              ? `${t.speaking || "Speaking"} (${outputLangConfig.name})...`
              : isProcessing
              ? (t.processing || "Synthesizing weather intelligence...")
              : (t.micReady || "Tap microphone to begin speaking")}
          </div>
          <p className="text-xs font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
            {currentLocation ? `${t.stationBase}: ${currentLocation.name}` : t.selectCity}
          </p>
        </div>

        {/* Big Mic Button */}
        <div className="relative z-10">
          <button
            onClick={handleToggleMic}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer shadow-xl ${
              voice.isListening
                ? "bg-rose-950/90 dark:bg-rose-950/90 light:bg-rose-600 hover:bg-rose-900 dark:hover:bg-rose-900 light:hover:bg-rose-700 text-rose-200 dark:text-rose-200 light:text-white border-2 border-rose-500/80 ring-8 ring-rose-500/20 animate-pulse shadow-rose-950/50"
                : voice.isSpeaking
                ? "bg-[#F4A261] text-[#0F141B] border-2 border-[#F4A261] ring-8 ring-[#F4A261]/20 shadow-[#F4A261]/30 hover:bg-[#F4A261]/90"
                : isProcessing
                ? "bg-[#252A32] dark:bg-[#252A32] light:bg-slate-200 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 border-2 border-[#8ECAE6]/60 animate-spin"
                : "bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-200 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 border-2 border-[#8ECAE6]/50 dark:border-[#8ECAE6]/50 light:border-sky-400 hover:border-[#8ECAE6] dark:hover:border-[#8ECAE6] light:hover:border-sky-600 hover:scale-105 shadow-md"
            }`}
            title={voice.isListening ? "Tap to finish speaking" : "Tap to speak"}
          >
            {voice.isListening ? (
              <Square className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
            ) : voice.isSpeaking ? (
              <Square className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
            ) : (
              <Mic className="w-8 h-8 sm:w-9 sm:h-9" />
            )}
          </button>
        </div>

        {/* Interim Speech Transcript Box */}
        {voice.interimTranscript && (
          <div className="p-2.5 px-4 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-slate-200 dark:text-slate-200 light:text-slate-800 text-xs sm:text-sm font-mono italic max-w-md shadow-inner">
            "{voice.interimTranscript}"
          </div>
        )}

        {/* Spoken Query Suggestions */}
        <div className="w-full pt-1">
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-500 mb-2 flex items-center justify-center gap-1.5 font-mono">
            <HelpCircle className="w-3.5 h-3.5 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700" />
            <span>Try speaking these queries in {inputLangConfig.name}:</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendVoiceQuery(prompt)}
                disabled={isProcessing || voice.isListening}
                className="px-2.5 py-1.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 hover:border-[#8ECAE6]/40 dark:hover:border-[#8ECAE6]/40 light:hover:border-slate-400 text-xs font-mono text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-slate-950 transition-colors text-left cursor-pointer disabled:opacity-40"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transcript History Feed */}
      <div className="rounded-[8px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 p-4 sm:p-5 space-y-4 transition-colors shadow-sm">
        <div className="flex items-center justify-between border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200 pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2 font-mono">
            <MessageSquare className="w-4 h-4 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700" />
            <span>Voice Conversation Transcript</span>
          </h3>
          <button
            onClick={() => setMessages([])}
            className="text-[11px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-800 transition-colors cursor-pointer"
          >
            Clear History
          </button>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-3 rounded-[6px] text-xs leading-relaxed flex flex-col gap-1 ${
                m.sender === "user"
                  ? "bg-[#252A32] dark:bg-[#252A32] light:bg-sky-50 border border-[#30353D] dark:border-[#30353D] light:border-sky-200 text-slate-100 dark:text-slate-100 light:text-slate-900 ml-6 sm:ml-8"
                  : "bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 mr-6 sm:mr-8"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
                <span className="font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700">
                  {m.sender === "user" ? "You (Spoken)" : "WeatherGPT Audio"}
                </span>
                <span>{m.timestamp}</span>
              </div>
              <p className="text-slate-200 dark:text-slate-200 light:text-slate-800">{m.text}</p>
              {m.sender === "assistant" && (
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => voice.speak(m.text, m.language || voice.effectiveOutputLanguage, true)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#252A32] dark:bg-[#252A32] light:bg-slate-200 hover:bg-[#30353D] dark:hover:bg-[#30353D] light:hover:bg-slate-300 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-[10px] font-mono font-medium cursor-pointer transition-colors"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Replay Audio</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Voice Language Modal */}
      <VoiceLanguageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        appLanguage={preferredLanguage}
        inputLanguage={voice.inputLanguage}
        outputLanguage={voice.outputLanguage}
        autoSpeak={voice.autoSpeak}
        speechRate={voice.settings.speechRate}
        onSelectInputLanguage={(c) => voice.setInputLanguage(c)}
        onSelectOutputLanguage={(c) => voice.setOutputLanguage(c)}
        onToggleAutoSpeak={voice.toggleAutoSpeak}
        onChangeSpeechRate={(r) => voice.setSpeechRate(r)}
        onResetDefaults={voice.resetVoiceLanguages}
        onTestVoice={(lang, text) => {
          voice.speak(text, lang === "auto" ? voice.effectiveOutputLanguage : lang, true);
        }}
        isSpeakingTest={voice.isSpeaking}
        onStopTestVoice={voice.stopSpeaking}
      />

      {/* Gemini Live Duplex Voice Assistant Modal (gemini-3.8-live) */}
      <GeminiLiveModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        preferredLanguage={preferredLanguage}
        currentLocationName={currentLocation?.name}
      />
    </div>
  );
}
