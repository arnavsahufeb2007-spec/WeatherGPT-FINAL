import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, ConversationContext, LocationInfo } from "../types.js";
import { queryWeatherAPI } from "../services/api.js";
import {
  Send,
  Sparkles,
  User,
  Bot,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CornerDownLeft,
  Globe,
  Satellite,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  AlertCircle,
  Radio,
  Sliders,
  Languages,
} from "lucide-react";
import { WeatherIcon } from "./WeatherIcons.js";
import { getLanguageConfig } from "../languages.js";
import { useVoiceMode } from "../services/voice/useVoiceMode.js";
import { VoiceLanguageModal } from "./VoiceLanguageModal.js";

interface WeatherChatProps {
  currentLocation: LocationInfo | null;
  context: ConversationContext;
  onUpdateContext: (ctx: ConversationContext) => void;
  onSelectLocation?: (loc: LocationInfo) => void;
  preferredLanguage: string;
  isFahrenheit: boolean;
}

export function WeatherChat({
  currentLocation,
  context,
  onUpdateContext,
  onSelectLocation,
  preferredLanguage,
  isFahrenheit,
}: WeatherChatProps) {
  const activeLocationName = context.currentLocation?.name || currentLocation?.name;
  const langConfig = getLanguageConfig(preferredLanguage);
  const t = langConfig.translations;

  // Multilingual Voice Mode Hook with decoupled Input and Output languages
  const voice = useVoiceMode(preferredLanguage);
  const [currentlySpeakingMessageId, setCurrentlySpeakingMessageId] = useState<string | null>(null);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);

  const inputLangConfig = getLanguageConfig(voice.effectiveInputLanguage);
  const outputLangConfig = getLanguageConfig(voice.effectiveOutputLanguage);

  const dynamicSuggestedQueries = React.useMemo(() => {
    if (langConfig.sampleQueries && langConfig.sampleQueries.length > 0) {
      return langConfig.sampleQueries;
    }
    return activeLocationName
      ? [
          `Will it rain today in ${activeLocationName}?`,
          `Outdoor running conditions in ${activeLocationName}`,
          `7-day temperature forecast for ${activeLocationName}`,
          `Compare ${activeLocationName} vs Tokyo`,
        ]
      : [
          "Will it rain in Tokyo today?",
          "Outdoor running conditions in London",
          "Paris to Berlin road trip weather",
          "Compare Mumbai vs New York humidity",
        ];
  }, [langConfig, activeLocationName]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome_msg",
      role: "assistant",
      sender: "assistant",
      content: `Hello! I am **WeatherGPT**, your conversational weather intelligence assistant.
I combine factual Open-Meteo observations with deterministic analysis and multilingual Gemini interpretation. Ask me anything about current conditions, rain forecasts, sport/activity suitability, highway travel weather, or city comparisons across India and worldwide!`,
      text: `Hello! I am **WeatherGPT**, your conversational weather intelligence assistant.
I combine factual Open-Meteo observations with deterministic analysis and multilingual Gemini interpretation. Ask me anything about current conditions, rain forecasts, sport/activity suitability, highway travel weather, or city comparisons across India and worldwide!`,
      timestamp: new Date().toISOString(),
      isAIGenerated: false,
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, voice.voiceState, voice.interimTranscript]);

  // Keep track of speaking state to update message speaker icon
  useEffect(() => {
    if (!voice.isSpeaking) {
      setCurrentlySpeakingMessageId(null);
    }
  }, [voice.isSpeaking]);

  const handleSend = async (textToSend = inputText, isVoiceTriggered: boolean = false) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isSending) return;

    // Stop active speech playback if any
    voice.stopSpeaking();

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      sender: "user",
      content: trimmed,
      text: trimmed,
      timestamp: new Date().toISOString(),
      language: preferredLanguage,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsSending(true);
    if (isVoiceTriggered) {
      voice.setProcessing();
    }

    try {
      // If a specific voice output language is chosen, request the AI response in that language
      const queryLanguage =
        voice.outputLanguage && voice.outputLanguage !== "auto"
          ? voice.outputLanguage
          : preferredLanguage;

      const result = await queryWeatherAPI(trimmed, context, queryLanguage, currentLocation || undefined);

      const assistantMsgId = `assistant_${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        sender: "assistant",
        content: result.reply,
        text: result.reply,
        timestamp: new Date().toISOString(),
        language: result.language,
        isAIGenerated: result.isAIGenerated,
        data: result.data,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Automatically speak the response if Voice Mode triggered it or Auto-Speak is enabled
      if (voice.autoSpeak || isVoiceTriggered) {
        setCurrentlySpeakingMessageId(assistantMsgId);
        voice.speak(result.reply, voice.effectiveOutputLanguage);
      }
      if (result.context) {
        onUpdateContext(result.context);
      }
      if (result.data?.location && onSelectLocation) {
        const resLoc = result.data.location;
        if (
          !currentLocation ||
          Math.abs(resLoc.latitude - currentLocation.latitude) > 0.05 ||
          Math.abs(resLoc.longitude - currentLocation.longitude) > 0.05
        ) {
          onSelectLocation(resLoc);
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          sender: "assistant",
          content: "I encountered an error retrieving meteorological data. Please verify your connection or try querying with a city name.",
          text: "I encountered an error retrieving meteorological data. Please verify your connection or try querying with a city name.",
          timestamp: new Date().toISOString(),
          isAIGenerated: false,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Toggle speech recognition
  const handleToggleVoiceInput = () => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.stopSpeaking();
      voice.startListening((finalTranscript) => {
        if (finalTranscript && finalTranscript.trim()) {
          setInputText(finalTranscript);
          handleSend(finalTranscript, true);
        }
      });
    }
  };

  // Toggle read-aloud for a specific chat message
  const handleToggleSpeakMessage = (msgId: string, text: string, _msgLanguage?: string) => {
    if (currentlySpeakingMessageId === msgId && voice.isSpeaking) {
      voice.stopSpeaking();
      setCurrentlySpeakingMessageId(null);
    } else {
      setCurrentlySpeakingMessageId(msgId);
      voice.speak(text, voice.effectiveOutputLanguage, true);
    }
  };

  const formatTemp = (celsius?: number) => {
    if (celsius === undefined) return "--";
    if (isFahrenheit) {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius}°C`;
  };

  return (
    <div className="flex flex-col h-[75vh] max-h-[750px] rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl overflow-hidden">
      {/* Chat Header */}
      <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Conversational Intelligence</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="text-[11px] text-slate-400">Context: {activeLocationName || "Worldwide"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Input & Output Languages Configurator */}
          <button
            id="voice-languages-config-btn"
            onClick={() => setIsVoiceSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            title="Configure separate input and output voice languages"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Voice Langs</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono">
              {voice.inputLanguage === "auto" ? "In: Auto" : `In: ${voice.inputLanguage.toUpperCase()}`} • {voice.outputLanguage === "auto" ? "Out: Auto" : `Out: ${voice.outputLanguage.toUpperCase()}`}
            </span>
          </button>

          {/* Voice Auto-Speak Toggle */}
          <button
            onClick={voice.toggleAutoSpeak}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              voice.autoSpeak
                ? "bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
            }`}
            title="Toggle automatic speech output for answers"
          >
            {voice.autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{voice.autoSpeak ? "Voice Output ON" : "Voice Output OFF"}</span>
          </button>

          {/* Active speech stop button if currently speaking */}
          {voice.isSpeaking && (
            <button
              onClick={voice.stopSpeaking}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs transition-colors"
              title="Stop voice playback"
            >
              <Square className="w-3 h-3 fill-rose-400" />
              <span>Stop Audio</span>
            </button>
          )}

          <div className="text-[11px] text-slate-400 hidden md:block pl-2 border-l border-slate-800">
            Active: <strong className="text-slate-200 capitalize">{langConfig.name}</strong>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";

          return (
            <div key={msg.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-sky-400" />
                </div>
              )}

              <div className={`max-w-[85%] md:max-w-[75%] space-y-2`}>
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-sky-500 text-white rounded-tr-none shadow-md shadow-sky-500/10 font-medium"
                      : "bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm"
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>

                  {/* Attached Mini Cards if response included structured data */}
                  {!isUser && msg.data?.current && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-900/60 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <WeatherIcon code={msg.data.current.weatherCode} className="w-6 h-6" />
                        <div>
                          <span className="font-bold text-white block">
                            {formatTemp(msg.data.current.temperature)} • {msg.data.current.condition}
                          </span>
                          <span className="text-[11px] text-slate-400">Feels like {formatTemp(msg.data.current.feelsLike)}</span>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-300">
                        <span>Rain: {msg.data.current.precipitationProbability}%</span>
                        <span className="block text-slate-400">Wind: {msg.data.current.windSpeed} km/h</span>
                      </div>
                    </div>
                  )}

                  {!isUser && msg.data?.activity && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">{msg.data.activity.activityName}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">Risk: {msg.data.activity.riskLevel}</span>
                      </div>
                      <span className="font-extrabold text-sky-400 text-sm">
                        {msg.data.activity.suitabilityScore}/100 ({msg.data.activity.suitability.toUpperCase()})
                      </span>
                    </div>
                  )}

                  {!isUser && msg.data?.travel && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        <span>{msg.data.travel.origin.name}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span>{msg.data.travel.destination.name}</span>
                      </div>
                      <span className="text-amber-400 font-bold uppercase text-[11px]">
                        {msg.data.travel.weatherRiskLevel} Risk ({msg.data.travel.totalDistanceKm} km)
                      </span>
                    </div>
                  )}

                  {!isUser && msg.data?.nasa && msg.data.nasa.status === "available" && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Satellite className="w-3.5 h-3.5 text-sky-400" />
                          <span>NASA Earth Observation Layer</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
                          Near-Real-Time
                        </span>
                      </div>
                      <div className="mt-1.5 text-[11px] text-slate-300">
                        {msg.data.nasa.naturalEvents && msg.data.nasa.naturalEvents.events.length > 0 ? (
                          <span className="text-amber-300 font-medium block">
                            ⚠️ {msg.data.nasa.naturalEvents.events[0].title} (~{msg.data.nasa.naturalEvents.events[0].distanceKm} km away)
                          </span>
                        ) : (
                          <span className="text-slate-400 block">
                            No active natural hazards curated within {msg.data.nasa.radiusKm} km.
                          </span>
                        )}
                        {msg.data.nasa.climateContext && (
                          <span className="block text-slate-400 mt-0.5">
                            {msg.data.nasa.climateContext.month} 20-yr baseline: {msg.data.nasa.climateContext.historicalNormalTempC}°C
                            {msg.data.nasa.climateContext.currentTempDeltaC !== undefined &&
                              ` (${msg.data.nasa.climateContext.currentTempDeltaC > 0 ? "+" : ""}${msg.data.nasa.climateContext.currentTempDeltaC}°C vs normal)`}
                            {" • "}Solar: {msg.data.nasa.climateContext.allSkySolarIrradianceKwhM2Day} kWh/m²/day
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footnote status & Voice read aloud button */}
                {!isUser && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <div className="flex items-center gap-2">
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        {msg.isAIGenerated ? "Grounded Gemini Interpretation" : "Deterministic Meteorological Engine"}
                      </span>
                    </div>

                    {/* Speaker Listen Button */}
                    <button
                      onClick={() => handleToggleSpeakMessage(msg.id, msg.text, msg.language || preferredLanguage)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                        currentlySpeakingMessageId === msg.id && voice.isSpeaking
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      }`}
                      title={currentlySpeakingMessageId === msg.id && voice.isSpeaking ? "Stop reading aloud" : "Read response aloud"}
                    >
                      {currentlySpeakingMessageId === msg.id && voice.isSpeaking ? (
                        <>
                          <Square className="w-3 h-3 fill-sky-400 text-sky-400" />
                          <span className="text-[10px] font-medium text-sky-300">Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          <span className="text-[10px]">Listen</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          );
        })}

        {isSending && (
          <div className="flex gap-3 items-center text-xs text-slate-400">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center animate-pulse">
              <Bot className="w-4 h-4 text-sky-400" />
            </div>
            <span>Analyzing verified weather observations & synthesizing answer...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Listening / Active Banner */}
      {voice.isListening && (
        <div className="px-4 py-2.5 bg-rose-950/40 border-t border-rose-500/30 flex items-center justify-between text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="font-semibold text-rose-300 shrink-0">Listening ({langConfig.name}):</span>
            <span className="text-white italic truncate">
              {voice.interimTranscript ? `"${voice.interimTranscript}"` : "Speak naturally now..."}
            </span>
          </div>
          <button
            onClick={() => {
              if (voice.interimTranscript.trim()) {
                handleSend(voice.interimTranscript, true);
              }
              voice.stopListening();
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-medium shrink-0 transition-colors"
          >
            Done Speaking
          </button>
        </div>
      )}

      {/* Voice Error Banner */}
      {voice.error && (
        <div className="px-4 py-2 bg-amber-950/40 border-t border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{voice.error.message}</span>
          </div>
          <button
            onClick={voice.clearError}
            className="text-[11px] underline hover:text-white ml-2 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Language Indicator & Suggested Query Chips */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[10px] text-sky-400 shrink-0 font-medium">
          <Globe className="w-3 h-3" />
          <span>{langConfig.name}</span>
          {langConfig.nativeName !== langConfig.name && (
            <span className="text-slate-400 font-normal">({langConfig.nativeName})</span>
          )}
        </div>
        <span className="text-[10px] text-slate-500 uppercase font-semibold shrink-0">Try:</span>
        {dynamicSuggestedQueries.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q)}
            disabled={isSending}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap transition-colors disabled:opacity-50 hover:text-white"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Dual Voice Language Indicator Strip */}
      <div className="px-4 py-1.5 bg-slate-950/40 border-t border-slate-800/40 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 text-emerald-400 font-medium shrink-0">
            <Mic className="w-3 h-3" />
            <span>
              Mic Input:{" "}
              <strong className="text-emerald-300">
                {voice.inputLanguage === "auto"
                  ? `Auto (${inputLangConfig.name})`
                  : inputLangConfig.name}
              </strong>
            </span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1 text-sky-400 font-medium shrink-0">
            <Volume2 className="w-3 h-3" />
            <span>
              Voice Output:{" "}
              <strong className="text-sky-300">
                {voice.outputLanguage === "auto"
                  ? `Auto (${outputLangConfig.name})`
                  : outputLangConfig.name}
              </strong>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsVoiceSettingsOpen(true)}
          className="text-[11px] text-slate-400 hover:text-sky-300 underline font-medium shrink-0 ml-2"
        >
          Change Voice Languages
        </button>
      </div>

      {/* Input Box */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              voice.isListening
                ? `Listening in ${inputLangConfig.name} (Voice Input)...`
                : t.askPlaceholder || `Ask WeatherGPT in ${langConfig.name}...`
            }
            disabled={isSending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 disabled:opacity-50"
          />

          {/* Voice Input Microphone Button */}
          <button
            type="button"
            onClick={handleToggleVoiceInput}
            disabled={isSending}
            className={`p-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 ${
              voice.isListening
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400 animate-pulse"
                : voice.isSpeaking
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 hover:bg-sky-500/30"
                : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white"
            }`}
            title={
              voice.isListening
                ? `Stop listening (${inputLangConfig.name})`
                : voice.isSpeaking
                ? "Speaking... tap to stop"
                : `Voice Input (${inputLangConfig.name}) • Output: ${outputLangConfig.name}`
            }
          >
            {voice.isListening ? (
              <MicOff className="w-4 h-4" />
            ) : voice.isSpeaking ? (
              <Radio className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition-colors disabled:opacity-50"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Voice Language Configuration Modal */}
      <VoiceLanguageModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
        appLanguage={preferredLanguage}
        inputLanguage={voice.inputLanguage}
        outputLanguage={voice.outputLanguage}
        autoSpeak={voice.autoSpeak}
        speechRate={voice.settings.speechRate}
        onSelectInputLanguage={(code) => voice.setInputLanguage(code)}
        onSelectOutputLanguage={(code) => voice.setOutputLanguage(code)}
        onToggleAutoSpeak={voice.toggleAutoSpeak}
        onChangeSpeechRate={(rate) => voice.setSpeechRate(rate)}
        onResetDefaults={voice.resetVoiceLanguages}
        onTestVoice={(langCode, sampleText) => {
          voice.speak(sampleText, langCode === "auto" ? voice.effectiveOutputLanguage : langCode, true);
        }}
        isSpeakingTest={voice.isSpeaking}
        onStopTestVoice={voice.stopSpeaking}
      />
    </div>
  );
}
