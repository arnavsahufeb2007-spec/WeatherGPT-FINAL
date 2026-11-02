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

export interface WeatherUnitDictionary {
  celsius: string;
  fahrenheit: string;
  degrees: string;
  speed: string;       // km/h
  distanceKm: string;  // km
  distanceM: string;   // m
  percent: string;     // %
  rainMm: string;      // mm
  rainRate: string;    // mm/h or mm/hr
  pressure: string;    // hPa
  outOf: string;       // / in scores
  plus: string;        // +
}

// Centralized pronunciation dictionary for all supported languages
const CENTRALIZED_UNIT_MAP: Record<string, WeatherUnitDictionary> = {
  en: {
    celsius: "degrees Celsius",
    fahrenheit: "degrees Fahrenheit",
    degrees: "degrees",
    speed: "kilometers per hour",
    distanceKm: "kilometers",
    distanceM: "meters",
    percent: "percent",
    rainMm: "millimeters",
    rainRate: "millimeters per hour",
    pressure: "hectopascals",
    outOf: "out of",
    plus: "plus",
  },
  hi: {
    celsius: "डिग्री सेल्सियस",
    fahrenheit: "डिग्री फारेनहाइट",
    degrees: "डिग्री",
    speed: "किलोमीटर प्रति घंटा",
    distanceKm: "किलोमीटर",
    distanceM: "मीटर",
    percent: "प्रतिशत",
    rainMm: "मिलीमीटर",
    rainRate: "मिलीमीटर प्रति घंटा",
    pressure: "हेक्टोपास्कल",
    outOf: "में से",
    plus: "से अधिक",
  },
  hinglish: {
    celsius: "degree Celsius",
    fahrenheit: "degree Fahrenheit",
    degrees: "degree",
    speed: "kilometer per hour",
    distanceKm: "kilometers",
    distanceM: "meters",
    percent: "percent",
    rainMm: "millimeter",
    rainRate: "millimeter per hour",
    pressure: "hectopascals",
    outOf: "out of",
    plus: "se zyada",
  },
  bn: {
    celsius: "ডিগ্রি সেলসিয়াস",
    fahrenheit: "ডিগ্রি ফারেনহাইট",
    degrees: "ডিগ্রি",
    speed: "কিলোমিটার প্রতি ঘণ্টা",
    distanceKm: "কিলোমিটার",
    distanceM: "মিটার",
    percent: "শতাংশ",
    rainMm: "মিলিমিটার",
    rainRate: "মিলিমিটার প্রতি ঘণ্টা",
    pressure: "হেক্টোপ্যাসকেল",
    outOf: "এর মধ্যে",
    plus: "এর বেশি",
  },
  te: {
    celsius: "డిగ్రీల సెల్సియస్",
    fahrenheit: "డిగ్రీల ఫారెన్‌హీట్",
    degrees: "డిగ్రీలు",
    speed: "కిలోమీటర్ల వేగం",
    distanceKm: "కిలోమీటర్లు",
    distanceM: "మీటర్లు",
    percent: "శాతం",
    rainMm: "మిల్లీమీటర్లు",
    rainRate: "గంటకు మిల్లీమీటర్లు",
    pressure: "హెక్టోపాస్కల్స్",
    outOf: "లో",
    plus: "కంటే ఎక్కువ",
  },
  ta: {
    celsius: "டிகிரி செல்சியஸ்",
    fahrenheit: "டிகிரி பாரன்ஹீட்",
    degrees: "டிகிரி",
    speed: "கிலோமீட்டர் வேகம்",
    distanceKm: "கிலோமீட்டர்",
    distanceM: "மீட்டர்",
    percent: "சதவீதம்",
    rainMm: "மில்லிமீட்டர்",
    rainRate: "மணிக்கு மில்லிமீட்டர்",
    pressure: "ஹெக்டோபாஸ்கல்",
    outOf: "இல்",
    plus: "க்கும் மேல்",
  },
  mr: {
    celsius: "डिग्री सेल्सिअस",
    fahrenheit: "डिग्री फॅरनहाइट",
    degrees: "डिग्री",
    speed: "किलोमीटर प्रति तास",
    distanceKm: "किलोमीटर",
    distanceM: "मीटर",
    percent: "टक्के",
    rainMm: "मिलीमीटर",
    rainRate: "मिलीमीटर प्रति तास",
    pressure: "हेक्टोपास्कल",
    outOf: "पैकी",
    plus: "पेक्षा जास्त",
  },
  gu: {
    celsius: "ડિગ્રી સેલ્સિયસ",
    fahrenheit: "ડિગ્રી ફેરનહીટ",
    degrees: "ડિગ્રી",
    speed: "કિલોમીટર પ્રતિ કલાક",
    distanceKm: "કિલોમીટર",
    distanceM: "મીટર",
    percent: "ટકા",
    rainMm: "મિલીમીટર",
    rainRate: "મિલીમીટર પ્રતિ કલાક",
    pressure: "હેક્ટોપાસ્કલ",
    outOf: "માંથી",
    plus: "થી વધુ",
  },
  kn: {
    celsius: "ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್",
    fahrenheit: "ಡಿಗ್ರಿ ಫ್ಯಾರನ್‌ಹೀಟ್",
    degrees: "ಡಿಗ್ರಿ",
    speed: "ಕಿಲೋಮೀಟರ್ ವೇಗ",
    distanceKm: "ಕಿಲೋಮೀಟರ್",
    distanceM: "ಮೀಟರ್",
    percent: "ಶೇಕಡಾ",
    rainMm: "ಮಿಲ್ಲಿಮೀಟರ್",
    rainRate: "ಗಂಟೆಗೆ ಮಿಲ್ಲಿಮೀಟರ್",
    pressure: "ಹೆಕ್ಟೋಪಾಸ್ಕಲ್",
    outOf: "ನಲ್ಲಿ",
    plus: "ಕ್ಕಿಂತ ಹೆಚ್ಚು",
  },
  ml: {
    celsius: "ഡിഗ്രി സെൽഷ്യസ്",
    fahrenheit: "ഡിഗ്രി ഫാരൻഹീറ്റ്",
    degrees: "ഡിഗ്രി",
    speed: "കിലോമീറ്റർ വേഗത",
    distanceKm: "കിലോമീറ്റർ",
    distanceM: "മീറ്റർ",
    percent: "ശതമാനം",
    rainMm: "മില്ലിമീറ്റർ",
    rainRate: "മണിക്കൂറിൽ മില്ലിമീറ്റർ",
    pressure: "ഹെക്ടോപാസ്കൽ",
    outOf: "ൽ",
    plus: "കൂടുതൽ",
  },
  pa: {
    celsius: "ਡਿਗਰੀ ਸੈਲਸੀਅਸ",
    fahrenheit: "ਡਿਗਰੀ ਫਾਰਨਹੀਟ",
    degrees: "ਡਿਗਰੀ",
    speed: "ਕਿਲੋਮੀਟਰ ਪ੍ਰਤੀ ਘੰਟਾ",
    distanceKm: "ਕਿਲੋਮੀਟਰ",
    distanceM: "ਮੀਟਰ",
    percent: "ਪ੍ਰਤੀਸ਼ਤ",
    rainMm: "ਮਿਲੀਮੀਟਰ",
    rainRate: "ਮਿਲੀਮੀਟਰ ਪ੍ਰਤੀ ਘੰਟਾ",
    pressure: "ਹੈਕਟੋਪਾਸਕਲ",
    outOf: "ਵਿੱਚੋਂ",
    plus: "ਤੋਂ ਵੱਧ",
  },
  as: {
    celsius: "ডিগ্ৰী ছেলছিয়াছ",
    fahrenheit: "ডিগ্ৰী ফাৰেনহাইট",
    degrees: "ডিগ্ৰী",
    speed: "কিলোমিটাৰ প্ৰতি ঘণ্টা",
    distanceKm: "কিলোমিটাৰ",
    distanceM: "মিটাৰ",
    percent: "শতাংশ",
    rainMm: "মিলিমিটাৰ",
    rainRate: "মিলিমিটাৰ প্ৰতি ঘণ্টা",
    pressure: "হেক্ট’পাস্কেল",
    outOf: "ৰ ভিতৰত",
    plus: "তকৈ অধিক",
  },
  or: {
    celsius: "ଡିଗ୍ରୀ ସେଲସିଅସ",
    fahrenheit: "ଡିଗ୍ରୀ ଫାରେନହାଇଟ",
    degrees: "ଡିଗ୍ରୀ",
    speed: "କିଲୋମିଟର ପ୍ରତି ଘଣ୍ଟା",
    distanceKm: "କିଲୋମିଟର",
    distanceM: "ମିଟର",
    percent: "ପ୍ରତିଶତ",
    rainMm: "ମିଲିମିଟର",
    rainRate: "ମିଲିମିଟର ପ୍ରତି ଘଣ୍ଟା",
    pressure: "ହେକ୍ଟୋପାସ୍କାଲ",
    outOf: "ମଧ୍ୟରୁ",
    plus: "ରୁ ଅଧିକ",
  },
  ur: {
    celsius: "ڈگری سینٹی گریڈ",
    fahrenheit: "ڈگری فارن ہائیٹ",
    degrees: "ڈگری",
    speed: "کلومیٹر فی گھنٹہ",
    distanceKm: "کلومیٹر",
    distanceM: "میٹر",
    percent: "فیصد",
    rainMm: "ملی میٹر",
    rainRate: "ملی میٹر فی گھنٹہ",
    pressure: "ہیکٹو پاسکل",
    outOf: "میں سے",
    plus: "سے زیادہ",
  },
  ne: {
    celsius: "डिग्री सेल्सियस",
    fahrenheit: "डिग्री फरेनहाइट",
    degrees: "डिग्री",
    speed: "किलोमीटर प्रति घण्टा",
    distanceKm: "किलोमीटर",
    distanceM: "मिटर",
    percent: "प्रतिशत",
    rainMm: "मिलिमिटर",
    rainRate: "मिलिमिटर प्रति घण्टा",
    pressure: "हेक्टोपास्कल",
    outOf: "मध्ये",
    plus: "भन्दा बढी",
  },
  sd: {
    celsius: "ڊگري سينٽي گريڊ",
    fahrenheit: "ڊگري فارن هائيٽ",
    degrees: "ڊگري",
    speed: "ڪلوميٽر في ڪلاڪ",
    distanceKm: "ڪلوميٽر",
    distanceM: "ميٽر",
    percent: "سئوڪڙو",
    rainMm: "ملي ميٽر",
    rainRate: "ملي ميٽر في ڪلاڪ",
    pressure: "هيڪٽوپاسڪل",
    outOf: "مان",
    plus: "کان وڌيڪ",
  },
  es: {
    celsius: "grados Celsius",
    fahrenheit: "grados Fahrenheit",
    degrees: "grados",
    speed: "kilómetros por hora",
    distanceKm: "kilómetros",
    distanceM: "metros",
    percent: "por ciento",
    rainMm: "milímetros",
    rainRate: "milímetros por hora",
    pressure: "hectopascales",
    outOf: "de",
    plus: "más",
  },
  fr: {
    celsius: "degrés Celsius",
    fahrenheit: "degrés Fahrenheit",
    degrees: "degrés",
    speed: "kilomètres par heure",
    distanceKm: "kilomètres",
    distanceM: "mètres",
    percent: "pour cent",
    rainMm: "millimètres",
    rainRate: "millimètres par heure",
    pressure: "hectopascals",
    outOf: "sur",
    plus: "plus",
  },
  de: {
    celsius: "Grad Celsius",
    fahrenheit: "Grad Fahrenheit",
    degrees: "Grad",
    speed: "Kilometer pro Stunde",
    distanceKm: "Kilometer",
    distanceM: "Meter",
    percent: "Prozent",
    rainMm: "Millimeter",
    rainRate: "Millimeter pro Stunde",
    pressure: "Hektopascal",
    outOf: "von",
    plus: "plus",
  },
  ja: {
    celsius: "度",
    fahrenheit: "華氏度",
    degrees: "度",
    speed: "キロメートル毎時",
    distanceKm: "キロメートル",
    distanceM: "メートル",
    percent: "パーセント",
    rainMm: "ミリメートル",
    rainRate: "ミリメートル毎時",
    pressure: "ヘクトパスカル",
    outOf: "分の",
    plus: "以上",
  },
  zh: {
    celsius: "摄氏度",
    fahrenheit: "华氏度",
    degrees: "度",
    speed: "公里每小时",
    distanceKm: "公里",
    distanceM: "米",
    percent: "百分之",
    rainMm: "毫米",
    rainRate: "毫米每小时",
    pressure: "百帕",
    outOf: "之",
    plus: "以上",
  },
  ar: {
    celsius: "درجة مئوية",
    fahrenheit: "درجة فهرنهايت",
    degrees: "درجة",
    speed: "كيلومتر في الساعة",
    distanceKm: "كيلومتر",
    distanceM: "متر",
    percent: "بالمئة",
    rainMm: "ملم",
    rainRate: "ملم في الساعة",
    pressure: "هكتوباسكال",
    outOf: "من",
    plus: "أكثر",
  },
  ru: {
    celsius: "градусов Цельсия",
    fahrenheit: "градусов Фаренгейта",
    degrees: "градусов",
    speed: "километров в час",
    distanceKm: "километров",
    distanceM: "метров",
    percent: "процентов",
    rainMm: "миллиметров",
    rainRate: "миллиметров в час",
    pressure: "гектопаскалей",
    outOf: "из",
    plus: "плюс",
  },
  pt: {
    celsius: "graus Celsius",
    fahrenheit: "graus Fahrenheit",
    degrees: "graus",
    speed: "quilômetros por hora",
    distanceKm: "quilômetros",
    distanceM: "metros",
    percent: "por cento",
    rainMm: "milímetros",
    rainRate: "milímetros por hora",
    pressure: "hectopascais",
    outOf: "de",
    plus: "mais",
  },
};

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

  // 9. Normalize any regional Indic numerals (Bengali, Gujarati, Devanagari, Telugu, etc.) to standard digits
  text = normalizeIndicDigits(text);

  // 10. Route to language-specific formatters before any English-specific expansion
  const rawLang = (languageCode || "en").toLowerCase().trim().replace(/_/g, "-");
  const primaryLang = rawLang.split("-")[0];
  const langKey = rawLang === "hinglish" ? "hinglish" : (CENTRALIZED_UNIT_MAP[rawLang] ? rawLang : (CENTRALIZED_UNIT_MAP[primaryLang] ? primaryLang : "en"));

  switch (langKey) {
    case "hi":
      return formatHindiSpeech(text);
    case "gu":
      return formatGujaratiSpeech(text);
    case "bn":
      return formatBengaliSpeech(text);
    case "te":
      return formatTeluguSpeech(text);
    case "ta":
      return formatTamilSpeech(text);
    case "mr":
      return formatMarathiSpeech(text);
    case "pa":
      return formatPunjabiSpeech(text);
    case "hinglish":
      return formatHinglishSpeech(text);
    case "en":
      return formatEnglishSpeech(text);
    default:
      return applyLanguageUnitFormatting(text, langKey);
  }
}

