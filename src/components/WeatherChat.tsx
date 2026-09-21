import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, ConversationContext, CurrentWeatherData, DailyForecastItem, LocationInfo, WeatherAnalysis } from "../types.js";
import { queryWeatherAPI, localizeWeatherMessageAPI } from "../services/api.js";
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
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  AlertCircle,
  Radio,
  Sliders,
  Languages,
  PlusCircle,
  History,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { WeatherIcon } from "./WeatherIcons.js";
import { getLanguageConfig } from "../languages.js";
import { useVoiceMode } from "../services/voice/useVoiceMode.js";
import { VoiceLanguageModal } from "./VoiceLanguageModal.js";
import { GeminiLiveModal } from "./GeminiLiveModal.js";
import { historyService } from "../services/historyService.js";
import { UserProfile } from "../services/auth.js";

interface WeatherChatProps {
  currentLocation: LocationInfo | null;
  currentWeather?: CurrentWeatherData | null;
  weatherAnalysis?: WeatherAnalysis | null;
  dailyForecast?: DailyForecastItem[];
  context: ConversationContext;
  onUpdateContext: (ctx: ConversationContext) => void;
  onSelectLocation?: (loc: LocationInfo) => void;
  preferredLanguage: string;
  isFahrenheit: boolean;
  currentUser?: UserProfile | null;
  activeConversationId?: string | null;
  activeConversationTitle?: string | null;
  onActiveConversationChange?: (id: string | null, title?: string) => void;
  onNewChat?: () => void;
}

export function detectScriptLanguage(text: string): string {
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu"; // Gujarati
  if (/[\u0C00-\u0C7F]/.test(text)) return "te"; // Telugu
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta"; // Tamil
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn"; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml"; // Malayalam
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa"; // Gurmukhi (Punjabi)
  if (/[\u0B00-\u0B7F]/.test(text)) return "or"; // Odia
  if (/[\u0600-\u06FF]/.test(text)) return "ur"; // Urdu
  if (/[\u0980-\u09FF]/.test(text)) return /[ৰৱ]/.test(text) ? "as" : "bn";
  if (/[\u0900-\u097F]/.test(text)) {
    // Avoid ASCII-style \b matching on Devanagari script; match Unicode boundary or start/end
    return /(?:^|[^\u0900-\u097F])(आहे|आहेत|कसे|कसा|कशी|पाऊस|होईल|पडेल|नाही|झाला|हवामान|करा|सांगा|आजचे|उद्याचे)(?:[^\u0900-\u097F]|$)/.test(text) ? "mr" : "hi";
  }
  return "en";
}

