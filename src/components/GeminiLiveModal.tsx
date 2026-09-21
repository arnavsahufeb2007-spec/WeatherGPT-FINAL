import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Mic,
  MicOff,
  Radio,
  Sparkles,
  Volume2,
  VolumeX,
  MessageSquare,
  Send,
  AlertCircle,
  Activity,
  Zap,
} from "lucide-react";
import {
  geminiLiveService,
  LiveConnectionState,
  LiveTranscriptItem,
} from "../services/geminiLiveService.js";

interface GeminiLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferredLanguage?: string;
  currentLocationName?: string;
}

export function GeminiLiveModal({
  isOpen,
  onClose,
  preferredLanguage = "en",
  currentLocationName,
}: GeminiLiveModalProps) {
  const [state, setState] = useState<LiveConnectionState>("disconnected");
  const [transcripts, setTranscripts] = useState<LiveTranscriptItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [textInput, setTextInput] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      geminiLiveService.disconnect();
      return;
    }

    // Auto-connect when modal opens
    geminiLiveService.connect();

    const unsubState = geminiLiveService.subscribeState((newState) => {
      setState(newState);
    });

    const unsubTranscript = geminiLiveService.subscribeTranscript((item) => {
      setTranscripts((prev) => [...prev, item]);
    });

    const unsubError = geminiLiveService.subscribeError((err) => {
      setErrorMessage(err);
    });

    const unsubVol = geminiLiveService.subscribeVolume((vol) => {
      setVolume(vol);
    });

    return () => {
      unsubState();
      unsubTranscript();
      unsubError();
      unsubVol();
      geminiLiveService.disconnect();
    };
  }, [isOpen]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  if (!isOpen) return null;

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    geminiLiveService.sendTextMessage(textInput);
    setTextInput("");
  };

  const isConnected = state === "connected" || state === "listening" || state === "speaking";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400">
              <Zap className="w-5 h-5" />
              {isConnected && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-wide">
                  Gemini Live • Voice Assistant
                </h3>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  gemini-3.8-live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentLocationName ? `Live weather context for ${currentLocationName}` : "Real-time duplex conversational weather intelligence"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Live Session"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visualizer Canvas & Status Banner */}
        <div className="relative flex flex-col items-center justify-center px-6 py-8 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800/80">
          {/* Animated Central Sphere */}
          <div className="relative flex items-center justify-center my-4">
            {/* Pulsing rings */}
            <div
              className={`absolute rounded-full transition-all duration-300 ${
                state === "speaking"
                  ? "bg-cyan-500/20 w-36 h-36 animate-pulse"
                  : state === "listening"
                  ? "bg-emerald-500/20 w-32 h-32"
                  : "bg-slate-700/10 w-24 h-24"
              }`}
              style={{
                transform: `scale(${1 + volume * 0.8})`,
              }}
            />
            <div
              className={`absolute rounded-full transition-all duration-300 ${
                state === "speaking"
                  ? "bg-blue-500/30 w-28 h-28"
                  : state === "listening"
                  ? "bg-emerald-500/30 w-24 h-24"
                  : "bg-slate-800/20 w-20 h-20"
              }`}
              style={{
                transform: `scale(${1 + volume * 0.4})`,
              }}
            />

            {/* Core mic button / indicator */}
            <button
              onClick={() => {
                if (isConnected) {
                  geminiLiveService.disconnect();
                } else {
                  geminiLiveService.connect();
                }
              }}
              className={`relative z-10 flex items-center justify-center w-20 h-20 rounded-full shadow-lg transition-transform active:scale-95 ${
                state === "speaking"
                  ? "bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-cyan-500/30"
                  : state === "listening"
                  ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30 animate-bounce"
                  : state === "connecting"
                  ? "bg-amber-600 text-white animate-spin"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
              }`}
            >
              {state === "speaking" ? (
                <Volume2 className="w-8 h-8 animate-pulse" />
              ) : isConnected ? (
                <Mic className="w-8 h-8" />
              ) : (
                <MicOff className="w-8 h-8" />
              )}
            </button>
          </div>

          {/* Status Text & Hint */}
          <div className="text-center mt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  state === "speaking"
                    ? "bg-cyan-400 animate-ping"
                    : state === "listening"
                    ? "bg-emerald-400 animate-pulse"
                    : state === "connecting"
                    ? "bg-amber-400 animate-spin"
                    : "bg-rose-500"
                }`}
              />
              <span className="text-slate-200 uppercase tracking-wider text-[10px]">
                {state === "speaking"
                  ? "Gemini Speaking (Speak to Interrupt)"
                  : state === "listening"
                  ? "Listening to your voice..."
                  : state === "connecting"
                  ? "Connecting to Gemini Live API..."
                  : state === "error"
                  ? "Error connecting"
                  : "Disconnected"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Speak naturally into your microphone. Say e.g. "What is the weather right now?" or "Will it rain tomorrow?"
            </p>
          </div>

          {errorMessage && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Live Conversation Transcript Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px] max-h-[260px] bg-slate-950/40">
          {transcripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-6 text-slate-500">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">Live conversation transcripts will stream here in real-time.</p>
            </div>
          ) : (
            transcripts.map((t) => (
              <div
                key={t.id}
                className={`flex flex-col ${t.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-medium text-slate-400">
                    {t.sender === "user" ? "You" : "Gemini Live"}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                    t.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/70"
                  }`}
                >
                  {t.text}
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Text Input Fallback Bar */}
        <form onSubmit={handleSendText} className="flex items-center gap-2 p-3 bg-slate-900 border-t border-slate-800">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isConnected ? "Type or speak to Gemini Live..." : "Connect first to chat..."}
            disabled={!isConnected}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isConnected || !textInput.trim()}
            className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 disabled:hover:bg-cyan-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