export function formatHindiSpeech(text: string): string {
  return applyLanguageUnitFormatting(text, "hi");
}

export function formatGujaratiSpeech(text: string): string {
  return applyLanguageUnitFormatting(text, "gu");
}

export function formatBengaliSpeech(text: string): string {
  return applyLanguageUnitFormatting(text, "bn");
}

export function formatTeluguSpeech(text: string): string {
  return applyLanguageUnitFormatting(text, "te");
}

export function formatTamilSpeech(text: string): string {
  return applyLanguageUnitFormatting(text, "ta");
}

export function formatMarathiSpeech(text: string): string {
  return applyLanguageUnitFormatting(text, "mr");
}

export function formatPunjabiSpeech(text: string): string {
  return applyLanguageUnitFormatting(text, "pa");
}

export function formatHinglishSpeech(text: string): string {
  return applyLanguageUnitFormatting(text, "hinglish");
}

export function formatEnglishSpeech(text: string): string {
  return applyLanguageUnitFormatting(text, "en");
}

const DECIMAL_WORDS: Record<string, string> = {
  hi: "दशमलव",
  hinglish: "point",
  bn: "দশমিক",
  te: "పాయింట్",
  ta: "புள்ளி",
  mr: "दशांश",
  gu: "પોઇન્ટ",
  kn: "ಪಾಯಿಂಟ್",
  ml: "പോയിന്റ്",
  pa: "ਪੁਆਇੰਟ",
  as: "দশমিক",
  or: "ଦଶମିକ",
  ur: "اعشاریہ",
  ne: "दशमलव",
  es: "punto",
  fr: "virgule",
  de: "Komma",
  ja: "点",
  zh: "点",
  ru: "и",
  pt: "ponto",
  ar: "فاصلة",
};

