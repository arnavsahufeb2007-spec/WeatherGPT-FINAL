/**
 * Speech Formatter for WeatherGPT Spoken Output
 *
 * Prepares user-facing weather responses for natural, fluent Text-to-Speech playback:
 * - Strips markdown symbols (bold, headers, bullets, links, tables)
 * - Converts raw units (°C, km/h, %, hPa, mm) into natural spoken words
 * - Removes non-vocal emojis that cause synthesizer stuttering
 * - Removes any raw JSON, source IDs, or debug metadata
 * - Preserves all exact numerical figures (temperatures, probabilities, dates, warnings)
 */

export function formatSpokenWeatherResponse(rawText: string, languageCode: string = "en"): string {
  if (!rawText) return "";

  let text = rawText;

  // 1. Remove JSON or code blocks if any
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/`([^`]+)`/g, "$1");

  // 2. Remove markdown tables
  text = text.replace(/^\|.*\|$/gm, "");

  // 3. Remove markdown headers (#, ##, ###)
  text = text.replace(/^#{1,6}\s+/gm, "");

  // 4. Remove horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, "");

  // 5. Remove bold, italic, and strikethrough markdown
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/\*(.*?)\*/g, "$1");
  text = text.replace(/__(.*?)__/g, "$1");
  text = text.replace(/_(.*?)_/g, "$1");
  text = text.replace(/~~(.*?)~~/g, "$1");

  // 6. Convert bullet lists and numbered lists into continuous natural pauses
  text = text.replace(/^\s*[-*•]\s+/gm, ". ");
  text = text.replace(/^\s*\d+\.\s+/gm, ". ");

  // 7. Remove markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 8. Remove common emojis and variation selectors that speech synthesizers enunciate clumsily
  text = text.replace(
    /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\uFE0E\uFE0F\u200D]/gu,
    ""
  );

  // 9. Language-aware unit enunciation for Indian, Hinglish, and International languages
  const lang = languageCode.toLowerCase().trim();

  // Language unit dictionary
  const UNIT_MAP: Record<string, { c: string; f: string; speed: string; pct: string; mm: string; hpa?: string }> = {
    hi: {
      c: "डिग्री सेल्सियस",
      f: "डिग्री फारेनहाइट",
      speed: "किलोमीटर प्रति घंटा",
      pct: "प्रतिशत",
      mm: "मिलीमीटर",
      hpa: "हेक्टोपास्कल",
    },
    hinglish: {
      c: "degree Celsius",
      f: "degree Fahrenheit",
      speed: "kilometer per hour",
      pct: "percent",
      mm: "millimeter",
      hpa: "hectopascals",
    },
    bn: {
      c: "ডিগ্রি সেলসিয়াস",
      f: "ডিগ্রি ফারেনহাইট",
      speed: "কিলোমিটার প্রতি ঘণ্টা",
      pct: "শতাংশ",
      mm: "মিলিমিটার",
    },
    te: {
      c: "డిగ్రీల సెల్సియస్",
      f: "డిగ్రీల ఫారెన్‌హీట్",
      speed: "కిలోమీటర్ల వేగం",
      pct: "శాతం",
      mm: "మిల్లీమీటర్లు",
    },
    ta: {
      c: "டிகிரி செல்சியஸ்",
      f: "டிகிரி பாரன்ஹீட்",
      speed: "கிலோமீட்டர் வேகம்",
      pct: "சதவீதம்",
      mm: "மில்லிமீட்டர்",
    },
    mr: {
      c: "डिग्री सेल्सिअस",
      f: "डिग्री फॅरनहाइट",
      speed: "किलोमीटर प्रति तास",
      pct: "टक्के",
      mm: "मिलीमीटर",
    },
    gu: {
      c: "ડિગ્રી સેલ્સિયસ",
      f: "ડિગ્રી ફેરનહીટ",
      speed: "કિલોમીટર પ્રતિ કલાક",
      pct: "ટકા",
      mm: "મિલીમીટર",
    },
    kn: {
      c: "ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್",
      f: "ಡಿಗ್ರಿ ಫ್ಯಾರನ್‌ಹೀಟ್",
      speed: "ಕಿಲೋಮೀಟರ್ ವೇಗ",
      pct: "ಶೇಕಡಾ",
      mm: "ಮಿಲಿಮೀಟರ್",
    },
    ml: {
      c: "ഡിഗ്രി സെൽഷ്യസ്",
      f: "ഡിഗ്രി ഫാരൻഹീറ്റ്",
      speed: "കിലോമീറ്റർ വേഗത",
      pct: "ശതമാനം",
      mm: "മില്ലിമീറ്റർ",
    },
    pa: {
      c: "ਡਿਗਰੀ ਸੈਲਸੀਅਸ",
      f: "ਡਿਗਰੀ ਫਾਰਨਹੀਟ",
      speed: "ਕਿਲੋਮੀਟਰ ਪ੍ਰਤੀ ਘੰਟਾ",
      pct: "ਪ੍ਰਤੀਸ਼ਤ",
      mm: "ਮਿਲੀਮੀਟਰ",
    },
    as: {
      c: "ডিগ্ৰী ছেলছিয়াছ",
      f: "ডিগ্ৰী ফাৰেনহাইট",
      speed: "কিলোমিটাৰ প্ৰতি ঘণ্টা",
      pct: "শতাংশ",
      mm: "মিলিমিটাৰ",
    },
    or: {
      c: "ଡିଗ୍ରୀ ସେଲସିଅସ",
      f: "ଡିଗ୍ରୀ ଫାରେନହାଇଟ",
      speed: "କିଲୋମିଟର ପ୍ରତି ଘଣ୍ଟା",
      pct: "ପ୍ରତିଶତ",
      mm: "ମିଲିମିଟର",
    },
    ur: {
      c: "ڈگری سینٹی گریڈ",
      f: "ڈگری فارن ہائیٹ",
      speed: "کلومیٹر فی گھنٹہ",
      pct: "فیصد",
      mm: "ملی میٹر",
    },
    ne: {
      c: "डिग्री सेल्सियस",
      f: "डिग्री फरेनहाइट",
      speed: "किलोमीटर प्रति घण्टा",
      pct: "प्रतिशत",
      mm: "मिलिमिटर",
    },
    sd: {
      c: "ڊگري سينٽي گريڊ",
      f: "ڊگري فارن هائيٽ",
      speed: "ڪلوميٽر في ڪلاڪ",
      pct: "سئوڪڙو",
      mm: "ملي ميٽر",
    },
    es: {
      c: "grados Celsius",
      f: "grados Fahrenheit",
      speed: "kilómetros por hora",
      pct: "por ciento",
      mm: "milímetros",
    },
    fr: {
      c: "degrés Celsius",
      f: "degrés Fahrenheit",
      speed: "kilomètres par heure",
      pct: "pour cent",
      mm: "millimètres",
    },
    de: {
      c: "Grad Celsius",
      f: "Grad Fahrenheit",
      speed: "Kilometer pro Stunde",
      pct: "Prozent",
      mm: "Millimeter",
    },
    ja: {
      c: "度",
      f: "華氏度",
      speed: "キロメートル毎時",
      pct: "パーセント",
      mm: "ミリメートル",
    },
    zh: {
      c: "摄氏度",
      f: "华氏度",
      speed: "公里每小时",
      pct: "百分之",
      mm: "毫米",
    },
    ar: {
      c: "درجة مئوية",
      f: "درجة فهرنهايت",
      speed: "كيلومتر في الساعة",
      pct: "بالمئة",
      mm: "ملم",
    },
    ru: {
      c: "градусов Цельсия",
      f: "градусов Фаренгейта",
      speed: "километров в час",
      pct: "процентов",
      mm: "миллиметров",
    },
    pt: {
      c: "graus Celsius",
      f: "graus Fahrenheit",
      speed: "quilômetros por hora",
      pct: "por cento",
      mm: "milímetros",
    },
  };

  const units = UNIT_MAP[lang] || {
    c: "degrees Celsius",
    f: "degrees Fahrenheit",
    speed: "kilometers per hour",
    pct: "percent",
    mm: "millimeters",
    hpa: "hectopascals",
  };

  text = text.replace(/(\d+(?:\.\d+)?)\s*°\s*C\b/gi, `$1 ${units.c}`);
  text = text.replace(/(\d+(?:\.\d+)?)\s*°\s*F\b/gi, `$1 ${units.f}`);
  text = text.replace(/(\d+(?:\.\d+)?)\s*km\/h\b/gi, `$1 ${units.speed}`);
  text = text.replace(/(\d+(?:\.\d+)?)\s*%/g, `$1 ${units.pct}`);
  text = text.replace(/(\d+(?:\.\d+)?)\s*mm\b/gi, `$1 ${units.mm}`);
  if (units.hpa) {
    text = text.replace(/(\d+(?:\.\d+)?)\s*hPa\b/gi, `$1 ${units.hpa}`);
  }

  // 10. Clean up duplicate punctuation and whitespace
  text = text.replace(/\.{2,}/g, ".");
  text = text.replace(/([.!?])\s*([.!?])/g, "$1");
  text = text.replace(/\s+/g, " ").trim();

  // 11. Normalize quotation marks and dashes
  text = text.replace(/[""]/g, '"');
  text = text.replace(/['']/g, "'");
  text = text.replace(/[—–]/g, ", ");

  return text;
}

/**
 * Splits text into natural sentence chunks for smooth speech synthesis playback,
 * preventing browser utterance timeouts on long paragraphs.
 */
export function splitIntoSpeechChunks(text: string, maxChunkLength: number = 180): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  if (text.length <= maxChunkLength) {
    return [text.trim()];
  }

  const sentences = text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + " " + trimmed).trim().length <= maxChunkLength) {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      if (trimmed.length > maxChunkLength) {
        // Fallback: split by commas or words if a single sentence is huge
        const subParts = trimmed.split(/,\s*/);
        let subChunk = "";
        for (const part of subParts) {
          if ((subChunk + ", " + part).trim().length <= maxChunkLength) {
            subChunk = subChunk ? `${subChunk}, ${part}` : part;
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = part;
          }
        }
        if (subChunk) chunks.push(subChunk);
        currentChunk = "";
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
