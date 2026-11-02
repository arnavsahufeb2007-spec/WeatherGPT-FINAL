import { ActivityType, ConversationContext, LocationInfo } from "../types.js";
import { BLOCKED_GEOCODE_TERMS, isBlockedGeocodeQuery, geocodingProvider } from "../providers/geocodingProvider.js";

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

export interface LanguageResolution {
  language: string;
  source: "script_detected" | "keyword_detected" | "preferred_language" | "default";
}

export interface QueryResolutionResult {
  language: string;
  languageSource: "script_detected" | "keyword_detected" | "preferred_language" | "default";
  location: LocationInfo | null;
  locationSource: "explicit_query" | "context_followup" | "device_current" | "none";
  locationConfidence: "high" | "medium" | "low" | "none";
  isFollowUp: boolean;
  requiresLocation: boolean;
}

const KNOWN_INDIAN_LOCATIONS = [
  "delhi", "new delhi", "dilli", "mumbai", "bombay", "bangalore", "bengaluru",
  "chennai", "madras", "kolkata", "calcutta", "hyderabad", "pune", "ahmedabad",
  "jaipur", "lucknow", "chandigarh", "bhopal", "indore", "ujjain", "gwalior", "jabalpur",
  "kochi", "cochin", "goa", "panaji", "shimla", "manali", "srinagar", "varanasi", "kashi",
  "patna", "surat", "nagpur", "guwahati", "mysore", "mysuru", "agra",
  "amritsar", "dehradun", "rishikesh", "udaipur", "jodhpur", "kanpur",
  "ranchi", "raipur", "coimbatore", "madurai", "visakhapatnam", "vizag", "haridwar", "ajmer", "kota"
];

const HINDI_HINGLISH_KEYWORDS = [
  "aaj", "kal", "parso", "subah", "dophar", "shaam", "raat", "barish", "barsaat",
  "garmi", "sardi", "thand", "dhoop", "mausam", "kaisa", "kaisi", "hogi", "hoga",
  "khel", "jaana", "gadi", "chale", "batao", "bataiye", "kya", "hai", "me", "mein",
  "kaisa rahega", "kitna", "tapman"
];

const NON_LOCATION_WORDS = BLOCKED_GEOCODE_TERMS;

export function isValidLocationCandidate(candidate: string): boolean {
  if (!candidate) return false;
  const cleaned = candidate.trim().toLowerCase().replace(/^[^\w\u0900-\u0D7F]+|[^\w\u0900-\u0D7F]+$/g, "");
  if (!cleaned || cleaned.length < 2) return false;
  if (BLOCKED_GEOCODE_TERMS.has(cleaned)) return false;
  if (isBlockedGeocodeQuery(cleaned)) return false;
  // Specific filter for generic phrases like "my city", "my location", "my area", "current location", etc.
  if (/^(?:my|our|current|the|this|local|device|home|work)\s+(?:city|location|area|town|village|place|zone|region|neighborhood|home|work|weather|forecast|temp|temperature)$/i.test(cleaned)) {
    return false;
  }
  const tokens = cleaned.split(/\s+/);
  if (tokens.every((t) => BLOCKED_GEOCODE_TERMS.has(t))) return false;
  return true;
}

export function cleanLocationCandidate(candidate: string): string {
  return candidate
    .replace(/^(?:the|in|at|for|around|of|about|my|our|current|this|a|an)\s+/i, "")
    .replace(/\s+(?:weather|forecast|for|tomorrow|today|kal|aaj|climate|dono|ke|mein|me|ka|ki|city|location|area|town|place).*$/i, "")
    .replace(/[^\w\s\u0900-\u0D7F,-]/g, "")
    .trim();
}