const RANGE_WORDS: Record<string, string> = {
  hi: "से",
  hinglish: "se",
  bn: "থেকে",
  te: "నుండి",
  ta: "முதல்",
  mr: "ते",
  gu: "થી",
  kn: "ಇಂದ",
  ml: "മുതൽ",
  pa: "ਤੋਂ",
  es: "a",
  fr: "à",
  de: "bis",
};

export const INDIAN_LANGUAGES_EXCEPT_ENGLISH = new Set([
  "hi",
  "hinglish",
  "bn",
  "te",
  "mr",
  "ta",
  "gu",
  "kn",
  "ml",
  "pa",
  "as",
  "or",
  "ur",
  "ne",
  "sd",
]);

export function isIndianLanguageExceptEnglish(langCode: string): boolean {
  if (!langCode) return false;
  const normalized = langCode.toLowerCase().trim().replace(/_/g, "-");
  if (normalized === "en" || normalized.startsWith("en-")) return false;
  if (INDIAN_LANGUAGES_EXCEPT_ENGLISH.has(normalized)) return true;
  const primary = normalized.split("-")[0];
  return INDIAN_LANGUAGES_EXCEPT_ENGLISH.has(primary);
}

export const INDIC_DIGIT_MAP: Record<string, string> = {
  // Devanagari
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
  // Bengali
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  // Gujarati
  "૦": "0", "૧": "1", "૨": "2", "૩": "3", "૪": "4", "૫": "5", "૬": "6", "૭": "7", "૮": "8", "૯": "9",
  // Gurmukhi
  "੦": "0", "੧": "1", "੨": "2", "੩": "3", "੪": "4", "੫": "5", "੬": "6", "੭": "7", "੮": "8", "੯": "9",
  // Odia
  "୦": "0", "୧": "1", "୨": "2", "୩": "3", "୪": "4", "୫": "5", "୬": "6", "୭": "7", "୮": "8", "୯": "9",
  // Telugu
  "౦": "0", "౧": "1", "౨": "2", "౩": "3", "౪": "4", "౫": "5", "౬": "6", "౭": "7", "౮": "8", "౯": "9",
  // Tamil
  "௦": "0", "௧": "1", "௨": "2", "௩": "3", "௪": "4", "௫": "5", "௬": "6", "௭": "7", "௮": "8", "௯": "9",
  // Kannada
  "೦": "0", "೧": "1", "೨": "2", "೩": "3", "೪": "4", "೫": "5", "೬": "6", "೭": "7", "೮": "8", "೯": "9",
  // Malayalam
  "൦": "0", "൧": "1", "൨": "2", "൩": "3", "൪": "4", "൫": "5", "൬": "6", "൭": "7", "൮": "8", "൯": "9",
};

