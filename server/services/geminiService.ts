import { GoogleGenAI, Type } from "@google/genai";
import { ActivityAnalysis, ComparisonAnalysis, CurrentWeatherData, DailyForecastItem, HourlyForecastItem, LocationInfo, NasaEnvironmentalData, TravelAnalysis, WeatherAdvisory, WeatherAnalysis } from "../types.js";
import { getLanguageConfig } from "../../src/languages.js";
import { validateAndGroundWeatherResponse, checkLocationConsistency, StructuredAIOutput } from "./weatherGroundingValidator.js";

let genAiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (genAiInstance) return genAiInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  try {
    genAiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    return genAiInstance;
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI:", err);
    return null;
  }
}

export interface GroundedWeatherContext {
  userQuery: string;
  language: string;
  location?: LocationInfo;
  current?: CurrentWeatherData;
  hourly?: HourlyForecastItem[];
  daily?: DailyForecastItem[];
  analysis?: WeatherAnalysis;
  advisories?: WeatherAdvisory[];
  activity?: ActivityAnalysis;
  comparison?: ComparisonAnalysis;
  travel?: TravelAnalysis;
  nasa?: NasaEnvironmentalData;
}

export async function generateWeatherExplanation(context: GroundedWeatherContext): Promise<{ reply: string; isAIGenerated: boolean; fallbackUsed: boolean }> {
  const ai = getGenAI();
  const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const langConfig = getLanguageConfig(context.language);

  // If no API key or AI client is available, generate rich deterministic response
  if (!ai) {
    const rawFallback = generateDeterministicFallback(context);
    const validated = validateAndGroundWeatherResponse(rawFallback, context);
    return {
      reply: validated.correctedText,
      isAIGenerated: false,
      fallbackUsed: true,
    };
  }

  const systemInstruction = `You are WeatherGPT, a world-class conversational AI weather intelligence engine built for India and global users.
Weather provider data is ALWAYS the absolute source of truth. You are strictly responsible for interpretation, natural language communication, and safe guidance.

MANDATORY FACTUAL GROUNDING RULES (NEVER VIOLATE):
1. STRICT LOCATION BINDING (CRITICAL):
   - You MUST answer exclusively for the target location specified in the context.
   - You MUST NOT hallucinate, adopt, or mention unrelated locations (e.g. Give, South Denmark, Reykjavík, etc.).
   - Explicitly mention the target location name in your response.
2. NEVER modify, round, exaggerate, estimate, or replace numerical weather values received from the weather provider.
3. If the weather provider reports:
   Rain probability = 96%
   You must state exactly 96%, NOT 100%, and NOT "guaranteed".
4. All numerical values must remain identical to the source data, including:
   - Temperature (keep exact source numbers)
   - Feels-like temperature
   - Precipitation probability (%)
   - Precipitation amount (mm)
   - Wind speed and gusts (km/h)
   - Humidity (%) - if null/unavailable, state that humidity data is unavailable, NEVER report 0%
   - UV index
   - Visibility (km)
   - Pressure (hPa)
   - Dates and times
5. ACTIVE RAIN VS FORECAST (CRITICAL):
   - A high precipitation probability does NOT mean rain is currently falling!
   - If current rain is 0 mm/hr, you MUST NOT state that it is currently raining, downpouring, or that active rain is underway.
   - Describe current conditions as dry, with the specified probability for upcoming rain.
6. TRAFFIC, ROAD GRIP & TRANSPORTATION CONSTRAINTS:
   - You do NOT have access to live road traffic, traffic jams, highway police updates, road flooding sensors, or flight/train delay APIs.
   - You MUST NOT claim traffic congestion, slower vehicular transit, road flooding, road closures, actual waterlogging, or reduced road grip as factual conditions.
   - Phrase all travel advice ONLY as an atmospheric weather possibility (e.g., "wet outdoor surfaces may increase the possibility of reduced tire traction" rather than "expect slower vehicular transit and local waterlogging").
   - Clearly distinguish weather possibilities from actual live traffic information.
7. PROBABILITY VS CERTAINTY:
   - Do NOT convert probability values into absolute statements unless the actual provider value is explicitly 100%.
   - E.g., 96% is a very high probability, but it is NOT 100% and NOT "guaranteed".
   - 70% must NEVER become 80% or 100%.
   - 0% must NEVER become a positive probability.
8. NASA EARTH OBSERVATION & CLIMATE BASELINE RULES:
   - Open-Meteo is the primary and authoritative source for all current temperatures, precipitation probabilities, wind, and multi-day forecasts.
   - NASA EONET provides near-real-time natural hazard tracking (active wildfires, cyclones, volcanic plumes). You must NOT fabricate hazards. If 0 events are reported, state that no active severe hazards were detected by NASA satellites in this radius.
   - NASA POWER provides a 20-year historical climatological normal (MERRA-2) and solar irradiance (kWh/m²/day). This is strictly a historical baseline context; NEVER describe historical averages as today's forecast or current measurement.

TARGET LANGUAGE SPECIFICATIONS:
- Selected Language: ${langConfig.name} (${langConfig.nativeName}) [BCP-47: ${langConfig.bcp47}, Script: ${langConfig.script}]
- Language Directive: ${langConfig.geminiPromptInstruction}
- For Hinglish: Use natural, conversational Roman-script Hindi mixed with English terms (e.g. "Aaj barish ke asaar 96% hain, halki umbrella carry karein"). Do NOT write in Devanagari script.
- For Indian & International languages: Write fluently and idiomatically in the specified native script (${langConfig.script}), but ALWAYS keep numerical weather values intact and accurate.`;

  const payloadSummary = formatContextForGemini(context);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `User Query: "${context.userQuery}"\nSelected Language: ${langConfig.name} (${langConfig.code})\n\nVERIFIED WEATHER PROVIDER DATA:\n${payloadSummary}\n\nRespond as WeatherGPT in ${langConfig.name} (${langConfig.nativeName}) maintaining 100% numerical fidelity to the verified provider data:`,
      config: {
        systemInstruction,
        temperature: 0.2, // Low temperature for maximum factual fidelity
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            directAnswer: {
              type: Type.STRING,
              description: "Direct answer to the user query stating the exact factual meteorological figures without rounding or exaggeration.",
            },
            referencedPrecipitationProbability: {
              type: Type.NUMBER,
              description: "The exact precipitation probability from the provider data (e.g. 96). Must NOT be rounded to 100 or altered.",
            },
            referencedTemperature: {
              type: Type.NUMBER,
              description: "The exact current temperature in Celsius from the provider data.",
            },
            referencedFeelsLike: {
              type: Type.NUMBER,
              description: "The exact feels-like temperature in Celsius from the provider data.",
            },
            referencedWindSpeed: {
              type: Type.NUMBER,
              description: "The exact wind speed in km/h from the provider data.",
            },
            referencedHumidity: {
              type: Type.NUMBER,
              description: "The exact humidity percentage from provider data, or null if unavailable.",
            },
            detailedExplanation: {
              type: Type.STRING,
              description: "Clear conversational explanation, practical guidance (attire, hydration, outdoor plans), and nuances in the target language.",
            },
            travelWeatherAdvice: {
              type: Type.STRING,
              description: "If query is travel-related, route weather risk possibilities. MUST NOT claim live traffic congestion, road closures, or transit delays.",
            },
          },
          required: ["directAnswer", "detailedExplanation"],
        },
      },
    });

    let structured: StructuredAIOutput | undefined;
    let fullText = "";
    const rawText = response.text?.trim() || "";

    try {
      if (rawText.startsWith("{")) {
        structured = JSON.parse(rawText);
        const parts = [
          structured?.directAnswer,
          structured?.detailedExplanation,
          structured?.travelWeatherAdvice ? `\n\n🚗 **Travel Weather Assessment**: ${structured.travelWeatherAdvice}` : "",
        ].filter(Boolean);
        fullText = parts.join("\n\n");
      } else {
        fullText = rawText;
      }
    } catch {
      fullText = rawText;
    }

    if (!fullText) {
      throw new Error("Empty response from Gemini");
    }

    // Check location consistency (prevent foreign hallucinations like Denmark)
    const locConsistency = checkLocationConsistency(fullText, context.location);
    if (!locConsistency.isConsistent) {
      console.warn("Location consistency check failed:", locConsistency.mismatchWarning);
      const rawFallback = generateDeterministicFallback(context);
      const validated = validateAndGroundWeatherResponse(rawFallback, context);
      return {
        reply: validated.correctedText,
        isAIGenerated: false,
        fallbackUsed: true,
      };
    }

    // Pass through Server-Side Validation & Grounding Engine
    const validated = validateAndGroundWeatherResponse(fullText, context, structured);
    if (!validated.isValid) {
      console.warn("Weather grounding violations corrected:", validated.violationsDetected);
    }

    return {
      reply: validated.correctedText,
      isAIGenerated: true,
      fallbackUsed: false,
    };
  } catch (err: any) {
    console.warn("Gemini API call failed, falling back to deterministic response:", err.message);
    const rawFallback = generateDeterministicFallback(context);
    const validated = validateAndGroundWeatherResponse(rawFallback, context);
    return {
      reply: validated.correctedText,
      isAIGenerated: false,
      fallbackUsed: true,
    };
  }
}

