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
import { WeatherGptLogo } from "./WeatherGptLogo.js";
import {
  getLanguageConfig,
  resolveEffectiveResponseLanguage,
  buildLocalizedInitialWeatherSummary,
} from "../languages.js";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
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

  // Centralized Language Resolution Priority:
  // 1. Manual Output Language Override: voice.outputLanguage (if set and not 'auto' / 'all')
  // 2. App Language Default: preferredLanguage
  // 3. Fallback: 'en'
  const effectiveOutputLang = resolveEffectiveResponseLanguage(
    preferredLanguage,
    voice.outputLanguage
  );

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

  const getLocalizedWelcome = (lang: string) => {
    if (lang === "hi") {
      return `नमस्ते! मैं **WeatherGPT** हूँ, आपका संवादात्मक मौसम आसूचना सहायक।
मैं ओपन-मेटियो प्रेक्षणों और जेमिनी विश्लेषण के साथ सत्यापित मौसम अंतर्दृष्टि प्रदान करता हूँ। मुझसे वर्तमान स्थिति, बारिश के पूर्वानुमान, खेल/गतिविधि अनुकूलता, राजमार्ग यात्रा मौसम या भारत और दुनिया भर के शहरों की तुलना के बारे में कुछ भी पूछें!`;
    }
    if (lang === "hinglish") {
      return `Hello! Main **WeatherGPT** hoon, aapka conversational weather intelligence assistant.
Factual Open-Meteo observations aur multilingual Gemini interpretation ke saath accurate weather insights provide karta hoon. Current conditions, rain forecast, outdoor sports, travel route weather ya city comparisons ke bare me poochiye!`;
    }
    if (lang === "bn") {
      return `নমস্কার! আমি **WeatherGPT**, আপনার কথোপকথনমূলক আবহাওয়া তথ্য সহকারী।
যাচাইকৃত আবহাওয়া পর্যবেক্ষণ এবং বহুভাষিক বিশ্লেষণের সাথে নির্ভরযোগ্য তথ্য প্রদান করি। বর্তমান পরিস্থিতি, বৃষ্টির পূর্বাভাস, খেলাধুলার উপযুক্ততা বা শহরের তুলনামূলক আবহাওয়া সম্পর্কে জিজ্ঞাসা করুন!`;
    }
    const cfg = getLanguageConfig(lang);
    return `Hello! I am **WeatherGPT**, your conversational weather intelligence assistant in ${cfg.name}.
I combine factual Open-Meteo observations with deterministic analysis and multilingual Gemini interpretation. Ask me anything about current conditions, rain forecasts, sport/activity suitability, highway travel weather, or city comparisons worldwide!`;
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome_msg",
      role: "assistant",
      sender: "assistant",
      content: getLocalizedWelcome(effectiveOutputLang),
      text: getLocalizedWelcome(effectiveOutputLang),
      timestamp: new Date().toISOString(),
      isAIGenerated: false,
      language: effectiveOutputLang,
    },
  ]);

  // Synchronize conversational weather summary with exact normalized weather context and effective language
  useEffect(() => {
    if (currentLocation && currentWeather) {
      const locationSummary = buildLocalizedInitialWeatherSummary(
        currentLocation,
        currentWeather,
        weatherAnalysis,
        effectiveOutputLang,
        isFahrenheit
      );

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
              language: effectiveOutputLang,
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
    currentLocation?.admin1,
    currentLocation?.country,
    currentWeather?.temperature,
    currentWeather?.precipitationProbability,
    currentWeather?.humidity,
    currentWeather?.windSpeed,
    isFahrenheit,
    effectiveOutputLang,
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
  const prevOutputLangRef = useRef<string>(effectiveOutputLang);

  useEffect(() => {
    if (prevOutputLangRef.current === effectiveOutputLang) return;
    prevOutputLangRef.current = effectiveOutputLang;

    // 1. Immediately update welcome / greeting message synchronously
    setMessages((prevMessages) => {
      return prevMessages.map((msg) => {
        if (msg.id === "welcome_msg") {
          const localizedWelcome = getLocalizedWelcome(effectiveOutputLang);
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
      // Centralized Language Resolution Priority:
      // 1. Manual output language override: voice.outputLanguage
      // 2. App Language Default: preferredLanguage
      // 3. Fallback: 'en'
      const targetQueryLang = resolveEffectiveResponseLanguage(
        preferredLanguage,
        voice.outputLanguage
      );

      const result = await queryWeatherAPI(trimmed, context, targetQueryLang, currentLocation || undefined);

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
    <div id="weather-chat-container" className="flex flex-col h-[75vh] max-h-[750px] rounded-[8px] bg-[#0F141B] dark:bg-[#0F141B] light:bg-white border border-[#252A32] dark:border-[#252A32] light:border-slate-200 shadow-sm overflow-hidden transition-colors">
      {/* Chat Header */}
      <div className="px-4 sm:px-5 py-3 bg-[#14181F] dark:bg-[#14181F] light:bg-slate-50 border-b border-[#252A32] dark:border-[#252A32] light:border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-gradient-to-b from-[#2A231C] to-[#171410] border border-[#F4A261]/30 flex items-center justify-center p-1 shadow-sm shrink-0">
            <WeatherGptLogo size={24} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 uppercase tracking-wider font-mono">
                ATMOSPHERIC CONVERSATIONAL INTELLIGENCE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#8ECAE6]" />
            </div>
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
              Grounded Context: <strong className="text-slate-200 dark:text-slate-200 light:text-slate-800 font-sans font-medium">{activeLocationName || "Worldwide"}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Input & Output Languages Configurator */}
          <button
            id="voice-languages-config-btn"
            onClick={() => setIsVoiceSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-white border border-[#252A32] dark:border-[#252A32] light:border-slate-300 hover:border-slate-400 text-slate-300 dark:text-slate-300 light:text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            title="Configure separate input and output voice languages"
          >
            <Sliders className="w-3.5 h-3.5 text-[#8ECAE6]" />
            <span className="hidden sm:inline">Voice Langs</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#14181F] dark:bg-[#14181F] light:bg-slate-100 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 font-mono">
              {voice.inputLanguage === "auto" ? "In: Auto" : `In: ${voice.inputLanguage.toUpperCase()}`} • {voice.outputLanguage === "auto" ? "Out: Auto" : `Out: ${voice.outputLanguage.toUpperCase()}`}
            </span>
          </button>

          {/* Voice Auto-Speak Toggle */}
          <button
            onClick={voice.toggleAutoSpeak}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium border transition-colors cursor-pointer ${
              voice.autoSpeak
                ? "bg-[#1E232B] dark:bg-[#1E232B] light:bg-sky-50 border-[#8ECAE6]/40 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-800 font-semibold"
                : "bg-[#1B2027] dark:bg-[#1B2027] light:bg-white border-[#252A32] dark:border-[#252A32] light:border-slate-300 text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200"
            }`}
            title="Toggle automatic speech output for answers"
          >
            {voice.autoSpeak ? <Volume2 className="w-3.5 h-3.5 text-[#8ECAE6]" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{voice.autoSpeak ? "Voice ON" : "Voice OFF"}</span>
          </button>

          {/* Active speech stop button if currently speaking */}
          {voice.isSpeaking && (
            <button
              onClick={voice.stopSpeaking}
              className="flex items-center gap-1 px-2 py-1 rounded-[4px] bg-rose-950/40 dark:bg-rose-950/40 light:bg-rose-50 border border-rose-500/30 text-rose-400 dark:text-rose-400 light:text-rose-700 hover:bg-rose-900/30 text-xs transition-colors cursor-pointer"
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-transparent border border-[#F4A261]/60 hover:bg-[#F4A261]/10 text-[#F4A261] text-xs font-semibold transition-colors cursor-pointer"
              title="Start a new conversation session"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#F4A261]" />
              <span className="hidden sm:inline">New Session</span>
            </button>
          )}

          <div className="text-[11px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 hidden md:block pl-2 border-l border-[#252A32] dark:border-[#252A32] light:border-slate-300">
            Dialect: <strong className="text-slate-200 dark:text-slate-200 light:text-slate-800 capitalize font-sans">{langConfig.name}</strong>
          </div>
        </div>
      </div>

      {/* Active Conversation Session Indicator */}
      {activeConversationTitle && (
        <div className="px-4 sm:px-5 py-2 bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-100 border-b border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300 dark:text-slate-300 light:text-slate-700">
            <History className="w-3.5 h-3.5 text-[#8ECAE6]" />
            <span>Session: <strong className="text-slate-100 dark:text-slate-100 light:text-slate-900 font-medium">{activeConversationTitle}</strong></span>
          </div>
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="text-[11px] text-[#8ECAE6] hover:underline cursor-pointer"
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
            <div key={msg.id} className={`flex gap-2.5 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="w-6 h-6 rounded-[4px] bg-[#1B2027] border border-[#30353D] flex items-center justify-center shrink-0 mt-0.5 p-0.5 shadow-sm">
                  <WeatherGptLogo size={18} />
                </div>
              )}

              <div className={`max-w-[88%] md:max-w-[78%] space-y-2`}>
                <div
                  className={`p-3.5 sm:p-4 rounded-[6px] text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-[#252A32] dark:bg-[#252A32] light:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-slate-100 dark:text-slate-100 light:text-slate-900 font-normal"
                      : "bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800"
                  }`}
                >
                  <MarkdownRenderer content={msg.text} />

                  {/* Attached Mini Cards if response included structured data */}
                  {!isUser && msg.data?.current && (
                    <div className="mt-3 pt-3 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 p-2.5 rounded-[4px] border border-[#30353D] dark:border-[#30353D] light:border-slate-200">
                      <div className="flex items-center gap-2">
                        <WeatherIcon code={msg.data.current.weatherCode} className="w-5 h-5 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 block font-mono">
                            {formatTemp(msg.data.current.temperature)} • {msg.data.current.condition}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
                            Feels like {formatTemp(msg.data.current.feelsLike)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-[11px] font-mono text-slate-300 dark:text-slate-300 light:text-slate-700">
                        <span>Rain Prob: {msg.data.current.precipitationProbability}%</span>
                        <span className="block text-slate-400 dark:text-slate-400 light:text-slate-500">
                          {msg.data.current.rain > 0
                            ? `${msg.data.current.rain} mm rain`
                            : "0.0 mm (None)"}
                        </span>
                      </div>
                    </div>
                  )}

                  {!isUser && msg.data?.activity && (
                    <div className="mt-2 p-2.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">{msg.data.activity.activityName}</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500 block mt-0.5">Risk: {msg.data.activity.riskLevel}</span>
                      </div>
                      <span className="font-mono font-bold text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 text-sm">
                        {msg.data.activity.suitabilityScore}/100 ({msg.data.activity.suitability.toUpperCase()})
                      </span>
                    </div>
                  )}

                  {!isUser && msg.data?.travel && (
                    <div className="mt-2 p-2.5 rounded-[4px] bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900">
                        <span>{msg.data.travel.origin.name}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span>{msg.data.travel.destination.name}</span>
                      </div>
                      <span className="text-[#F4A261] font-mono font-bold uppercase text-[11px]">
                        {msg.data.travel.weatherRiskLevel} Risk ({msg.data.travel.totalDistanceKm} km)
                      </span>
                    </div>
                  )}
                </div>

                {/* Footnote status & Voice read aloud button */}
                {!isUser && (
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 px-1">
                    <div className="flex items-center gap-2">
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-sans">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        {msg.isAIGenerated ? "Grounded Gemini Interpretation" : "Deterministic Engine"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-sans">
                      {/* Copy Message Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-100 transition-colors cursor-pointer"
                        title={copiedMessageId === msg.id ? "Copied to clipboard!" : "Copy message"}
                      >
                        {copiedMessageId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400 font-medium">Copied</span>
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
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] transition-colors cursor-pointer ${
                          currentlySpeakingMessageId === msg.id && voice.isSpeaking
                            ? "bg-[#252A32] text-[#8ECAE6] border border-[#8ECAE6]/40"
                            : "text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900 hover:bg-[#252A32] dark:hover:bg-[#252A32] light:hover:bg-slate-100"
                        }`}
                        title={currentlySpeakingMessageId === msg.id && voice.isSpeaking ? "Stop reading aloud" : "Read response aloud"}
                      >
                        {currentlySpeakingMessageId === msg.id && voice.isSpeaking ? (
                          <>
                            <Square className="w-3 h-3 fill-[#8ECAE6] text-[#8ECAE6]" />
                            <span className="text-[10px] font-medium text-[#8ECAE6]">Stop</span>
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
                <div className="w-6 h-6 rounded-[4px] bg-[#252A32] border border-[#30353D] flex items-center justify-center shrink-0 mt-0.5 text-slate-300">
                  <User className="w-3.5 h-3.5 text-slate-300" />
                </div>
              )}
            </div>
          );
        })}

        {isSending && (
          <div className="flex gap-2.5 items-center text-xs text-slate-400 font-mono">
            <div className="w-6 h-6 rounded-[4px] bg-[#1B2027] border border-[#30353D] flex items-center justify-center animate-pulse p-0.5 shadow-sm">
              <WeatherGptLogo size={18} />
            </div>
            <span>Analyzing verified weather observations & synthesizing answer...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Listening / Active Banner */}
      {voice.isListening && (
        <div className="px-4 py-2 bg-rose-950/30 border-t border-rose-500/30 flex items-center justify-between text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="font-semibold text-rose-300 shrink-0">Listening ({langConfig.name}):</span>
            <span className="text-slate-100 italic truncate font-mono text-[11px]">
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
            className="px-2.5 py-1 rounded-[3px] bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/30 text-[11px] font-medium shrink-0 transition-colors cursor-pointer"
          >
            Done Speaking
          </button>
        </div>
      )}

      {/* Voice Error Banner */}
      {voice.error && (
        <div className="px-4 py-2 bg-amber-950/30 border-t border-amber-500/30 flex items-center justify-between text-xs text-amber-300 font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#F4A261] shrink-0" />
            <span>{voice.error.message}</span>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            {voice.error.code === "not-allowed" && (
              <button
                onClick={() => {
                  voice.clearError();
                  voice.replayLast();
                }}
                className="px-2 py-0.5 rounded-[3px] bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Tap to Play
              </button>
            )}
            <button
              onClick={voice.clearError}
              className="text-[11px] underline hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Language Indicator & Suggested Query Chips */}
      <div className="px-3.5 sm:px-4 py-2 bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#252A32] dark:bg-[#252A32] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-[10px] text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 shrink-0 font-medium">
          <Globe className="w-3 h-3" />
          <span>{langConfig.name}</span>
          {langConfig.nativeName !== langConfig.name && (
            <span className="text-slate-400 font-normal">({langConfig.nativeName})</span>
          )}
        </div>
        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold shrink-0">Try:</span>
        {dynamicSuggestedQueries.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q)}
            disabled={isSending}
            className="px-2.5 py-1 rounded-[4px] bg-[#171C23] hover:bg-[#252A32] dark:bg-[#171C23] dark:hover:bg-[#252A32] light:bg-white light:hover:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-200 text-[11px] text-slate-300 dark:text-slate-300 light:text-slate-700 whitespace-nowrap transition-colors disabled:opacity-50 hover:text-slate-100 dark:hover:text-white cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Dual Voice Language Indicator Strip */}
      <div className="px-3.5 sm:px-4 py-1.5 bg-[#171C23] dark:bg-[#171C23] light:bg-slate-100 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 text-emerald-400 font-medium shrink-0">
            <Mic className="w-3 h-3" />
            <span>
              Mic Input:{" "}
              <strong className="text-slate-200 dark:text-slate-200 light:text-slate-800">
                {voice.inputLanguage === "auto"
                  ? `Auto (${inputLangConfig.name})`
                  : inputLangConfig.name}
              </strong>
            </span>
          </div>
          <span className="text-[#30353D] dark:text-[#30353D] light:text-slate-300">•</span>
          <div className="flex items-center gap-1 text-[#8ECAE6] font-medium shrink-0">
            <Volume2 className="w-3 h-3" />
            <span>
              Voice Output:{" "}
              <strong className="text-slate-200 dark:text-slate-200 light:text-slate-800">
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
          className="text-[11px] text-[#8ECAE6] hover:underline font-medium shrink-0 ml-2 cursor-pointer font-sans"
        >
          Change Voice Languages
        </button>
      </div>

      {/* Input Box */}
      <div className="p-3 bg-[#1B2027] dark:bg-[#1B2027] light:bg-slate-50 border-t border-[#30353D] dark:border-[#30353D] light:border-slate-200">
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
            className="flex-1 px-3.5 py-2 rounded-[4px] bg-[#171C23] dark:bg-[#171C23] light:bg-white border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-xs sm:text-sm text-slate-100 dark:text-slate-100 light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#8ECAE6] disabled:opacity-50 transition-colors"
          />

          {/* Live API Button (gemini-3.8-live) */}
          <button
            type="button"
            onClick={() => setIsLiveModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-[4px] bg-[#252A32] dark:bg-[#252A32] light:bg-white hover:bg-[#30353D] dark:hover:bg-[#30353D] light:hover:bg-slate-100 border border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-[#8ECAE6] dark:text-[#8ECAE6] light:text-sky-700 text-xs font-semibold transition-colors shadow-sm cursor-pointer shrink-0"
            title="Real-time Duplex Voice Conversation (gemini-3.8-live)"
          >
            <Zap className="w-3.5 h-3.5 text-[#8ECAE6]" />
            <span className="hidden sm:inline">Live Voice</span>
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8ECAE6] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#8ECAE6]"></span>
            </span>
          </button>

          {/* Voice Input Microphone Button (gemini-3.5-transcribe) */}
          <button
            type="button"
            onClick={handleToggleVoiceInput}
            disabled={isSending}
            className={`p-2 rounded-[4px] transition-colors disabled:opacity-50 cursor-pointer border ${
              voice.isListening
                ? "bg-rose-950/60 border-rose-500 text-rose-300 ring-1 ring-rose-400"
                : voice.isSpeaking
                ? "bg-[#252A32] text-[#8ECAE6] border-[#8ECAE6]/40"
                : "bg-[#252A32] dark:bg-[#252A32] light:bg-white hover:bg-[#30353D] dark:hover:bg-[#30353D] light:hover:bg-slate-100 border-[#30353D] dark:border-[#30353D] light:border-slate-300 text-slate-300 dark:text-slate-300 light:text-slate-700"
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
              <Radio className="w-4 h-4 animate-spin text-[#8ECAE6]" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="p-2 rounded-[4px] bg-[#252A32] dark:bg-[#252A32] light:bg-slate-900 hover:bg-[#30353D] dark:hover:bg-[#30353D] light:hover:bg-slate-800 text-slate-100 dark:text-slate-100 light:text-white border border-[#30353D] dark:border-[#30353D] light:border-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
            title="Send query"
          >
            <Send className="w-4 h-4 text-[#8ECAE6]" />
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