export function normalizeIndicDigits(text: string): string {
  if (!text) return "";
  return text.replace(/[०-९০-৯૦-૯੦-੯୦-୯౦-౯௦-௯೦-೯൦-൯]/g, (char) => INDIC_DIGIT_MAP[char] || char);
}

export const HINDI_NUMBER_WORDS: Record<number, string> = {
  0: "शून्य",
  1: "एक",
  2: "दो",
  3: "तीन",
  4: "चार",
  5: "पांच",
  6: "छह",
  7: "सात",
  8: "आठ",
  9: "नौ",
  10: "दस",
  11: "ग्यारह",
  12: "बारह",
  13: "तेरह",
  14: "चौदह",
  15: "पंद्रह",
  16: "सोलह",
  17: "सत्रह",
  18: "अठारह",
  19: "उन्नीस",
  20: "बीस",
  21: "इक्कीस",
  22: "बाईस",
  23: "तेईस",
  24: "चौबीस",
  25: "पच्चीस",
  26: "छब्बीस",
  27: "सत्ताईस",
  28: "अट्ठाईस",
  29: "उनतीस",
  30: "तीस",
  31: "इकतीस",
  32: "बत्तीस",
  33: "तैंतीस",
  34: "चौंतीस",
  35: "पैंतीस",
  36: "छत्तीस",
  37: "सैंतीस",
  38: "अड़तीस",
  39: "उनतालीस",
  40: "चालीस",
  41: "इकतालीस",
  42: "बयालीस",
  43: "तैंतालीस",
  44: "चवालीस",
  45: "पैंतालीस",
  46: "छियालीस",
  47: "सैंतालीस",
  48: "अड़तालीस",
  49: "उनचास",
  50: "पचास",
  51: "इक्यावन",
  52: "बावन",
  53: "तिरपन",
  54: "चौवन",
  55: "पचपन",
  56: "छप्पन",
  57: "सत्तावन",
  58: "अट्ठावन",
  59: "उनसठ",
  60: "साठ",
  61: "इकसठ",
  62: "बासठ",
  63: "तिरसठ",
  64: "चौंसठ",
  65: "पैंसठ",
  66: "छियासठ",
  67: "सड़सठ",
  68: "अड़सठ",
  69: "उनहत्तर",
  70: "सत्तर",
  71: "इकहत्तर",
  72: "बहत्तर",
  73: "तिहत्तर",
  74: "चौहत्तर",
  75: "पचहत्तर",
  76: "छिहत्तर",
  77: "सतहत्तर",
  78: "अठहत्तर",
  79: "उनासी",
  80: "अस्सी",
  81: "इक्यासी",
  82: "बयासी",
  83: "तिरासी",
  84: "चौरासी",
  85: "पचासी",
  86: "छियासी",
  87: "सत्तासी",
  88: "अट्ठासी",
  89: "नवासी",
  90: "नब्बे",
  91: "इक्यानवे",
  92: "बानवे",
  93: "तिरानवे",
  94: "चौरानवे",
  95: "पचानवे",
  96: "छियानवे",
  97: "सत्तानवे",
  98: "अट्ठानवे",
  99: "निन्यानवे",
  100: "सौ",
};