function formatContextForGemini(context: GroundedWeatherContext): string {
  const parts: string[] = [];

  parts.push("=== CANONICAL IMMUTABLE WEATHER PROVIDER DATA (GROUND TRUTH) ===");

  if (context.location) {
    parts.push(`AUTHORITATIVE TARGET LOCATION (CRITICAL: ANSWER ONLY FOR THIS LOCATION):
- Location Name: ${context.location.name}
- Administrative Region: ${context.location.admin1 || "N/A"}
- Country: ${context.location.country || "N/A"} (Country Code: ${context.location.countryCode || "N/A"})
- Coordinates: ${context.location.latitude.toFixed(4)}°N, ${context.location.longitude.toFixed(4)}°E
- Timezone: ${context.location.timezone}
CRITICAL MANDATE: You are answering strictly and exclusively for ${context.location.name} (${context.location.country}). You MUST NOT mention, borrow from, or confuse this with any other location.`);
  }

  if (context.current) {
    const c = context.current;
    parts.push(
      `EXACT CURRENT OBSERVATIONS:
- Temperature: ${c.temperature}°C (MUST NOT be altered)
- Feels Like: ${c.feelsLike}°C
- Condition: "${c.condition}"
- Precipitation Probability: ${c.precipitationProbability}% (CRITICAL: MUST NOT be rounded to 100% or converted to certainty unless provider value is 100%)
- Rain Amount: ${c.rain || c.precipitation} mm/hr ${c.rain === 0 && c.precipitation === 0 ? "(CURRENTLY DRY: 0 mm/hr. Rain probability is for forecast window only)" : "(ACTIVE PRECIPITATION is falling now)"}
- Wind Speed: ${c.windSpeed} km/h (Gusts: ${c.windGusts} km/h)
- Humidity: ${c.humidity !== null ? `${c.humidity}%` : "Unavailable (sensor reading missing; do NOT state 0%)"}
- UV Index: ${c.uvIndex}
- Visibility: ${(c.visibility / 1000).toFixed(1)} km
- Pressure: ${c.pressure} hPa`
    );
  }

  if (context.analysis) {
    const a = context.analysis;
    parts.push(
      `DETERMINISTIC ANALYSIS: Rain Risk: ${a.rainRiskLabel}, Heat Risk: ${a.heatRiskLabel}, Wind Risk: ${a.windRiskLabel}, UV Risk: ${a.uvRiskLabel}, Visibility Risk: ${a.visibilityRiskLabel}, Comfort: ${a.comfortLabel}, Outdoor Suitability Score: ${a.outdoorSuitabilityScore}/100.`
    );
  }

  if (context.advisories && context.advisories.length > 0) {
    parts.push(`VERIFIED ADVISORIES: ${context.advisories.map((adv) => `[${adv.severity.toUpperCase()}] ${adv.title}: ${adv.description} (${adv.recommendation})`).join(" | ")}`);
  }

  if (context.activity) {
    const act = context.activity;
    parts.push(
      `ACTIVITY EVALUATION (${act.activityName}): Suitability: ${act.suitability.toUpperCase()} (Score: ${act.suitabilityScore}/100), Risk Level: ${act.riskLevel.toUpperCase()}. Reasons: ${act.primaryReasons.join("; ")}. Better window: ${act.bestTimeWindow || "None specified"}.`
    );
  }

  if (context.travel) {
    const tr = context.travel;
    parts.push(
      `TRAVEL ROUTE WEATHER (${tr.origin.name} -> ${tr.destination.name} by ${tr.mode}): Total Distance: ${tr.totalDistanceKm} km, Duration: approx ${Math.floor(
        tr.estimatedDurationMinutes / 60
      )}h ${tr.estimatedDurationMinutes % 60}m. Route Atmospheric Risk: ${tr.weatherRiskLevel.toUpperCase()}. Key Weather Observations: ${tr.keyWeatherRisks.join("; ")}.`
    );
    parts.push("IMPORTANT NOTICE: Real-time traffic, congestion, road closures, and flight delays are NOT available. Frame travel advice purely as atmospheric possibilities.");
  }

  if (context.comparison) {
    const comp = context.comparison;
    parts.push(`COMPARISON SUMMARY: ${comp.comparativeSummary}`);
    parts.push(`METRIC HIGHLIGHTS: ${comp.metricDeltas.map((m) => `${m.metric}: ${m.highlight}`).join(" | ")}`);
  }

  if (context.hourly && context.hourly.length > 0) {
    const next6 = context.hourly.slice(0, 6).map((h) => `${h.formattedTime}: ${h.temperature}°C, ${h.condition}, Rain: ${h.precipitationProbability}%`).join(" | ");
    parts.push(`NEXT 6 HOURS OUTLOOK: ${next6}`);
  }

  if (context.daily && context.daily.length > 0) {
    const next3 = context.daily.slice(0, 3).map((d) => `${d.dayName}: High ${d.tempMax}°C / Low ${d.tempMin}°C, ${d.condition}, Rain: ${d.precipitationProbabilityMax}%`).join(" | ");
    parts.push(`DAILY OUTLOOK: ${next3}`);
  }

  if (context.nasa && context.nasa.status === "available") {
    const n = context.nasa;
    const nasaParts: string[] = [`NASA ENVIRONMENTAL INTELLIGENCE LAYER:`];
    if (n.naturalEvents) {
      nasaParts.push(`- Natural Hazard Events (${n.naturalEvents.temporalLabel}): ${n.naturalEvents.summary}`);
      if (n.naturalEvents.events.length > 0) {
        const evList = n.naturalEvents.events.map((e) => `• ${e.title} (${e.categoryTitle}, ~${e.distanceKm} km away, sources: ${e.sources.map((s) => s.id).join("/")})`).join(" ");
        nasaParts.push(`  Active Events: ${evList}`);
      }
    }
    if (n.climateContext) {
      const c = n.climateContext;
      const deltaStr = c.currentTempDeltaC !== undefined ? ` (Current temp is ${c.currentTempDeltaC > 0 ? "+" : ""}${c.currentTempDeltaC}°C vs normal)` : "";
      nasaParts.push(`- Historical Climatology (${c.temporalLabel}): ${c.month} 20-year normal is ${c.historicalNormalTempC}°C${deltaStr}. Solar Irradiance: ${c.allSkySolarIrradianceKwhM2Day} kWh/m²/day.`);
    }
    parts.push(nasaParts.join("\n"));
  }

  return parts.join("\n\n");
}

