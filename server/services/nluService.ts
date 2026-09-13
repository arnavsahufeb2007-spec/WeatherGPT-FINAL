import { ActivityType, ConversationContext } from "../types.js";

export interface ParsedIntent {
  intent: "weather_current" | "weather_forecast" | "activity" | "travel" | "comparison" | "rain_check" | "general_qa";
  language: string;
  detectedLocations: string[];
  travelDetails?: {
    origin: string;
    destination: string;
    mode: "car" | "bike" | "bus" | "train" | "flight";
  };
  comparisonLocations?: string[];
  activity?: ActivityType;
  timeContext?: {
    isTomorrow: boolean;
    isDayAfterTomorrow: boolean;
    timeOfDay?: "morning" | "afternoon" | "evening" | "night";
    targetHour?: number;
  };
}

const KNOWN_INDIAN_LOCATIONS = [
  "delhi", "new delhi", "dilli", "mumbai", "bombay", "bangalore", "bengaluru",
  "chennai", "madras", "kolkata", "calcutta", "hyderabad", "pune", "ahmedabad",
  "jaipur", "lucknow", "chandigarh", "bhopal", "indore", "kochi", "cochin",
  "goa", "panaji", "shimla", "manali", "srinagar", "varanasi", "kashi",
  "patna", "surat", "nagpur", "guwahati", "mysore", "mysuru", "agra",
  "amritsar", "dehradun", "rishikesh", "udaipur", "jodhpur", "kanpur",
  "ranchi", "raipur", "coimbatore", "madurai", "visakhapatnam", "vizag"
];

const HINDI_HINGLISH_KEYWORDS = [
  "aaj", "kal", "parso", "subah", "dophar", "shaam", "raat", "barish", "barsaat",
  "garmi", "sardi", "thand", "dhoop", "mausam", "kaisa", "kaisi", "hogi", "hoga",
  "khel", "jaana", "gadi", "chale", "batao", "bataiye", "kya", "hai", "me", "mein",
  "kaisa rahega", "kitna", "tapman"
];

const NON_LOCATION_WORDS = new Set([
  // Common English verbs before "me" / "in" / "for"
  "give", "tell", "show", "send", "alert", "warn", "inform", "guide", "remind", "let", "help", "update", "provide",
  "bring", "email", "message", "text", "ask", "teach", "advise", "pass", "call", "find", "get", "see", "share",
  // Pronouns & determiners
  "the", "my", "this", "that", "these", "those", "our", "a", "an", "me", "us", "you", "them", "him", "her", "it",
  "what", "who", "which", "whose", "where", "how", "when", "why", "can", "will", "does", "is", "are", "was", "were",
  // Time and weather keywords
  "today", "tomorrow", "tonight", "yesterday", "morning", "afternoon", "evening", "night", "now", "current",
  "currently", "here", "there", "weekend", "week", "hour", "hours", "day", "days", "forecast", "weather", "rain",
  "chance", "chances", "probability", "precipitation", "temperature", "temp", "condition", "humidity", "wind",
  "summary", "status", "report", "details", "info", "overview", "advisory", "warning", "alert",
  // Hindi & Hinglish common words / stopwords
  "aaj", "kal", "parso", "subah", "dophar", "shaam", "raat", "ghar", "kaisa", "kaisi", "kaise", "hoga", "hogi",
  "batao", "bataiye", "dikhao", "dekh", "kya", "hai", "hain", "karna", "jana", "jaana", "safar", "yatra", "gadi",
  "chale", "chalna", "tapman", "mausam", "barish", "barsat", "hawa", "dhoop", "garmi", "sardi", "thand", "kuch"
]);

function isValidLocationCandidate(candidate: string): boolean {
  const cleaned = candidate.trim().toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "");
  if (!cleaned || cleaned.length < 3) return false;
  if (NON_LOCATION_WORDS.has(cleaned)) return false;
  // If words inside candidate contain purely stopwords
  const tokens = cleaned.split(/\s+/);
  if (tokens.every((t) => NON_LOCATION_WORDS.has(t))) return false;
  return true;
}