export function integerToHindiWords(num: number): string {
  if (isNaN(num)) return "";
  if (num < 0) {
    return `माइनस ${integerToHindiWords(-num)}`;
  }
  if (num in HINDI_NUMBER_WORDS) {
    return HINDI_NUMBER_WORDS[num];
  }
  if (num < 1000) {
    const hundreds = Math.floor(num / 100);
    const rem = num % 100;
    const hundredsPrefix = hundreds === 1 ? "एक सौ" : `${HINDI_NUMBER_WORDS[hundreds] || hundreds} सौ`;
    return rem > 0 ? `${hundredsPrefix} ${integerToHindiWords(rem)}` : hundredsPrefix;
  }
  if (num < 100000) {
    const thousands = Math.floor(num / 1000);
    const rem = num % 1000;
    const thousandsPrefix = `${integerToHindiWords(thousands)} हजार`;
    return rem > 0 ? `${thousandsPrefix} ${integerToHindiWords(rem)}` : thousandsPrefix;
  }
  if (num < 10000000) {
    const lakhs = Math.floor(num / 100000);
    const rem = num % 100000;
    const lakhsPrefix = `${integerToHindiWords(lakhs)} लाख`;
    return rem > 0 ? `${lakhsPrefix} ${integerToHindiWords(rem)}` : lakhsPrefix;
  }
  const crores = Math.floor(num / 10000000);
  const rem = num % 10000000;
  const croresPrefix = `${integerToHindiWords(crores)} करोड़`;
  return rem > 0 ? `${croresPrefix} ${integerToHindiWords(rem)}` : croresPrefix;
}