export function extractComparisonLocations(query: string): string[] | null {
  // Pattern 1: compare/comparison/difference between LocA and/vs/with/aur LocB
  const pattern1 = /\b(?:compare|comparison(?:\s+between)?|difference\s+between|tulna)\s+([a-zA-Z0-9\u0900-\u097F\s]{2,30}?)\s+(?:and|vs|versus|with|aur|या|तथा)\s+([a-zA-Z0-9\u0900-\u097F\s]{2,30}?)(?:\s+(?:weather|forecast|for|tomorrow|today|kal|aaj|climate|dono|ke|mein)|\?|$)/i;
  const match1 = query.match(pattern1);
  if (match1) {
    const loc1 = cleanLocationCandidate(match1[1]);
    const loc2 = cleanLocationCandidate(match1[2]);
    if (isValidLocationCandidate(loc1) && isValidLocationCandidate(loc2)) {
      return [loc1, loc2];
    }
  }

  // Pattern 2: LocA vs/versus LocB
  const pattern2 = /\b([a-zA-Z0-9\u0900-\u097F\s]{2,25}?)\s+(?:vs|versus)\s+([a-zA-Z0-9\u0900-\u097F\s]{2,25}?)(?:\s+(?:weather|forecast|for|tomorrow|today|kal|aaj)|\?|$)/i;
  const match2 = query.match(pattern2);
  if (match2) {
    const loc1 = cleanLocationCandidate(match2[1]);
    const loc2 = cleanLocationCandidate(match2[2]);
    if (isValidLocationCandidate(loc1) && isValidLocationCandidate(loc2)) {
      return [loc1, loc2];
    }
  }

  // Pattern 3: Hindi/Hinglish: LocA aur LocB ke mausam ki tulna / dono ka mausam
  const pattern3 = /\b([a-zA-Z0-9\u0900-\u097F\s]{2,25}?)\s+(?:aur|tatha|or)\s+([a-zA-Z0-9\u0900-\u097F\s]{2,25}?)\s+(?:ke\s+mausam|dono|me\s+se\s+kahan|ki\s+tulna|tulna)\b/i;
  const match3 = query.match(pattern3);
  if (match3) {
    const loc1 = cleanLocationCandidate(match3[1]);
    const loc2 = cleanLocationCandidate(match3[2]);
    if (isValidLocationCandidate(loc1) && isValidLocationCandidate(loc2)) {
      return [loc1, loc2];
    }
  }

  return null;
}

