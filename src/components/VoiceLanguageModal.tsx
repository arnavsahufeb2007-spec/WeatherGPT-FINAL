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
        : `Auto (Match Response Language)`;
    }
    const conf = getLanguageConfig(code);
    return `${conf.name} ${conf.nativeName && conf.nativeName !== conf.name ? `(${conf.nativeName})` : ""}`;
  };

  const getTestSentence = (langCode: string) => {
    const effective = (!langCode || langCode === "auto") ? appLanguage : langCode;
    switch (effective) {
      case "hi":
        return "वेदर जीपीटी वॉयस टेस्ट: आज 26 डिग्री सेल्सियस तापमान और साफ आसमान है।";
      case "hinglish":
        return "WeatherGPT voice test: Aaj 26 degree Celsius temperature aur clean skies hain.";
      case "bn":
        return "ওয়েদার জিপিটি ভয়েস টেস্ট: আজ ২৬ ডিগ্রি সেলসিয়াস তাপমাত্রা ও পরিষ্কার আকাশ।";
      case "te":
        return "వెదర్ జీపీటీ వాయిస్ టెస్ట్: నేడు 26 డిగ్రీల సెల్సియస్ ఉష్ణోగ్రత మరియు స్పష్టమైన ఆకాశం.";
      case "ta":
        return "வெதர் ஜிபிடி வாய்ஸ் டெஸ்ட்: இன்று 26 டிகிரி செல்சியஸ் வெப்பநிலை மற்றும் தெளிவான வானிலை.";
      case "mr":
        return "वेदर जीपीटी व्हॉईस टेस्ट: आज 26 डिग्री सेल्सिअस तापमान आणि निरभ्र आकाश आहे.";
      case "gu":
        return "વેધર જીપીટી વૉઇસ ટેસ્ટ: આજે 26 ડિગ્રી સેલ્સિયસ તાપમાન અને સ્વચ્છ આકાશ છે.";
      default:
        return "WeatherGPT voice test: Current temperature is 26 degrees Celsius with clear skies.";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
              <Languages className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Voice Languages & Speech
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Multilingual
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure distinct spoken input (microphone) and spoken output (voice playback) languages
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close voice settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual Flow Status Visualizer */}
        <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
              <Mic className="w-3.5 h-3.5" />
              <span>Input: {inputLanguage === "auto" ? "Auto" : getLanguageConfig(inputLanguage).name}</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 font-medium">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Output: {outputLanguage === "auto" ? "Auto" : getLanguageConfig(outputLanguage).name}</span>
            </div>
          </div>

          <button
            onClick={onResetDefaults}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            title="Reset both voice languages to Auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Auto</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 px-4 pt-2">
          <button
            onClick={() => setActiveTab("languages")}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "languages"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Voice Language Decoupling</span>
          </button>
          <button
            onClick={() => setActiveTab("speech")}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "speech"
                ? "border-sky-500 text-sky-400"
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
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      inputLanguage === "auto"
                        ? "bg-emerald-500/15 border-emerald-500/50 text-white ring-1 ring-emerald-500/50"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
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
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500/50 text-white ring-1 ring-emerald-500/50"
                            : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
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
              <div className="border-t border-slate-800/80" />

              {/* Section 2: Voice Output Language (Speaker / Read-Aloud) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Voice Output Language</h4>
                      <p className="text-[11px] text-slate-400">Voice synthesizer accent and dialect used for read-aloud</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-sky-400">
                    {resolveDisplayName(outputLanguage, false)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Auto option */}
                  <button
                    onClick={() => onSelectOutputLanguage("auto")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      outputLanguage === "auto"
                        ? "bg-sky-500/15 border-sky-500/50 text-white ring-1 ring-sky-500/50"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Auto (Response Match)</span>
                      {outputLanguage === "auto" && <Check className="w-3.5 h-3.5 text-sky-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Matches AI reply language
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
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-sky-500/15 border-sky-500/50 text-white ring-1 ring-sky-500/50"
                            : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{l.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{l.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Test Voice Button */}
                <div className="pt-2 flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-300">
                    <span className="font-semibold text-white">Sample Preview: </span>
                    <span className="text-slate-400">Hear the selected output voice speak</span>
                  </div>

                  {isSpeakingTest ? (
                    <button
                      onClick={onStopTestVoice}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 text-xs font-medium transition-colors"
                    >
                      <Square className="w-3.5 h-3.5 fill-rose-300" />
                      <span>Stop Voice</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onTestVoice(outputLanguage, getTestSentence(outputLanguage))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Test Output Voice</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Speech Dynamics Tab */
            <div className="space-y-6">
              {/* Auto-Speak Toggle */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Auto-Speak Responses</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automatically read aloud WeatherGPT answers when queries complete
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleAutoSpeak}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    autoSpeak ? "bg-sky-500 justify-end" : "bg-slate-800 justify-start"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-sm block" />
                </button>
              </div>

              {/* Speech Speed / Rate */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Voice Playback Speed</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Adjust pacing for comfortable comprehension</p>
                  </div>
                  <span className="text-sm font-bold text-sky-400">{speechRate.toFixed(1)}x</span>
                </div>

                <div className="flex items-center gap-2">
                  {[0.8, 0.9, 1.0, 1.1, 1.2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => onChangeSpeechRate(rate)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        Math.abs(speechRate - rate) < 0.05
                          ? "bg-sky-500 text-white border-sky-400 font-bold"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {rate === 1.0 ? "1.0x Normal" : `${rate}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Engine Information */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>Dual Voice Architecture</span>
                </div>
                <p>
                  Speech-to-Text maps your selected voice input language to native browser ASR and Bhashini Dhruva pipelines.
                  Voice output translates meteorological units (e.g. °C, km/h, %) phonetically to match the chosen output voice.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Microphone: <strong className="text-white">{inputLanguage === "auto" ? "App Default" : getLanguageConfig(inputLanguage).name}</strong> • Speaker: <strong className="text-white">{outputLanguage === "auto" ? "Response Match" : getLanguageConfig(outputLanguage).name}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