export function convertNumericDataToHindiVoice(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Time formats: e.g. 14:30 -> चौदह बजकर तीस मिनट, 06:05 -> छह बजकर पांच मिनट
  result = result.replace(/\b(\d{1,2}):(\d{2})\b/g, (_m, h, min) => {
    const hNum = parseInt(h, 10);
    const mNum = parseInt(min, 10);
    const hWord = integerToHindiWords(hNum);
    const mWord = mNum === 0 ? "बजे" : `बजकर ${integerToHindiWords(mNum)} मिनट`;
    return `${hWord} ${mWord}`;
  });

  // 2. Negative numbers e.g. -5 -> माइनस पांच
  result = result.replace(/(?<=\s|^)-(\d+)\b/g, (_m, numStr) => {
    const num = parseInt(numStr, 10);
    return `माइनस ${integerToHindiWords(num)}`;
  });

  // 3. Standalone integers (including integers preceding units)
  result = result.replace(/\b\d+\b/g, (match) => {
    const num = parseInt(match, 10);
    if (isNaN(num)) return match;
    return integerToHindiWords(num);
  });

  return result;
}

function applyLanguageUnitFormatting(text: string, lang: string): string {
  const units = CENTRALIZED_UNIT_MAP[lang] || CENTRALIZED_UNIT_MAP.en;

  // Enunciate compound and speed units first (e.g. 20 km/h -> 20 kilometers per hour / 20 किलोमीटर प्रति घंटा)
  text = text.replace(
    /(\d+(?:\.\d+)?)\s*(?:km\s*\/\s*(?:h|hr|hour)s?|kmph|kph|kmh|kilometers?\s*per\s*hour|kilometres?\s*per\s*hour)\b/gi,
    `$1 ${units.speed}`
  );
  text = text.replace(/(\d+(?:\.\d+)?)\s*(?:mm\s*\/\s*(?:h|hr|hour)s?)\b/gi, `$1 ${units.rainRate}`);

  // Enunciate temperature units
  text = text.replace(/(\d+(?:\.\d+)?)\s*°\s*C\b/gi, `$1 ${units.celsius}`);
  text = text.replace(/(\d+(?:\.\d+)?)\s*°\s*F\b/gi, `$1 ${units.fahrenheit}`);
  text = text.replace(/(\d+(?:\.\d+)?)\s*°\b/g, `$1 ${units.degrees}`);

  // Enunciate distance units: "12 km" -> "12 kilometers" / "12 કિલોમીટર" / "12 किलोमीटर"
  text = text.replace(/(\d+(?:\.\d+)?)\s*(?:kms?)\b/gi, `$1 ${units.distanceKm}`);

  // Enunciate rain depth (mm)
  text = text.replace(/(\d+(?:\.\d+)?)\s*(?:mms?)\b/gi, `$1 ${units.rainMm}`);

  // Enunciate atmospheric pressure (hPa, mb)
  text = text.replace(/(\d+(?:\.\d+)?)\s*(?:hPa|mb|mbar)\b/gi, `$1 ${units.pressure}`);

  // Enunciate percentages: "96%" -> "96 percent" / "96 ટકા" / "96 प्रतिशत"
  text = text.replace(/(\d+(?:\.\d+)?)\s*%/g, `$1 ${units.percent}`);

  // Enunciate score ratios: "80/100" -> "80 out of 100" / "80 માંથી 100" / "80 में से 100"
  text = text.replace(/(\d+)\s*\/\s*(\d+)/g, `$1 ${units.outOf} $2`);

  // Enunciate plus markers: "40+" -> "40 plus" / "40 થી વધુ" / "40 से अधिक"
  text = text.replace(/(\d+)\+/g, `$1 ${units.plus}`);

  // Natural spoken decimal pronunciation based on language
  if (lang !== "en") {
    const decimalSeparator = DECIMAL_WORDS[lang];
    if (decimalSeparator) {
      text = text.replace(/(\d+)\.(\d+)/g, `$1 ${decimalSeparator} $2`);
    }
  }

  // Natural range pronunciation based on language
  const rangeWord = RANGE_WORDS[lang] || (lang === "en" ? "to" : "");
  if (rangeWord) {
    text = text.replace(/(\d+)\s*[-–—]\s*(\d+)/g, `$1 ${rangeWord} $2`);
  }

  // Convert numeric data to Hindi spoken words only for Hindi and Hinglish
  // Other regional languages (Gujarati, Bengali, Tamil, Telugu, Marathi, Punjabi, etc.)
  // retain their own natural-language numeric text and authentic regional units.
  if (lang === "hi" || lang === "hinglish" || lang.startsWith("hi-")) {
    text = convertNumericDataToHindiVoice(text);
  }

  // Clean up duplicate punctuation while preserving Indic sentence terminators (। and ॥)
  text = text.replace(/\.{2,}/g, ".");
  text = text.replace(/([.!?।॥])\s*([.!?।॥])/g, "$1");
  text = text.replace(/\s+/g, " ").trim();

  // Normalize quotation marks and dashes
  text = text.replace(/[""]/g, '"');
  text = text.replace(/['']/g, "'");
  text = text.replace(/[—–]/g, ", ");

  return text;
}