export function resolveQueryLanguage(query: string, preferredLanguage?: string): LanguageResolution {
  const text = (query || "").trim();
  const explicitPref = (preferredLanguage || "").trim().toLowerCase();
  const isAutoMode = !explicitPref || explicitPref === "auto" || explicitPref === "all";

  // 1. Explicit user-selected output language must be authoritative
  // If the user specified a concrete language (e.g. 'gu', 'ta', 'te', 'bn', 'hi', 'en', etc.),
  // it takes absolute precedence over script or keyword detection.
  if (!isAutoMode) {
    return { language: explicitPref, source: "preferred_language" };
  }

  // 2. Only auto language mode may use query-script detection:
  // Script-based detection (Unicode ranges)
  if (/[\u0A80-\u0AFF]/.test(text)) return { language: "gu", source: "script_detected" }; // Gujarati
  if (/[\u0C00-\u0C7F]/.test(text)) return { language: "te", source: "script_detected" }; // Telugu
  if (/[\u0B80-\u0BFF]/.test(text)) return { language: "ta", source: "script_detected" }; // Tamil
  if (/[\u0C80-\u0CFF]/.test(text)) return { language: "kn", source: "script_detected" }; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return { language: "ml", source: "script_detected" }; // Malayalam
  if (/[\u0A00-\u0A7F]/.test(text)) return { language: "pa", source: "script_detected" }; // Gurmukhi (Punjabi)
  if (/[\u0B00-\u0B7F]/.test(text)) return { language: "or", source: "script_detected" }; // Odia
  if (/[\u0600-\u06FF]/.test(text)) return { language: "ur", source: "script_detected" }; // Arabic / Urdu script
  if (/[\u0980-\u09FF]/.test(text)) {
    if (/[ৰৱ]/.test(text)) return { language: "as", source: "script_detected" }; // Assamese specific
    return { language: "bn", source: "script_detected" }; // Bengali
  }
  if (/[\u0900-\u097F]/.test(text)) {
    // Devanagari script: check for distinct Marathi markers (avoid ASCII \b boundary on Devanagari script)
    if (/(?:^|[^\u0900-\u097F])(आहे|आहेत|कसे|कसा|कशी|पाऊस|होईल|पडेल|नाही|झाला|हवामान|करा|सांगा|आजचे|उद्याचे)(?:[^\u0900-\u097F]|$)/.test(text)) {
      return { language: "mr", source: "script_detected" };
    }
    return { language: "hi", source: "script_detected" }; // Hindi
  }
  if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(text)) return { language: "ja", source: "script_detected" }; // Japanese
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return { language: "ko", source: "script_detected" }; // Korean
  if (/[\u0400-\u04FF]/.test(text)) return { language: "ru", source: "script_detected" }; // Cyrillic

  // 3. Keyword-based detection for Latin-script regional languages
  const lower = text.toLowerCase();
  const hindiWordCount = HINDI_HINGLISH_KEYWORDS.filter((kw) => new RegExp(`\\b${kw}\\b`, "i").test(lower)).length;
  if (hindiWordCount >= 1) {
    return { language: "hinglish", source: "keyword_detected" };
  }

  if (/\b(clima|tiempo|lluvia|llover|llueve|temperatura|hace calor|hace frio|viento|pronostico)\b/i.test(lower)) {
    return { language: "es", source: "keyword_detected" };
  }
  if (/\b(meteo|météo|temps|pluie|pleuvoir|pleut|température|vent|prevision|prévision)\b/i.test(lower)) {
    return { language: "fr", source: "keyword_detected" };
  }
  if (/\b(wetter|regen|regnet|temperatur|wind|vorhersage|wetterbericht)\b/i.test(lower)) {
    return { language: "de", source: "keyword_detected" };
  }

  // 4. Default to English
  return { language: "en", source: "default" };
}

export function detectLanguageFromText(text: string): string {
  return resolveQueryLanguage(text, undefined).language;
}

