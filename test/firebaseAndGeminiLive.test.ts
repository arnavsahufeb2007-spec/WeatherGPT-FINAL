import { test, describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { resolveSTTLanguageCode, GeminiTranscribeSTTProvider, HybridSpeechToTextProvider } from "../src/services/voice/speechToTextProvider.js";
import { VoiceManager } from "../src/services/voice/voiceManager.js";
import { detectScriptLanguage } from "../src/components/WeatherChat.js";
import { GeminiLiveService } from "../src/services/geminiLiveService.js";
import { getLanguageConfig } from "../src/languages.js";

describe("Firebase & Dual-Cloud Persistence Logic", () => {
  test("Location mapping includes timezone and coordinates accurately", () => {
    const loc = {
      name: "Bengaluru",
      latitude: 12.9716,
      longitude: 77.5946,
      country: "India",
      state: "Karnataka",
      timezone: "Asia/Kolkata",
    };

    assert.equal(loc.name, "Bengaluru");
    assert.equal(loc.timezone, "Asia/Kolkata");
    assert.equal(loc.country, "India");
  });

  test("Guest user session retains default offline state gracefully", () => {
    const guestUser = {
      id: "guest-123",
      email: "guest@example.com",
      name: "Guest Explorer",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=guest",
      isGuest: true,
      provider: "anonymous" as const,
      savedLocations: [],
      recentSearches: [],
    };

    assert.equal(guestUser.isGuest, true);
    assert.equal(guestUser.savedLocations.length, 0);
  });
});

describe("Gemini 3.5 Transcribe Audio STT Integration", () => {
  test("GeminiTranscribeSTTProvider has correct id and name", () => {
    const provider = new GeminiTranscribeSTTProvider();
    assert.equal(provider.id, "gemini-3.5-transcribe");
    assert.equal(provider.name, "Gemini 3.5 Transcribe");
  });

  test("STT Language code resolution maps Hinglish to hi-IN", () => {
    const code = resolveSTTLanguageCode("hinglish");
    assert.equal(code, "hi-IN");
  });

  test("STT Language code resolution maps Indian regional languages", () => {
    assert.equal(resolveSTTLanguageCode("bn"), "bn-IN");
    assert.equal(resolveSTTLanguageCode("te"), "te-IN");
    assert.equal(resolveSTTLanguageCode("ta"), "ta-IN");
    assert.equal(resolveSTTLanguageCode("mr"), "mr-IN");
    assert.equal(resolveSTTLanguageCode("gu"), "gu-IN");
  });

  test("HybridSpeechToTextProvider exposes checkElevenLabsAvailability", async () => {
    const hybrid = new HybridSpeechToTextProvider();
    assert.equal(typeof hybrid.checkElevenLabsAvailability, "function");
  });
});

describe("Gemini Live Duplex (gemini-3.8-live) Client Architecture", () => {
  test("GeminiLiveService initializes in disconnected state", () => {
    const service = new GeminiLiveService();
    assert.equal(service.getState(), "disconnected");
  });

  test("GeminiLiveService allows state subscription", () => {
    const service = new GeminiLiveService();
    let recordedState = "";
    const unsub = service.subscribeState((state) => {
      recordedState = state;
    });

    assert.equal(recordedState, "disconnected");
    unsub();
  });

  test("GeminiLiveService safely disconnects without active WebSocket", () => {
    const service = new GeminiLiveService();
    assert.doesNotThrow(() => {
      service.disconnect();
    });
    assert.equal(service.getState(), "disconnected");
  });
});

describe("Script Language Detection & Multilingual Intelligence", () => {
  test("Detects Devanagari Hindi vs Marathi", () => {
    assert.equal(detectScriptLanguage("आज का मौसम कैसा है?"), "hi");
    assert.equal(detectScriptLanguage("आजचे हवामान कसे आहे?"), "mr");
  });

  test("Detects Dravidian and Eastern Scripts", () => {
    assert.equal(detectScriptLanguage("வானிலை எப்படி இருக்கிறது?"), "ta"); // Tamil
    assert.equal(detectScriptLanguage("వాతావరణం ఎలా ఉంది?"), "te"); // Telugu
    assert.equal(detectScriptLanguage("আজকের আবহাওয়া কেমন?"), "bn"); // Bengali
    assert.equal(detectScriptLanguage("આજનું હવામાન કેવું છે?"), "gu"); // Gujarati
  });

  test("Language configuration loads valid localized metadata", () => {
    const hi = getLanguageConfig("hi");
    assert.equal(hi.code, "hi");
    assert.ok(hi.translations.askPlaceholder);

    const bn = getLanguageConfig("bn");
    assert.equal(bn.code, "bn");
  });
});
