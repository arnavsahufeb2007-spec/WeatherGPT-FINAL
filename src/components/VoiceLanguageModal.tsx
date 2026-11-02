import React, { useState } from "react";
import {
  Mic,
  Volume2,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Play,
  Square,
  ArrowRight,
  Languages,
  Radio,
  Sliders,
} from "lucide-react";
import {
  ALL_LANGUAGES,
  INDIAN_LANGUAGES,
  INTERNATIONAL_LANGUAGES,
  SPECIAL_LANGUAGES,
  getLanguageConfig,
} from "../languages.js";

interface VoiceLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  appLanguage: string;
  inputLanguage: string;
  outputLanguage: string;
  autoSpeak: boolean;
  speechRate: number;
  onSelectInputLanguage: (lang: string) => void;
  onSelectOutputLanguage: (lang: string) => void;
  onToggleAutoSpeak: () => void;
  onChangeSpeechRate: (rate: number) => void;
  onResetDefaults: () => void;
  onTestVoice: (langCode: string, sampleText: string) => void;
  isSpeakingTest?: boolean;
  onStopTestVoice?: () => void;
}

export function VoiceLanguageModal({
  isOpen,
  onClose,
  appLanguage,
  inputLanguage,
  outputLanguage,
  autoSpeak,
  speechRate,
  onSelectInputLanguage,
  onSelectOutputLanguage,
  onToggleAutoSpeak,
  onChangeSpeechRate,
  onResetDefaults,
  onTestVoice,
  isSpeakingTest = false,
  onStopTestVoice,
}: VoiceLanguageModalProps) {
  const [activeTab, setActiveTab] = useState<"languages" | "speech">("languages");

  if (!isOpen) return null;

  const appLangConfig = getLanguageConfig(appLanguage);

  const resolveDisplayName = (code: string, isInput: boolean) => {
    if (!code || code === "auto") {
      return isInput
        ? `Auto (Match App: ${appLangConfig.name})`
        : `Auto (Follow App Language: ${appLangConfig.name})`;
    }
    const conf = getLanguageConfig(code);
    return `${conf.name} ${conf.nativeName && conf.nativeName !== conf.name ? `(${conf.nativeName})` : ""}`;
  };

  const getTestSentence = (langCode: string) => {
    const effective = (!langCode || langCode === "auto") ? appLanguage : langCode;
    switch (effective) {
      case "hi":
        return "वेदर जीपीटी वॉयस टेस्ट: आज तापमान 26°C और हवा की गति 20 km/h है।";
      case "hinglish":
        return "WeatherGPT voice test: Aaj temperature 26°C aur hawa 20 km/h chal rahi hai.";
      case "bn":
        return "ওয়েদার জিপিটি ভয়েস টেস্ট: আজ তাপমাত্রা ২৬°C ও বাতাস ২০ km/h বেগে বইছে।";
      case "te":
        return "వెదర్ జీపీటీ వాయిస్ టెస్ట్: నేడు ఉష్ణోగ్రత 26°C మరియు గాలి 20 km/h వేగంతో వీస్తోంది.";
      case "ta":
        return "வெதர் ஜிபிடி வாய்ஸ் டெஸ்ட்: இன்று வெப்பநிலை 26°C மற்றும் காற்று 20 km/h வேகத்தில் வீசுகிறது.";
      case "mr":
        return "वेदर जीपीटी व्हॉईस टेस्ट: आज तापमान 26°C आणि वारा 20 km/h वेगाने वाहत आहे.";
      case "gu":
        return "વેધર જીપીટી વૉઇસ ટેસ્ટ: આજે તાપમાન ૨૬°C અને પવન ૨૦ km/h ની ઝડપે ફૂંકાઈ રહ્યો છે.";
      case "pa":
        return "ਵੈਦਰ ਜੀਪੀਟੀ ਵੌਇਸ ਟੈਸਟ: ਅੱਜ ਤਾਪਮਾਨ 26°C ਅਤੇ ਹਵਾ 20 km/h ਦੀ ਰਫ਼ਤਾਰ ਨਾਲ ਚੱਲ ਰਹੀ ਹੈ।";
      default:
        return "WeatherGPT voice test: The wind blowing is 20 km/h and temperature is 26°C.";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#171C23] border border-[#30353D] rounded-[8px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#30353D] bg-[#1B2027] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[6px] bg-[#252A32] border border-[#30353D] flex items-center justify-center text-[#8ECAE6]">
              <Languages className="w-4 h-4 text-[#8ECAE6]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold font-mono text-slate-100 flex items-center gap-2">
                Voice Languages & Speech
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-[3px] bg-[#252A32] text-[#8ECAE6] border border-[#8ECAE6]/40">
                  Multilingual
                </span>
              </h3>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Configure distinct spoken input (microphone) and spoken output (voice playback) languages
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-slate-400 hover:text-white hover:bg-[#252A32] transition-colors cursor-pointer"
            title="Close voice settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dual Flow Status Visualizer */}
        <div className="px-4 py-2 bg-[#1B2027] border-b border-[#30353D] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#252A32] border border-emerald-500/30 text-emerald-400 font-medium">
              <Mic className="w-3 h-3" />
              <span>Input: {inputLanguage === "auto" ? "Auto" : getLanguageConfig(inputLanguage).name}</span>
            </div>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#252A32] border border-[#8ECAE6]/30 text-[#8ECAE6] font-medium">
              <Volume2 className="w-3 h-3" />
              <span>Output: {outputLanguage === "auto" ? `Auto (${appLangConfig.name})` : getLanguageConfig(outputLanguage).name}</span>
            </div>
          </div>

          <button
            onClick={onResetDefaults}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded-[3px] hover:bg-[#252A32] transition-colors cursor-pointer shrink-0"
            title="Reset both voice languages to Auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Auto</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#30353D] bg-[#171C23] px-4 pt-2 font-mono">
          <button
            onClick={() => setActiveTab("languages")}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "languages"
                ? "border-[#8ECAE6] text-[#8ECAE6]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Voice Language Decoupling</span>
          </button>
          <button
            onClick={() => setActiveTab("speech")}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "speech"
                ? "border-[#8ECAE6] text-[#8ECAE6]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Speech Dynamics & Speed</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {activeTab === "languages" ? (
            <>
              {/* Section 1: Voice Input Language (Mic) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Voice Input Language</h4>
                      <p className="text-[11px] text-slate-400">Language your microphone listens for when speaking</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">
                    {resolveDisplayName(inputLanguage, true)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Auto option */}
                  <button
                    onClick={() => onSelectInputLanguage("auto")}
                    className={`p-2.5 rounded-[4px] border text-left font-mono transition-all ${
                      inputLanguage === "auto"
                        ? "bg-emerald-500/15 border-emerald-500/50 text-white ring-1 ring-emerald-500/50"
                        : "bg-[#1B2027] border-[#30353D] text-slate-300 hover:border-[#8ECAE6]/40 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Auto (App Match)</span>
                      {inputLanguage === "auto" && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Tracks {appLangConfig.name}
                    </span>
                  </button>

                  {/* Top Indian & Special Languages */}
                  {[
                    { code: "hi", name: "Hindi", sub: "हिन्दी" },
                    { code: "hinglish", name: "Hinglish", sub: "Hindi + English" },
                    { code: "en", name: "English (India)", sub: "Indian accent" },
                    { code: "bn", name: "Bengali", sub: "বাংলা" },
                    { code: "te", name: "Telugu", sub: "తెలుగు" },
                    { code: "ta", name: "Tamil", sub: "தமிழ்" },
                    { code: "mr", name: "Marathi", sub: "मराठी" },
                    { code: "gu", name: "Gujarati", sub: "ગુજરાતી" },
                    { code: "kn", name: "Kannada", sub: "ಕನ್ನಡ" },
                    { code: "ml", name: "Malayalam", sub: "മലയാളം" },
                    { code: "pa", name: "Punjabi", sub: "ਪੰਜਾਬੀ" },
                    { code: "ur", name: "Urdu", sub: "اردو" },
                    { code: "es", name: "Spanish", sub: "Español" },
                    { code: "fr", name: "French", sub: "Français" },
                  ].map((l) => {
                    const isSelected = inputLanguage === l.code;
                    return (
                      <button
                        key={l.code}
                        onClick={() => onSelectInputLanguage(l.code)}
                        className={`p-2.5 rounded-[4px] border text-left font-mono transition-all ${
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500/50 text-white ring-1 ring-emerald-500/50"
                            : "bg-[#1B2027] border-[#30353D] text-slate-300 hover:border-[#8ECAE6]/40 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{l.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{l.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#30353D]" />

              {/* Section 2: Voice Output Language (Speaker / Read-Aloud / AI Text Response Language) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-[4px] bg-[#252A32] text-[#8ECAE6]">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-mono text-white">Voice & Output Language</h4>
                      <p className="text-[11px] font-mono text-slate-400">Manual language override for AI text responses and read-aloud voice</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#8ECAE6]">
                    {resolveDisplayName(outputLanguage, false)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Auto option */}
                  <button
                    id="voice-output-auto-btn"
                    onClick={() => onSelectOutputLanguage("auto")}
                    className={`p-2.5 rounded-[4px] border text-left font-mono transition-all ${
                      outputLanguage === "auto"
                        ? "bg-[#8ECAE6]/15 border-[#8ECAE6]/50 text-white ring-1 ring-[#8ECAE6]/50"
                        : "bg-[#1B2027] border-[#30353D] text-slate-300 hover:border-[#8ECAE6]/40 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Auto (Follow App Language)</span>
                      {outputLanguage === "auto" && <Check className="w-3.5 h-3.5 text-[#8ECAE6]" />}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Follows App Interface: {appLangConfig.name}
                    </span>
                  </button>

                  {/* Available Output Voice Languages */}
                  {[
                    { code: "en", name: "English (India)", sub: "Clear & natural Indian voice" },
                    { code: "hi", name: "Hindi", sub: "हिन्दी उच्चारण" },
                    { code: "hinglish", name: "Hinglish", sub: "Natural bilingual enunciation" },
                    { code: "bn", name: "Bengali", sub: "বাংলা কণ্ঠস্বর" },
                    { code: "te", name: "Telugu", sub: "తెలుగు స్వరం" },
                    { code: "ta", name: "Tamil", sub: "தமிழ் குரல்" },
                    { code: "mr", name: "Marathi", sub: "मराठी आवाज" },
                    { code: "gu", name: "Gujarati", sub: "ગુજરાતી અવાજ" },
                    { code: "kn", name: "Kannada", sub: "ಕನ್ನಡ ಧ್ವನಿ" },
                    { code: "ml", name: "Malayalam", sub: "മലയാള ശബ്ദം" },
                    { code: "pa", name: "Punjabi", sub: "ਪੰਜਾਬੀ ਆਵਾਜ਼" },
                    { code: "ur", name: "Urdu", sub: "اردو آواز" },
                    { code: "es", name: "Spanish", sub: "Voz en español" },
                    { code: "fr", name: "French", sub: "Voix française" },
                  ].map((l) => {
                    const isSelected = outputLanguage === l.code;
                    return (
                      <button
                        key={l.code}
                        onClick={() => onSelectOutputLanguage(l.code)}
                        className={`p-2.5 rounded-[4px] border text-left font-mono transition-all ${
                          isSelected
                            ? "bg-[#8ECAE6]/15 border-[#8ECAE6]/50 text-white ring-1 ring-[#8ECAE6]/50"
                            : "bg-[#1B2027] border-[#30353D] text-slate-300 hover:border-[#8ECAE6]/40 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{l.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#8ECAE6]" />}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{l.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Test Voice Button */}
                <div className="pt-2 flex items-center justify-between bg-[#1B2027] p-3 rounded-[6px] border border-[#30353D]">
                  <div className="text-xs font-mono text-slate-300">
                    <span className="font-semibold text-white">Sample Preview: </span>
                    <span className="text-slate-400">Hear the selected output voice speak</span>
                  </div>

                  {isSpeakingTest ? (
                    <button
                      onClick={onStopTestVoice}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-950/60 text-xs font-mono font-medium transition-colors"
                    >
                      <Square className="w-3.5 h-3.5 fill-rose-300" />
                      <span>Stop Voice</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onTestVoice(outputLanguage, getTestSentence(outputLanguage))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#F4A261] hover:bg-[#F4A261]/90 text-[#0F141B] text-xs font-mono font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-[#0F141B]" />
                      <span>Test Output Voice</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Speech Dynamics Tab */
            <div className="space-y-4 font-mono">
              {/* Auto-Speak Toggle */}
              <div className="p-3.5 sm:p-4 rounded-[6px] bg-[#1B2027] border border-[#30353D] flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Auto-Speak Responses</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automatically read aloud WeatherGPT answers when queries complete
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleAutoSpeak}
                  className={`w-11 h-5.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    autoSpeak ? "bg-[#8ECAE6] justify-end" : "bg-[#252A32] justify-start border border-[#30353D]"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-sm block" />
                </button>
              </div>

              {/* Speech Speed / Rate */}
              <div className="p-3.5 sm:p-4 rounded-[6px] bg-[#1B2027] border border-[#30353D] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">Voice Playback Speed</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Adjust pacing for comfortable comprehension</p>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-[#8ECAE6]">{speechRate.toFixed(1)}x</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[0.8, 0.9, 1.0, 1.1, 1.2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => onChangeSpeechRate(rate)}
                      className={`flex-1 py-1.5 rounded-[4px] text-xs font-mono font-medium border transition-colors cursor-pointer ${
                        Math.abs(speechRate - rate) < 0.05
                          ? "bg-[#F4A261] text-[#0F141B] border-[#F4A261] font-bold"
                          : "bg-[#171C23] border-[#30353D] text-slate-400 hover:text-white"
                      }`}
                    >
                      {rate === 1.0 ? "1.0x Normal" : `${rate}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Engine Information */}
              <div className="p-3.5 rounded-[6px] bg-[#1B2027] border border-[#30353D] space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-[#8ECAE6]" />
                  <span className="text-white">Dual Voice Architecture</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Speech-to-Text maps your selected voice input language to native browser ASR and Bhashini Dhruva pipelines.
                  Voice output translates meteorological units (e.g. °C, km/h, %) phonetically to match the chosen output voice.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#1B2027] border-t border-[#30353D] flex items-center justify-between font-mono">
          <div className="text-[11px] text-slate-400">
            Microphone: <strong className="text-slate-100">{inputLanguage === "auto" ? "App Default" : getLanguageConfig(inputLanguage).name}</strong> • Speaker: <strong className="text-[#8ECAE6]">{outputLanguage === "auto" ? "Response Match" : getLanguageConfig(outputLanguage).name}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[4px] bg-[#252A32] hover:bg-[#30353D] text-[#8ECAE6] text-xs font-semibold border border-[#8ECAE6]/40 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
