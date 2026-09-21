/**
 * Dedicated TTS preprocessor for Hinglish (Roman-script Hindi/English).
 * Applied strictly to audio utterance synthesis; does not alter chat display text.
 */

// Acronyms that should legitimately be spelled letter-by-letter
const PRESERVED_ACRONYMS = new Set([
  "UV", "GPS", "AQI", "AM", "PM", "IST", "UTC", "API", "AI", "URL", "ID", "SMS"
]);

export function prepareHinglishForTts(text: string): string {
  if (!text) return "";

  // 1. Strip Markdown syntax that disrupts cadence
  let speech = text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#+\s+/g, "");

  // 2. Prevent ALL-CAPS words (e.g., "SIRF", "AAP") from being spelled out letter-by-letter
  speech = speech.replace(/\b[A-Z]{2,}\b/g, (match) => {
    if (PRESERVED_ACRONYMS.has(match)) {
      return match;
    }
    return match.toLowerCase();
  });

  // 3. Expand weather units into natural speech words while preserving numbers
  speech = speech
    .replace(/(\d+(?:\.\d+)?)\s*°\s*C\b/gi, "$1 degrees Celsius")
    .replace(/(\d+(?:\.\d+)?)\s*km\/h\b/gi, "$1 kilometers per hour")
    .replace(/(\d+(?:\.\d+)?)\s*mm\b/gi, "$1 millimeters")
    .replace(/(\d+)\s*%/g, "$1 percent");

  return speech.trim();
}