export function extractExplicitLocations(query: string): string[] {
  const lower = query.toLowerCase().trim();
  const explicit: string[] = [];

  const addCandidate = (cand: string) => {
    const cleaned = cleanLocationCandidate(cand);
    if (isValidLocationCandidate(cleaned)) {
      const lowerClean = cleaned.toLowerCase();
      if (!explicit.some((e) => e.toLowerCase() === lowerClean)) {
        explicit.push(cleaned);
      }
    }
  };

  // 1. Comparison locations
  const compLocs = extractComparisonLocations(query);
  if (compLocs && compLocs.length >= 2) {
    compLocs.forEach(addCandidate);
    if (explicit.length >= 2) return explicit;
  }

  // 2. Travel pattern: from X to Y
  const travelMatch = lower.match(/(?:from|se)\s+([a-zA-Z\u0900-\u0D7F\s]+?)\s+(?:to|tak)\s+([a-zA-Z\u0900-\u0D7F\s]+?)(?:\s+(?:by|on|via)\s+(car|bike|bus|train|flight))?(?:\?|$|\s+weather)/i);
  if (travelMatch) {
    addCandidate(travelMatch[1]);
    addCandidate(travelMatch[2]);
    if (explicit.length >= 2) return explicit;
  }

  // 3. Known Indian locations
  for (const loc of KNOWN_INDIAN_LOCATIONS) {
    const regex = new RegExp(`\\b${loc}\\b`, "i");
    if (regex.test(lower)) {
      addCandidate(loc);
    }
  }

  // 4. Preposition patterns: "in <City>", "at <City>", "for <City>", "around <City>", "of <City>", "about <City>"
  const prepMatches = query.matchAll(/\b(?:in|at|for|around|of|about)\s+([a-zA-Z\u0900-\u0D7F\s,.-]{2,30}?)(?:\s+(?:weather|forecast|today|tomorrow|kal|aaj|right now|currently)|\?|$|!)/gi);
  for (const m of prepMatches) {
    if (m[1]) addCandidate(m[1]);
  }

  // 5. Postposition patterns: "<City> weather", "<City> forecast", "<City> temperature"
  const postMatches = query.matchAll(/\b([a-zA-Z\u0900-\u0D7F\s,.-]{2,30}?)\s+(?:weather|forecast|temperature|temp|climate|mausam)\b/gi);
  for (const m of postMatches) {
    if (m[1]) addCandidate(m[1]);
  }

  // 6. Hindi / Hinglish postpositions: "<City> mein", "<City> me", "<City> ka mausam", "<City> ki barish"
  const hindiPostMatches = query.matchAll(/\b([a-zA-Z\u0900-\u097F]{2,25}?)\s+(?:mein|me|ka|ki|ke|se)\b/gi);
  for (const m of hindiPostMatches) {
    if (m[1]) addCandidate(m[1]);
  }

  // 7. Gujarati postpositions: "<City>માં", "<City> મા", "<City>નું", "<City>ની"
  const gujPostMatches = query.matchAll(/([a-zA-Z\u0A80-\u0AFF]{2,25}?)(?:માં|મા|નું|નો|ની|ના)\b/gi);
  for (const m of gujPostMatches) {
    if (m[1]) addCandidate(m[1]);
  }

  // 8. If entire query is short (1 to 3 words) and is not a generic question or blocked phrase
  const strippedQuery = query.replace(/[?!.,;]/g, "").trim();
  const words = strippedQuery.split(/\s+/);
  if (words.length >= 1 && words.length <= 3) {
    if (isValidLocationCandidate(strippedQuery)) {
      addCandidate(strippedQuery);
    }
  }

  return explicit;
}

export function isFollowUpQuery(query: string, hasActiveLocation: boolean): boolean {
  if (!hasActiveLocation) return false;
  const explicitLocs = extractExplicitLocations(query);
  if (explicitLocs.length > 0) return false;
  return true;
}

export function isDeviceLocationIntent(query: string): boolean {
  const lower = query.toLowerCase().trim();
  return /\b(my\s+location|current\s+location|device\s+location|where\s+i\s+am|here|local\s+weather|around\s+me|my\s+city|my\s+area|mera\s+location|yahan|yahan\s+ka\s+mausam|અહીં|અહીંનું\s+હવામાન|इथे|माझे\s+शहर|माझे\s+ठिकाण)\b/i.test(lower);
}

