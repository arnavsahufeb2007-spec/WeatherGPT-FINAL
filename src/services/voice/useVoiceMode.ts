import { useState, useEffect, useCallback, useRef } from "react";
import { VoiceState, VoiceError, STTRecognitionResult, VoiceSettings } from "./types";
import { defaultVoiceManager, VoiceManager } from "./voiceManager";

export function useVoiceMode(language: string = "en", manager: VoiceManager = defaultVoiceManager) {
  const [voiceState, setVoiceState] = useState<VoiceState>(manager.getState());
  const [settings, setSettings] = useState<VoiceSettings>(manager.getSettings());
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [error, setError] = useState<VoiceError | null>(null);
  const onFinalCallbackRef = useRef<((text: string) => void) | null>(null);

  // Subscribe to state and settings updates
  useEffect(() => {
    const unsubState = manager.subscribeState((newState) => {
      setVoiceState(newState);
      if (newState === "idle") {
        setInterimTranscript("");
      }
    });

    const unsubError = manager.subscribeError((newErr) => {
      setError(newErr);
    });

    const unsubSettings = manager.subscribeSettings((newSettings) => {
      setSettings({ ...newSettings });
    });

    return () => {
      unsubState();
      unsubError();
      unsubSettings();
    };
  }, [manager]);

  const effectiveInputLanguage = manager.getEffectiveInputLanguage(language);
  const effectiveOutputLanguage = manager.getEffectiveOutputLanguage(language);

  const startListening = useCallback(
    (onFinalTranscript?: (text: string) => void, overrideInputLang?: string) => {
      onFinalCallbackRef.current = onFinalTranscript || null;
      setInterimTranscript("");
      setError(null);

      manager.startListening(
        language,
        (res: STTRecognitionResult) => {
          setInterimTranscript(res.transcript);
          if (res.isFinal && res.transcript.trim()) {
            if (onFinalCallbackRef.current) {
              onFinalCallbackRef.current(res.transcript.trim());
            }
          }
        },
        (err) => {
          setError(err);
        },
        overrideInputLang
      );
    },
    [language, manager]
  );

  const stopListening = useCallback(() => {
    manager.stopListening();
  }, [manager]);

  const speak = useCallback(
    async (text: string, overrideLanguage?: string, force: boolean = false) => {
      await manager.speakResponse(text, overrideLanguage || language, force);
    },
    [language, manager]
  );

  const stopSpeaking = useCallback(() => {
    manager.stopSpeaking();
  }, [manager]);

  const setProcessing = useCallback(() => {
    manager.setProcessing();
  }, [manager]);

  const toggleAutoSpeak = useCallback(() => {
    const newVal = !settings.autoSpeak;
    manager.saveSettings({ autoSpeak: newVal });
  }, [settings.autoSpeak, manager]);

  const setInputLanguage = useCallback(
    (code: string) => {
      manager.setInputLanguage(code);
    },
    [manager]
  );

  const setOutputLanguage = useCallback(
    (code: string) => {
      manager.setOutputLanguage(code);
    },
    [manager]
  );

  const setSpeechRate = useCallback(
    (rate: number) => {
      manager.saveSettings({ speechRate: rate });
    },
    [manager]
  );

  const resetVoiceLanguages = useCallback(() => {
    manager.saveSettings({ inputLanguage: "auto", outputLanguage: "auto" });
  }, [manager]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const support = manager.isVoiceSupported();

  return {
    voiceState,
    isListening: voiceState === "listening",
    isSpeaking: voiceState === "speaking",
    isProcessing: voiceState === "processing",
    isError: voiceState === "error",
    isSupported: support.stt || support.tts,
    sttSupported: support.stt,
    ttsSupported: support.tts,
    interimTranscript,
    error,
    settings,
    autoSpeak: settings.autoSpeak,
    inputLanguage: settings.inputLanguage,
    outputLanguage: settings.outputLanguage,
    effectiveInputLanguage,
    effectiveOutputLanguage,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    setProcessing,
    toggleAutoSpeak,
    setInputLanguage,
    setOutputLanguage,
    setSpeechRate,
    resetVoiceLanguages,
    clearError,
  };
}
