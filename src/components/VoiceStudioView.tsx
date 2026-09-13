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
} from "lucide-react";
import { LocationInfo } from "../types.js";
import { useVoiceMode } from "../services/voice/useVoiceMode.js";
import { getLanguageConfig } from "../languages.js";
import { queryWeatherAPI } from "../services/api.js";
import { VoiceLanguageModal } from "./VoiceLanguageModal.js";

interface VoiceStudioViewProps {
  currentLocation: LocationInfo | null;
  preferredLanguage: string;
  isFahrenheit: boolean;
  onOpenLocationSearch: () => void;
}

interface VoiceTranscriptMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

export function VoiceStudioView({
  currentLocation,
  preferredLanguage,
  isFahrenheit,
  onOpenLocationSearch,
}: VoiceStudioViewProps) {
  const voice = useVoiceMode(preferredLanguage);
  const langConfig = getLanguageConfig(preferredLanguage);
  const inputLangConfig = getLanguageConfig(voice.effectiveInputLanguage);
  const outputLangConfig = getLanguageConfig(voice.effectiveOutputLanguage);

  const [isModalOpen, setIsModalOpen] = useState(false);
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

      const res = await queryWeatherAPI(queryText, undefined, targetLang, currentLocation || undefined);

      const botMsg: VoiceTranscriptMessage = {
        id: `bot_${Date.now()}`,
        sender: "assistant",
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Speak response out loud if autoSpeak enabled
      if (voice.autoSpeak) {
        voice.speak(res.reply, voice.effectiveOutputLanguage);
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
      voice.startListening(
        (finalTranscript) => {
          if (finalTranscript.trim()) {
            handleSendVoiceQuery(finalTranscript);
          }
        },
        () => {}
      );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Studio Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-900/40 via-indigo-900/30 to-purple-900/40 border border-sky-500/20 p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20">
              <Mic className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Hands-Free Voice Studio</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Decoupled
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Speak in your native Indian or international language and listen to natural meteorological audio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Configure Voice & Dialects</span>
            </button>
          </div>
        </div>

        {/* Dual Language Indicator Badge */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-medium">
            <Mic className="w-3.5 h-3.5" />
            <span>Spoken Input: <strong>{inputLangConfig.name}</strong></span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-300 font-medium">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice Output: <strong>{outputLangConfig.name}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 ml-auto text-[11px]">
            <span>Speed: <strong>{voice.settings.speechRate.toFixed(1)}x</strong></span>
            <span>•</span>
            <span>Auto-Speak: <strong>{voice.autoSpeak ? "Enabled" : "Muted"}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Interactive Mic Stage */}
      <div className="rounded-2xl bg-slate-900/80 dark:bg-slate-950/80 border border-slate-800 p-8 text-center flex flex-col items-center justify-center space-y-6 shadow-xl relative">
        {/* Glow pulse when listening */}
        {voice.isListening && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-emerald-500/15 animate-ping duration-1000" />
            <div className="w-48 h-48 rounded-full bg-emerald-500/20 animate-pulse duration-700" />
          </div>
        )}

        {voice.isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-sky-500/15 animate-pulse duration-500" />
          </div>
        )}

        {/* Dynamic Status Text */}
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-300">
            {voice.isListening
              ? `Listening in ${inputLangConfig.name}... Speak now`
              : voice.isSpeaking
              ? `Speaking in ${outputLangConfig.name}...`
              : isProcessing
              ? "Synthesizing weather intelligence..."
              : "Tap microphone to begin speaking"}
          </div>
          <p className="text-xs text-slate-400">
            {currentLocation ? `Target City: ${currentLocation.name}` : "Search city or use current GPS"}
          </p>
        </div>

        {/* Big Mic Button */}
        <div className="relative z-10">
          <button
            onClick={handleToggleMic}
            className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 transform active:scale-95 cursor-pointer ${
              voice.isListening
                ? "bg-rose-500 hover:bg-rose-600 text-white ring-8 ring-rose-500/30 scale-105 animate-pulse"
                : voice.isSpeaking
                ? "bg-amber-500 hover:bg-amber-600 text-white ring-8 ring-amber-500/30"
                : isProcessing
                ? "bg-indigo-600 text-white animate-spin"
                : "bg-sky-500 hover:bg-sky-400 text-white ring-8 ring-sky-500/20 hover:scale-105"
            }`}
            title={voice.isListening ? "Tap to finish speaking" : "Tap to speak"}
          >
            {voice.isListening ? (
              <Square className="w-10 h-10 fill-white" />
            ) : voice.isSpeaking ? (
              <Square className="w-10 h-10 fill-white" />
            ) : (
              <Mic className="w-12 h-12" />
            )}
          </button>
        </div>

        {/* Interim Speech Transcript Box */}
        {voice.interimTranscript && (
          <div className="p-3 px-6 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-200 text-sm italic font-medium animate-pulse max-w-md">
            "{voice.interimTranscript}"
          </div>
        )}

        {/* Spoken Query Suggestions */}
        <div className="w-full pt-2">
          <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>Try speaking these queries in {inputLangConfig.name}:</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendVoiceQuery(prompt)}
                disabled={isProcessing || voice.isListening}
                className="px-3 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-xs text-slate-300 hover:text-white transition-all text-left"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transcript History Feed */}
      <div className="rounded-2xl bg-slate-900/70 dark:bg-slate-950/70 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <span>Voice Conversation Transcript</span>
          </h3>
          <button
            onClick={() => setMessages([])}
            className="text-[11px] text-slate-400 hover:text-white transition-colors"
          >
            Clear History
          </button>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-3.5 rounded-xl text-xs leading-relaxed flex flex-col gap-1 ${
                m.sender === "user"
                  ? "bg-sky-500/15 border border-sky-500/30 text-white ml-8"
                  : "bg-slate-950/70 border border-slate-800 text-slate-300 mr-8"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold text-slate-300">
                  {m.sender === "user" ? "You (Spoken)" : "WeatherGPT Audio"}
                </span>
                <span>{m.timestamp}</span>
              </div>
              <p className="text-slate-200">{m.text}</p>
              {m.sender === "assistant" && (
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => voice.speak(m.text, voice.effectiveOutputLanguage, true)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[10px] font-medium"
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
    </div>
  );
}