export function WeatherChat({
  currentLocation,
  currentWeather,
  weatherAnalysis,
  dailyForecast,
  context,
  onUpdateContext,
  onSelectLocation,
  preferredLanguage,
  isFahrenheit,
  currentUser,
  activeConversationId,
  activeConversationTitle,
  onActiveConversationChange,
  onNewChat,
}: WeatherChatProps) {
  const activeLocationName = context.currentLocation?.name || currentLocation?.name;
  const langConfig = getLanguageConfig(preferredLanguage);
  const t = langConfig.translations;

  // Multilingual Voice Mode Hook with decoupled Input and Output languages
  const voice = useVoiceMode(preferredLanguage);
  const [currentlySpeakingMessageId, setCurrentlySpeakingMessageId] = useState<string | null>(null);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedMessageId(msgId);
        setTimeout(() => {
          setCopiedMessageId((prev) => (prev === msgId ? null : prev));
        }, 2000);
      }
    } catch (err) {
      console.warn("Failed to copy message:", err);
    }
  };

  // Synchronize currentlySpeakingMessageId when speech playback finishes or is cancelled
  useEffect(() => {
    if (!voice.isSpeaking && currentlySpeakingMessageId) {
      setCurrentlySpeakingMessageId(null);
    }
  }, [voice.isSpeaking, currentlySpeakingMessageId]);

  const inputLangConfig = getLanguageConfig(voice.effectiveInputLanguage);
  const outputLangConfig = getLanguageConfig(voice.effectiveOutputLanguage);

  const formatTemp = (celsius?: number) => {
    if (celsius === undefined) return "--";
    if (isFahrenheit) {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius}°C`;
  };

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
      language: preferredLanguage,
    },
  ]);

  // Synchronize conversational weather summary with exact normalized weather context
  useEffect(() => {
    if (currentLocation && currentWeather) {
      const rainStatus =
        currentWeather.rain > 0
          ? `${currentWeather.rain} mm active rainfall`
          : currentWeather.precipitation > 0
          ? `${currentWeather.precipitation} mm precipitation`
          : "0.0 mm (No rain currently falling)";

      const locationSummary = `Hello! Here is your verified weather intelligence summary for **${currentLocation.name}**${
        currentLocation.admin1 ? `, ${currentLocation.admin1}` : ""
      }${currentLocation.country ? ` (${currentLocation.country})` : ""}:

• **Temperature**: ${formatTemp(currentWeather.temperature)} (Feels like ${formatTemp(currentWeather.feelsLike)})
• **Conditions**: ${currentWeather.condition}
• **Humidity**: ${currentWeather.humidity !== null ? `${currentWeather.humidity}%` : "Data unavailable"}
• **Precipitation Probability**: ${currentWeather.precipitationProbability}% • *Current Rain*: ${rainStatus}
• **Wind Speed**: ${currentWeather.windSpeed} km/h (Gusts: ${currentWeather.windGusts} km/h)
• **UV Index**: ${currentWeather.uvIndex} / 12 • **Visibility**: ${(currentWeather.visibility / 1000).toFixed(1)} km
• **Outdoor Suitability**: ${weatherAnalysis?.outdoorSuitabilityScore ?? 80}/100 (${weatherAnalysis?.comfortLabel || "Comfortable"})

You can ask me about hourly rain chances, outdoor sports, travel routes, or comparison with other cities!`;

      setMessages((prev) => {
        const hasUserMessages = prev.some((m) => m.sender === "user");
        if (!hasUserMessages) {
          return [
            {
              id: `summary_${currentLocation.name}`,
              role: "assistant",
              sender: "assistant",
              content: locationSummary,
              text: locationSummary,
              timestamp: new Date().toISOString(),
              isAIGenerated: false,
              language: effectiveOutputLang || preferredLanguage,
              data: {
                current: currentWeather,
                analysis: weatherAnalysis || undefined,
              },
            },
          ];
        }
        return prev;
      });
    }
  }, [
    currentLocation?.name,
    currentWeather?.temperature,
    currentWeather?.precipitationProbability,
    currentWeather?.humidity,
    currentWeather?.windSpeed,
    isFahrenheit,
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

  // Load conversation messages from Supabase if activeConversationId is provided
  useEffect(() => {
    if (activeConversationId && currentUser && !currentUser.isGuest) {
      historyService.getConversationMessages(activeConversationId).then((records) => {
        if (records && records.length > 0) {
          const loaded: ChatMessage[] = records.map((r) => ({
            id: r.id,
            role: r.role,
            sender: r.role,
            content: r.content,
            text: r.content,
            timestamp: r.created_at,
            language: r.language,
            isAIGenerated: r.is_ai_generated,
            data: r.weather_data,
          }));
          setMessages(loaded);
        }
      });
    }
  }, [activeConversationId, currentUser?.id, currentUser?.isGuest]);

  // When user changes output language, update all visible assistant responses dynamically without re-querying weather APIs
  const effectiveOutputLang =
    voice.outputLanguage && voice.outputLanguage !== "auto"
      ? voice.outputLanguage
      : preferredLanguage;

  const prevOutputLangRef = useRef<string>(effectiveOutputLang);

  useEffect(() => {
    if (prevOutputLangRef.current === effectiveOutputLang) return;
    prevOutputLangRef.current = effectiveOutputLang;

    // 1. Immediately update welcome / greeting message synchronously
    setMessages((prevMessages) => {
      return prevMessages.map((msg) => {
        if (msg.id === "welcome_msg") {
          const targetConfig = getLanguageConfig(effectiveOutputLang);
          const localizedWelcome =
            `Hello! I am WeatherGPT, your conversational weather intelligence assistant in ${targetConfig.name}. Ask me about rain forecasts, outdoor sports, travel routes, or city comparisons worldwide!`;
          return {
            ...msg,
            text: localizedWelcome,
            content: localizedWelcome,
            language: effectiveOutputLang,
          };
        }
        return msg;
      });
    });

    // 2. Localize all existing assistant messages in the chat history
    setMessages((currentMessages) => {
      currentMessages.forEach(async (msg) => {
        if ((msg.role === "assistant" || msg.sender === "assistant") && msg.id !== "welcome_msg") {
          try {
            const res = await localizeWeatherMessageAPI({
              text: msg.text,
              data: msg.data,
              location: msg.data?.location || currentLocation || undefined,
              targetLanguage: effectiveOutputLang,
            });

            if (res && res.text) {
              setMessages((latest) =>
                latest.map((m) =>
                  m.id === msg.id
                    ? { ...m, text: res.text, content: res.text, language: effectiveOutputLang }
                    : m
                )
              );

              if (currentUser && !currentUser.isGuest && activeConversationId) {
                historyService.updateMessageContent(msg.id, res.text, effectiveOutputLang).catch(() => {});
              }
            }
          } catch (err) {
            console.warn("Failed to localize message:", err);
          }
        }
      });
      return currentMessages;
    });
  }, [effectiveOutputLang, currentLocation, currentUser, activeConversationId]);

  const handleSend = async (textToSend = inputText, isVoiceTriggered: boolean = false) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isSending) return;

    // Unlock audio context on user action
    voice.unlockAudio();

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

    // Save to conversation history if user is authenticated
    let convId = activeConversationId;
    if (currentUser && !currentUser.isGuest) {
      if (!convId) {
        const title = historyService.generateTitle(trimmed, currentLocation || undefined);
        const newConv = await historyService.createConversation(currentUser.id, {
          title,
          location: currentLocation || undefined,
          language: preferredLanguage,
        });
        if (newConv) {
          convId = newConv.id;
          if (onActiveConversationChange) {
            onActiveConversationChange(newConv.id, newConv.title);
          }
        }
      }
      if (convId) {
        historyService.addMessage(currentUser.id, convId, {
          role: "user",
          content: trimmed,
          language: preferredLanguage,
          context,
        });
      }
    }

    try {
      // Language precedence:
      // 1. Explicit voice output language (if set and not 'auto' and not 'all')
      // 2. Explicit preferred language from app settings (if set and not 'auto' and not 'all')
      // 3. Auto mode: regional script detection from query text, else 'auto'
      const isVoiceExplicit = Boolean(voice.outputLanguage && voice.outputLanguage !== "auto" && voice.outputLanguage.toLowerCase() !== "all");
      const isPrefExplicit = Boolean(preferredLanguage && preferredLanguage !== "auto" && preferredLanguage.toLowerCase() !== "all");

      let queryLanguage: string;
      if (isVoiceExplicit) {
        queryLanguage = voice.outputLanguage;
      } else if (isPrefExplicit) {
        queryLanguage = preferredLanguage;
      } else {
        const detectedMsgLang = detectScriptLanguage(trimmed);
        queryLanguage = detectedMsgLang !== "en" ? detectedMsgLang : "auto";
      }

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

      // Save assistant message to cloud history
      if (currentUser && !currentUser.isGuest && convId) {
        historyService.addMessage(currentUser.id, convId, {
          role: "assistant",
          content: result.reply,
          language: result.language,
          is_ai_generated: true,
          weather_data: result.data,
        });
      }

      // Automatically speak the response if Voice Mode triggered it or Auto-Speak is enabled
      if (voice.autoSpeak || isVoiceTriggered) {
        setCurrentlySpeakingMessageId(assistantMsgId);
        voice.speak(result.reply, result.language || voice.effectiveOutputLanguage);
      }
      if (result.context) {
        onUpdateContext(result.context);
      }
      if (result.data?.location && onSelectLocation) {
        const resLoc = result.data.location;
        const isSpuriousMy = resLoc.name?.toLowerCase() === "my" && (resLoc.countryCode === "BE" || resLoc.country?.toLowerCase() === "belgium");
        if (
          !isSpuriousMy &&
          (!currentLocation ||
          Math.abs(resLoc.latitude - currentLocation.latitude) > 0.05 ||
          Math.abs(resLoc.longitude - currentLocation.longitude) > 0.05)
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
      voice.unlockAudio();
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
  const handleToggleSpeakMessage = (msgId: string, text: string, msgLanguage?: string) => {
    if (currentlySpeakingMessageId === msgId && voice.isSpeaking) {
      voice.stopSpeaking();
      setCurrentlySpeakingMessageId(null);
    } else {
      voice.unlockAudio();
      setCurrentlySpeakingMessageId(msgId);
      const targetLanguage = msgLanguage || voice.effectiveOutputLanguage || preferredLanguage;
      voice.speak(text, targetLanguage, true);
    }
  };

  return (
    <div className="flex flex-col h-[75vh] max-h-[750px] rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-xl overflow-hidden">
      {/* Chat Header */}
      <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Conversational Intelligence</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Context: {activeLocationName || "Worldwide"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Input & Output Languages Configurator */}
          <button
            id="voice-languages-config-btn"
            onClick={() => setIsVoiceSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-medium transition-colors"
            title="Configure separate input and output voice languages"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Voice Langs</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-300 font-mono">
              {voice.inputLanguage === "auto" ? "In: Auto" : `In: ${voice.inputLanguage.toUpperCase()}`} • {voice.outputLanguage === "auto" ? "Out: Auto" : `Out: ${voice.outputLanguage.toUpperCase()}`}
            </span>
          </button>

          {/* Voice Auto-Speak Toggle */}
          <button
            onClick={voice.toggleAutoSpeak}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              voice.autoSpeak
                ? "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300"
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
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 text-xs transition-colors"
              title="Stop voice playback"
            >
              <Square className="w-3 h-3 fill-rose-400" />
              <span>Stop Audio</span>
            </button>
          )}

          {/* New Chat Button */}
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-xs font-semibold transition-colors cursor-pointer"
              title="Start a new conversation session"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          )}

          <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block pl-2 border-l border-slate-200 dark:border-slate-800">
            Active: <strong className="text-slate-800 dark:text-slate-200 capitalize">{langConfig.name}</strong>
          </div>
        </div>
      </div>

      {/* Active Conversation Session Indicator */}
      {activeConversationTitle && (
        <div className="px-5 py-2 bg-sky-50 dark:bg-sky-950/40 border-b border-sky-200 dark:border-sky-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
            <History className="w-3.5 h-3.5" />
            <span>Session: <strong className="text-slate-900 dark:text-white font-medium">{activeConversationTitle}</strong></span>
          </div>
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white underline cursor-pointer"
            >
              Start New Chat
            </button>
          )}
        </div>
      )}

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
                      : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm"
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>

                  {/* Attached Mini Cards if response included structured data */}
                  {!isUser && msg.data?.current && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <WeatherIcon code={msg.data.current.weatherCode} className="w-6 h-6" />
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {formatTemp(msg.data.current.temperature)} • {msg.data.current.condition}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Feels like {formatTemp(msg.data.current.feelsLike)}</span>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-600 dark:text-slate-300">
                        <span>Rain Prob: {msg.data.current.precipitationProbability}%</span>
                        <span className="block text-slate-500 dark:text-slate-400">
                          {msg.data.current.rain > 0
                            ? `${msg.data.current.rain} mm rain`
                            : "0.0 mm (No rain falling)"}
                        </span>
                      </div>
                    </div>
                  )}

                  {!isUser && msg.data?.activity && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{msg.data.activity.activityName}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">Risk: {msg.data.activity.riskLevel}</span>
                      </div>
                      <span className="font-extrabold text-sky-600 dark:text-sky-400 text-sm">
                        {msg.data.activity.suitabilityScore}/100 ({msg.data.activity.suitability.toUpperCase()})
                      </span>
                    </div>
                  )}

                  {!isUser && msg.data?.travel && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                        <span>{msg.data.travel.origin.name}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span>{msg.data.travel.destination.name}</span>
                      </div>
                      <span className="text-amber-500 dark:text-amber-400 font-bold uppercase text-[11px]">
                        {msg.data.travel.weatherRiskLevel} Risk ({msg.data.travel.totalDistanceKm} km)
                      </span>
                    </div>
                  )}
                </div>

                {/* Footnote status & Voice read aloud button */}
                {!isUser && (
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1">
                    <div className="flex items-center gap-2">
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                        {msg.isAIGenerated ? "Grounded Gemini Interpretation" : "Deterministic Meteorological Engine"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Copy Message Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={copiedMessageId === msg.id ? "Copied to clipboard!" : "Copy message"}
                      >
                        {copiedMessageId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] text-emerald-500 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>

                      {/* Speaker Listen Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleSpeakMessage(msg.id, msg.text, msg.language || preferredLanguage)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                          currentlySpeakingMessageId === msg.id && voice.isSpeaking
                            ? "bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30"
                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                        title={currentlySpeakingMessageId === msg.id && voice.isSpeaking ? "Stop reading aloud" : "Read response aloud"}
                      >
                        {currentlySpeakingMessageId === msg.id && voice.isSpeaking ? (
                          <>
                            <Square className="w-3 h-3 fill-sky-400 text-sky-400" />
                            <span className="text-[10px] font-medium text-sky-600 dark:text-sky-300">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span className="text-[10px]">Listen</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
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
          <div className="flex items-center gap-2 ml-2 shrink-0">
            {voice.error.code === "not-allowed" && (
              <button
                onClick={() => {
                  voice.clearError();
                  voice.replayLast();
                }}
                className="px-2.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Tap to Play
              </button>
            )}
            <button
              onClick={voice.clearError}
              className="text-[11px] underline hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Language Indicator & Suggested Query Chips */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[10px] text-sky-600 dark:text-sky-400 shrink-0 font-medium">
          <Globe className="w-3 h-3" />
          <span>{langConfig.name}</span>
          {langConfig.nativeName !== langConfig.name && (
            <span className="text-slate-500 dark:text-slate-400 font-normal">({langConfig.nativeName})</span>
          )}
        </div>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold shrink-0">Try:</span>
        {dynamicSuggestedQueries.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q)}
            disabled={isSending}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors disabled:opacity-50 hover:text-slate-900 dark:hover:text-white"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Dual Voice Language Indicator Strip */}
      <div className="px-4 py-1.5 bg-slate-100/80 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
            <Mic className="w-3 h-3" />
            <span>
              Mic Input:{" "}
              <strong className="text-emerald-700 dark:text-emerald-300">
                {voice.inputLanguage === "auto"
                  ? `Auto (${inputLangConfig.name})`
                  : inputLangConfig.name}
              </strong>
            </span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium shrink-0">
            <Volume2 className="w-3 h-3" />
            <span>
              Voice Output:{" "}
              <strong className="text-sky-700 dark:text-sky-300">
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
          className="text-[11px] text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-300 underline font-medium shrink-0 ml-2"
        >
          Change Voice Languages
        </button>
      </div>

      {/* Input Box */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
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
            className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 disabled:opacity-50"
          />

          {/* Live API Button (gemini-3.8-live) */}
          <button
            type="button"
            onClick={() => setIsLiveModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/15 to-blue-500/15 hover:from-cyan-500/25 hover:to-blue-500/25 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-semibold transition-all shadow-sm cursor-pointer shrink-0"
            title="Real-time Duplex Voice Conversation (gemini-3.8-live)"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-500" />
            <span className="hidden sm:inline">Live Voice</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          </button>

          {/* Voice Input Microphone Button (gemini-3.5-transcribe) */}
          <button
            type="button"
            onClick={handleToggleVoiceInput}
            disabled={isSending}
            className={`p-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 ${
              voice.isListening
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400 animate-pulse"
                : voice.isSpeaking
                ? "bg-sky-500/20 text-sky-500 dark:text-sky-400 border border-sky-500/40 hover:bg-sky-500/30"
                : "bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
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

      {/* Gemini Live Duplex Voice Assistant Modal (gemini-3.8-live) */}
      <GeminiLiveModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        preferredLanguage={preferredLanguage}
        currentLocationName={activeLocationName}
      />
    </div>
  );
}