/**
 * Splits text into natural sentence chunks for smooth speech synthesis playback,
 * supporting Indic sentence delimiters (। and ॥) alongside Western (. ! ?),
 * preventing browser utterance timeouts while preserving numbers and Unicode grapheme integrity.
 */
export function splitIntoSpeechChunks(text: string, maxChunkLength: number = 180): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  const trimmed = text.trim();
  if (trimmed.length <= maxChunkLength) {
    return [trimmed];
  }

  // Split on sentence boundaries: ! ? । ॥ or . not between digits, followed by whitespace
  const rawSentences = trimmed
    .split(/(?<=[!?।॥]|(?<!\d)\.(?!\d))\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of rawSentences) {
    if ((currentChunk + " " + sentence).trim().length <= maxChunkLength) {
      currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      if (sentence.length > maxChunkLength) {
        // Split by clause boundaries (commas, semicolons, dashes)
        const subParts = sentence.split(/(?<=[,;،])\s+/);
        let subChunk = "";
        for (const part of subParts) {
          if ((subChunk + " " + part).trim().length <= maxChunkLength) {
            subChunk = subChunk ? `${subChunk} ${part}` : part;
          } else {
            if (subChunk) chunks.push(subChunk);
            // If even a clause exceeds maxChunkLength, split safely on word boundaries
            // to ensure Unicode words and grapheme clusters are NEVER cut mid-character
            if (part.length > maxChunkLength) {
              const words = part.split(/\s+/);
              let wordChunk = "";
              for (const word of words) {
                if ((wordChunk + " " + word).trim().length <= maxChunkLength) {
                  wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
                } else {
                  if (wordChunk) chunks.push(wordChunk);
                  wordChunk = word;
                }
              }
              if (wordChunk) subChunk = wordChunk;
              else subChunk = "";
            } else {
              subChunk = part;
            }
          }
        }
        if (subChunk) chunks.push(subChunk);
        currentChunk = "";
      } else {
        currentChunk = sentence;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