export function parseQuery(query: string, context?: ConversationContext, preferredLanguage?: string): ParsedIntent {
  const lower = query.toLowerCase().trim();

  // 1. Authoritative language detection
  const langRes = resolveQueryLanguage(query, preferredLanguage);
  const language = langRes.language;

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

  // 3. Location extraction: strictly explicit locations from query text
  const detectedLocations = extractExplicitLocations(query);

  // 4. Intent detection: Travel
  const travelMatch = lower.match(/(?:from|se)\s+([a-zA-Z\u0900-\u0D7F\s]+?)\s+(?:to|tak)\s+([a-zA-Z\u0900-\u0D7F\s]+?)(?:\s+(?:by|on|via)\s+(car|bike|bus|train|flight))?(?:\?|$|\s+weather)/i);
  const travelKeywords = /\b(travel|trip|drive|driving|road trip|route|ride|journey|yatra|safar)\b/i.test(lower);

  if (travelMatch) {
    const origin = cleanLocationCandidate(travelMatch[1]);
    const destination = cleanLocationCandidate(travelMatch[2]);
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
  const compLocs = extractComparisonLocations(query);
  if (compLocs && compLocs.length >= 2) {
    return {
      intent: "comparison",
      language,
      detectedLocations: compLocs,
      comparisonLocations: compLocs,
      timeContext: { isTomorrow, isDayAfterTomorrow, timeOfDay, targetHour },
    };
  }

  const comparisonKeywords = /\b(vs|versus|compare|comparison|or|difference between|farq|tulna)\b/i.test(lower);
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
  if (/\b(rain|barish|drizzle|umbrella|chata|barsaat|thunder|raincoat|વરસાદ|પાऊस)\b/i.test(lower)) {
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

export async function resolveLocationAndIntent(
  query: string,
  context?: ConversationContext,
  preferredLanguage?: string,
  clientLocation?: LocationInfo
): Promise<{ parsed: ParsedIntent; resolution: QueryResolutionResult }> {
  const langRes = resolveQueryLanguage(query, preferredLanguage);
  const language = langRes.language;

  const parsed = parseQuery(query, context, language);
  const explicitLocations = parsed.detectedLocations;

  let resolvedLocation: LocationInfo | null = null;
  let locationSource: QueryResolutionResult["locationSource"] = "none";
  let locationConfidence: QueryResolutionResult["locationConfidence"] = "none";
  let isFollowUp = false;
  let requiresLocation = false;

  // Priority 1: Explicit valid location in query
  if (explicitLocations.length > 0) {
    const candidate = explicitLocations[0];
    const activeLoc = clientLocation || context?.currentLocation;
    const candLower = candidate.toLowerCase();
    if (
      activeLoc &&
      (activeLoc.name.toLowerCase() === candLower ||
        activeLoc.name.toLowerCase().includes(candLower) ||
        candLower.includes(activeLoc.name.toLowerCase()))
    ) {
      resolvedLocation = activeLoc;
      locationSource = "explicit_query";
      locationConfidence = "high";
    } else {
      try {
        const geo = await geocodingProvider.resolveLocation(candidate);
        if (geo && !BLOCKED_GEOCODE_TERMS.has(geo.name.toLowerCase())) {
          resolvedLocation = geo;
          locationSource = "explicit_query";
          locationConfidence = "high";
        }
      } catch {
        // Geocoding network error
      }
    }
  }

  // Priority 2: Existing conversation location for follow-up query
  if (!resolvedLocation) {
    const hasValidContext = Boolean(
      context?.currentLocation &&
      typeof context.currentLocation.latitude === "number" &&
      typeof context.currentLocation.longitude === "number" &&
      context.currentLocation.name &&
      !BLOCKED_GEOCODE_TERMS.has(context.currentLocation.name.toLowerCase())
    );

    if (hasValidContext && isFollowUpQuery(query, true)) {
      resolvedLocation = context!.currentLocation!;
      locationSource = "context_followup";
      locationConfidence = "high";
      isFollowUp = true;
    }
  }

  // Priority 3: Explicit device/current location intent
  if (!resolvedLocation && isDeviceLocationIntent(query)) {
    const hasValidClientLoc = Boolean(
      clientLocation &&
      typeof clientLocation.latitude === "number" &&
      typeof clientLocation.longitude === "number" &&
      clientLocation.name &&
      !BLOCKED_GEOCODE_TERMS.has(clientLocation.name.toLowerCase())
    );

    if (hasValidClientLoc) {
      resolvedLocation = clientLocation!;
      locationSource = "device_current";
      locationConfidence = "high";
    }
  }

  // Priority 4: Otherwise no location
  if (!resolvedLocation) {
    locationSource = "none";
    locationConfidence = "none";
    requiresLocation = true;
  }

  const resolution: QueryResolutionResult = {
    language,
    languageSource: langRes.source,
    location: resolvedLocation,
    locationSource,
    locationConfidence,
    isFollowUp,
    requiresLocation,
  };

  return { parsed, resolution };
}