export function detectLanguageFromText(text: string): string {
  const lower = text.toLowerCase().trim();

  // Script-based detection
  if (/[\u0980-\u09FF]/.test(text)) return "bn"; // Bengali / Assamese
  if (/[\u0C00-\u0C7F]/.test(text)) return "te"; // Telugu
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta"; // Tamil
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu"; // Gujarati
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn"; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml"; // Malayalam
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa"; // Gurmukhi (Punjabi)
  if (/[\u0B00-\u0B7F]/.test(text)) return "or"; // Odia
  if (/[\u0600-\u06FF]/.test(text)) return "ur"; // Arabic / Urdu script
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Devanagari (Hindi, Marathi, Nepali)
  if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(text)) return "ja"; // Japanese
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return "ko"; // Korean
  if (/[\u0400-\u04FF]/.test(text)) return "ru"; // Cyrillic

  // Hinglish detection (Roman-script Hindi)
  const hindiWordCount = HINDI_HINGLISH_KEYWORDS.filter((kw) => new RegExp(`\\b${kw}\\b`, "i").test(lower)).length;
  if (hindiWordCount >= 1) return "hinglish";

  return "en";
}

export function parseQuery(query: string, context?: ConversationContext, preferredLanguage?: string): ParsedIntent {
  const lower = query.toLowerCase().trim();

  // 1. Language detection with fallback to preferredLanguage
  const detectedLang = detectLanguageFromText(query);
  const language = preferredLanguage || detectedLang;

  // 2. Time context
  const isTomorrow = /\b(tomorrow|kal)\b/i.test(lower) && !/\bkal raat\b/i.test(lower);
  const isDayAfterTomorrow = /\b(day after tomorrow|parso)\b/i.test(lower);
  let timeOfDay: ParsedIntent["timeContext"]["timeOfDay"] | undefined;
  if (/\b(morning|subah)\b/i.test(lower)) timeOfDay = "morning";
  else if (/\b(afternoon|dophar)\b/i.test(lower)) timeOfDay = "afternoon";
  else if (/\b(evening|shaam)\b/i.test(lower)) timeOfDay = "evening";
  else if (/\b(night|tonight|raat)\b/i.test(lower)) timeOfDay = "night";

  // Check for specific hour like 5pm, 6:00
  let targetHour: number | undefined;
  const hourMatch = lower.match(/\b([1-9]|1[0-2])\s*(am|pm)\b/i);
  if (hourMatch) {
    let h = parseInt(hourMatch[1], 10);
    const ampm = hourMatch[2].toLowerCase();
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    targetHour = h;
  }

  // 3. Location extraction
  const detectedLocations: string[] = [];

  // Match against known list
  for (const loc of KNOWN_INDIAN_LOCATIONS) {
    const regex = new RegExp(`\\b${loc}\\b`, "i");
    if (regex.test(lower)) {
      detectedLocations.push(loc);
    }
  }

  // Check for regex like "in <City>", "at <City>", "<City> me"
  const inCityMatch = lower.match(/\b(?:in|at|for|around)\s+([a-zA-Z\s]{3,25})(?:\s+weather|\s+today|\s+tomorrow|\?|$)/i);
  if (inCityMatch && inCityMatch[1]) {
    const candidate = inCityMatch[1].trim().toLowerCase();
    if (isValidLocationCandidate(candidate) && !detectedLocations.includes(candidate)) {
      detectedLocations.push(candidate);
    }
  }

  const hinglishCityMatch = lower.match(/\b([a-zA-Z]{3,20})\s+(?:mein|se|ka|ki|ke)\b/i);
  if (hinglishCityMatch && hinglishCityMatch[1]) {
    const candidate = hinglishCityMatch[1].trim().toLowerCase();
    if (isValidLocationCandidate(candidate) && !detectedLocations.includes(candidate)) {
      detectedLocations.push(candidate);
    }
  }

  // If no location found in text, inherit from conversation context
  if (detectedLocations.length === 0 && context?.currentLocation) {
    detectedLocations.push(context.currentLocation.name);
  }

  // 4. Intent detection: Travel
  const travelMatch = lower.match(/(?:from|se)\s+([a-zA-Z\s]+?)\s+(?:to|tak)\s+([a-zA-Z\s]+?)(?:\s+(?:by|on|via)\s+(car|bike|bus|train|flight))?(?:\?|$|\s+weather)/i);
  const travelKeywords = /\b(travel|trip|drive|driving|road trip|route|ride|journey|yatra|safar)\b/i.test(lower);

  if (travelMatch) {
    const origin = travelMatch[1].trim();
    const destination = travelMatch[2].trim();
    const mode = (travelMatch[3]?.toLowerCase() as any) || (/\bbike|motorcycle|scooter\b/i.test(lower) ? "bike" : /\btrain\b/i.test(lower) ? "train" : /\bflight|air\b/i.test(lower) ? "flight" : "car");
    return {
      intent: "travel",
      language,
      detectedLocations: [origin, destination],
      travelDetails: { origin, destination, mode },
      timeContext: { isTomorrow, isDayAfterTomorrow, timeOfDay, targetHour },
    };
  } else if (travelKeywords && detectedLocations.length >= 2) {
    return {
      intent: "travel",
      language,
      detectedLocations,
      travelDetails: {
        origin: detectedLocations[0],
        destination: detectedLocations[1],
        mode: /\bbike|motorcycle\b/i.test(lower) ? "bike" : /\btrain\b/i.test(lower) ? "train" : "car",
      },
      timeContext: { isTomorrow, isDayAfterTomorrow, timeOfDay, targetHour },
    };
  }

  // 5. Intent detection: Comparison
  const comparisonKeywords = /\b(vs|versus|compare|or|difference between|farq)\b/i.test(lower);
  if (comparisonKeywords && detectedLocations.length >= 2) {
    return {
      intent: "comparison",
      language,
      detectedLocations,
      comparisonLocations: detectedLocations,
      timeContext: { isTomorrow, isDayAfterTomorrow, timeOfDay, targetHour },
    };
  }

  // 6. Intent detection: Activity
  let activity: ActivityType | undefined;
  if (/\bcricket|match\b/i.test(lower)) activity = "cricket";
  else if (/\brunning|jogging|run|jog\b/i.test(lower)) activity = "running";
  else if (/\bcycling|cycle|bike ride\b/i.test(lower)) activity = "cycling";
  else if (/\bfootball|soccer\b/i.test(lower)) activity = "football";
  else if (/\bpicnic|outing\b/i.test(lower)) activity = "picnic";
  else if (/\bhiking|trekking|trek|hike\b/i.test(lower)) activity = "hiking";
  else if (/\bphoto|photography|photoshoot\b/i.test(lower)) activity = "photography";
  else if (/\bgarden|gardening|plants\b/i.test(lower)) activity = "gardening";
  else if (/\bwalk|walking|stroll|tahalna\b/i.test(lower)) activity = "walking";
  else if (/\bevent|wedding|concert|party\b/i.test(lower)) activity = "outdoor_events";

  if (activity) {
    return {
      intent: "activity",
      language,
      detectedLocations,
      activity,
      timeContext: { isTomorrow, isDayAfterTomorrow, timeOfDay, targetHour },
    };
  }

  // 7. Intent detection: Rain check
  if (/\b(rain|barish|drizzle|umbrella|chata|barsaat|thunder|raincoat)\b/i.test(lower)) {
    return {
      intent: "rain_check",
      language,
      detectedLocations,
      timeContext: { isTomorrow, isDayAfterTomorrow, timeOfDay, targetHour },
    };
  }

  // 8. Intent detection: Forecast
  if (isTomorrow || isDayAfterTomorrow || timeOfDay || targetHour !== undefined || /\bforecast|outlook|week\b/i.test(lower)) {
    return {
      intent: "weather_forecast",
      language,
      detectedLocations,
      timeContext: { isTomorrow, isDayAfterTomorrow, timeOfDay, targetHour },
    };
  }

  return {
    intent: "weather_current",
    language,
    detectedLocations,
    timeContext: { isTomorrow, isDayAfterTomorrow, timeOfDay, targetHour },
  };
}