export function generateDeterministicFallback(context: GroundedWeatherContext): string {
  const { language, location, current, analysis, activity, travel, comparison, advisories } = context;
  const langConfig = getLanguageConfig(language);
  const t = langConfig.translations;
  const isHinglish = language === "hinglish";
  const isHindi = language === "hi";

  const travelNote = "\n\n*(Note: Travel advice is based purely on atmospheric and road-weather conditions; live traffic congestion, accidents, and transit delays are not monitored).*";

  // 1. Travel Fallback
  if (travel) {
    if (isHinglish) {
      return `🚗 **${travel.origin.name} se ${travel.destination.name} Travel Weather** (${travel.mode.toUpperCase()}):
• **Distance & Time**: Lagbhag ${travel.totalDistanceKm} km (approx ${Math.floor(travel.estimatedDurationMinutes / 60)} ghante ${travel.estimatedDurationMinutes % 60} minute).
• **Origin (${travel.origin.name})**: ${travel.originWeather.temperature}°C, ${travel.originWeather.condition}, rain chance ${travel.originWeather.precipitationProbability}%.
• **Destination (${travel.destination.name})**: ${travel.destinationWeather.temperature}°C, ${travel.destinationWeather.condition}, rain chance ${travel.destinationWeather.precipitationProbability}%.
• **Route Risk**: **${travel.weatherRiskLevel.toUpperCase()}**. ${travel.keyWeatherRisks.join(" ")}
• **Tips**: ${travel.recommendations[0]}${travelNote}`;
    }
    if (isHindi) {
      return `🚗 **${travel.origin.name} से ${travel.destination.name} यात्रा मौसम**:
• **कुल दूरी**: लगभग ${travel.totalDistanceKm} किमी (${Math.floor(travel.estimatedDurationMinutes / 60)} घंटे ${travel.estimatedDurationMinutes % 60} मिनट)।
• **प्रस्थान मौसम**: ${travel.originWeather.temperature}°C, ${travel.originWeather.condition}, वर्षा संभावना ${travel.originWeather.precipitationProbability}%।
• **गंतव्य मौसम**: ${travel.destinationWeather.temperature}°C, ${travel.destinationWeather.condition}, वर्षा संभावना ${travel.destinationWeather.precipitationProbability}%।
• **मार्ग जोखिम स्तर**: ${travel.weatherRiskLevel}। ${travel.keyWeatherRisks.join(" ")}${travelNote}`;
    }
    return `🚗 **${t.tabTravel}: ${travel.origin.name} → ${travel.destination.name}** (${travel.mode}):
• **Distance & Duration**: Approx ${travel.totalDistanceKm} km (${Math.floor(travel.estimatedDurationMinutes / 60)}h ${travel.estimatedDurationMinutes % 60}m).
• **Origin Weather**: ${travel.originWeather.temperature}°C, ${travel.originWeather.condition}, rain probability ${travel.originWeather.precipitationProbability}%.
• **Destination Weather**: ${travel.destinationWeather.temperature}°C, ${travel.destinationWeather.condition}, rain probability ${travel.destinationWeather.precipitationProbability}%.
• **Corridor Weather Risk**: **${travel.weatherRiskLevel.toUpperCase()}**. ${travel.keyWeatherRisks.join(" ")}
• **Advisory**: ${travel.recommendations.join(" ")}${travelNote}`;
  }

  // 2. Comparison Fallback
  if (comparison) {
    if (isHinglish) {
      return `📊 **Mausam Comparison**:
${comparison.comparativeSummary}

Key highlights:
${comparison.metricDeltas.map((m) => `• **${m.metric}**: ${m.highlight}`).join("\n")}`;
    }
    if (isHindi) {
      return `📊 **मौसम तुलना विश्लेषण**:
${comparison.comparativeSummary}

प्रमुख मेट्रिक्स:
${comparison.metricDeltas.map((m) => `• **${m.metric}**: ${m.highlight}`).join("\n")}`;
    }
    return `📊 **${t.tabCompare}**:
${comparison.comparativeSummary}

• **Key Differences**:
${comparison.metricDeltas.map((m) => `  - **${m.metric}**: ${m.highlight}`).join("\n")}`;
  }

  // 3. Activity Fallback
  if (activity) {
    if (isHinglish) {
      return `🏏 **${activity.activityName} Suitability**: **${activity.suitability.toUpperCase()}** (${activity.suitabilityScore}/100)
• **Risk Level**: ${activity.riskLevel}
• **Reasons**: ${activity.primaryReasons.join(" ")}
• ${activity.bestTimeWindow ? `**Behtar Samay**: ${activity.bestTimeWindow}` : ""}
• **Tips**: ${activity.tips.join(" ")}`;
    }
    if (isHindi) {
      return `🏏 **${activity.activityName} गतिविधि मूल्यांकन**: **${activity.suitability}** (${activity.suitabilityScore}/100)
• **जोखिम**: ${activity.riskLevel}
• **कारण**: ${activity.primaryReasons.join(" ")}
• ${activity.bestTimeWindow ? `**सर्वोत्तम समय**: ${activity.bestTimeWindow}` : ""}`;
    }
    return `🏏 **${activity.activityName}**:
• **Suitability**: **${activity.suitability.toUpperCase()}** (${t.outdoorScore}: ${activity.suitabilityScore}/100 | Risk: ${activity.riskLevel})
• **Key Assessment**: ${activity.primaryReasons.join(" ")}
• ${activity.bestTimeWindow ? `**Optimal Timing**: ${activity.bestTimeWindow}` : ""}
• **Practical Tips**: ${activity.tips.join(" ")}`;
  }

  // 4. Current & General Weather Fallback
  const locName = location?.name || "Current Location";
  if (!current) {
    return isHinglish
      ? `Mausam ki jankari prapt nahi ho saki. Kripya location dobara check karein.`
      : `${t.selectLocation}: Unable to retrieve verified weather data for this location.`;
  }

  if (isHinglish) {
    const advText = advisories && advisories.length > 0 ? `\n⚠️ **Advisory**: ${advisories[0].description}` : "";
    const humStr = current.humidity !== null ? `${current.humidity}%` : "Unavailable";
    return `🌤️ **${locName} ka Mausam**:
Abhi tapman **${current.temperature}°C** hai (feels like **${current.feelsLike}°C**) aur aakash **${current.condition}** hai.
• **Barish ki sambhavna**: ${current.precipitationProbability}% (${analysis?.rainRiskLabel || "normal"}).
• **Hawa ki raftaar**: ${current.windSpeed} km/h, humidity: ${humStr}.
• **UV Index**: ${current.uvIndex}.
• **Outdoor rating**: ${analysis?.outdoorSuitabilityScore || 80}/100 (${analysis?.comfortLabel || "Comfortable"}).${advText}`;
  }

  if (isHindi) {
    const advText = advisories && advisories.length > 0 ? `\n⚠️ **सलाह**: ${advisories[0].description}` : "";
    const humStr = current.humidity !== null ? `${current.humidity}%` : "अनुपलब्ध";
    return `🌤️ **${locName} का मौसम**:
वर्तमान तापमान **${current.temperature}°C** है (महसूस: **${current.feelsLike}°C**) और मौसम **${current.condition}** है।
• **वर्षा संभावना**: ${current.precipitationProbability}% (${analysis?.rainRiskLabel || ""})।
• **हवा गति**: ${current.windSpeed} किमी/घंटा, आर्द्रता: ${humStr}।
• **आउटडोर अनुकूलता स्कोर**: ${analysis?.outdoorSuitabilityScore || 80}/100।${advText}`;
  }

  const advBlock = advisories && advisories.length > 0 ? `\n\n⚠️ **${t.advisories}**: ${advisories[0].title} — ${advisories[0].description} (${advisories[0].recommendation})` : "";

  let nasaBlock = "";
  if (context.nasa && context.nasa.status === "available") {
    if (context.nasa.naturalEvents && context.nasa.naturalEvents.events.length > 0) {
      const topEv = context.nasa.naturalEvents.events[0];
      nasaBlock += `\n\n🛰️ **NASA Hazard Observation**: Active ${topEv.title} (${topEv.categoryTitle}) detected ~${topEv.distanceKm} km away [Near-Real-Time Curation].`;
    }
    if (context.nasa.climateContext) {
      const cc = context.nasa.climateContext;
      nasaBlock += `\n📊 **NASA Climate Baseline**: ${cc.month} 20-year normal: ${cc.historicalNormalTempC}°C (Solar irradiance: ${cc.allSkySolarIrradianceKwhM2Day} kWh/m²/day).`;
    }
  }

  const humLabel = current.humidity !== null ? `${current.humidity}%` : "Unavailable";
  return `🌤️ **${locName}** (${langConfig.name}):
• **${t.feelsLike}**: ${current.temperature}°C (${t.feelsLike} ${current.feelsLike}°C), ${current.condition}.
• **${t.precipitation}**: ${current.precipitationProbability}% (${analysis?.rainRiskLabel || "low"}).
• **${t.windSpeed} & ${t.humidity}**: ${current.windSpeed} km/h (gusts ${current.windGusts} km/h), ${t.humidity}: ${humLabel}, ${t.visibility}: ${(current.visibility / 1000).toFixed(1)} km.
• **${t.uvIndex} & ${t.outdoorScore}**: UV ${current.uvIndex}, ${t.outdoorScore}: ${analysis?.outdoorSuitabilityScore || 85}/100 (${analysis?.comfortLabel || "Comfortable"}).${advBlock}${nasaBlock}`;
}

