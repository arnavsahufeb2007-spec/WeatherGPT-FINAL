import { GroundedWeatherContext } from "./geminiService.js";

export interface GroundingValidationResult {
  isValid: boolean;
  correctedText: string;
  violationsDetected: string[];
  repairedFields: {
    precipitationProbability?: { from: any; to: number };
    temperature?: { from: any; to: number };
    feelsLike?: { from: any; to: number };
    windSpeed?: { from: any; to: number };
    windGusts?: { from: any; to: number };
    humidity?: { from: any; to: number | null };
    uvIndex?: { from: any; to: number };
  };
}

export interface StructuredAIOutput {
  directAnswer?: string;
  referencedPrecipitationProbability?: number | null;
  referencedTemperature?: number | null;
  referencedFeelsLike?: number | null;
  referencedWindSpeed?: number | null;
  referencedHumidity?: number | null;
  referencedUvIndex?: number | null;
  detailedExplanation?: string;
  travelWeatherAdvice?: string | null;
}

const TRAVEL_DISCLAIMER = "*(Note: Travel advice is based purely on atmospheric and road-weather conditions; live traffic congestion, accidents, and transit delays are not monitored).*";

/**
 * Server-side validation and grounding engine that enforces absolute meteorological truth.
 * Weather provider data is ALWAYS the source of truth.
 */
export function validateAndGroundWeatherResponse(
  inputText: string,
  context: GroundedWeatherContext,
  structuredData?: StructuredAIOutput
): GroundingValidationResult {
  let correctedText = inputText || "";
  const violationsDetected: string[] = [];
  const repairedFields: GroundingValidationResult["repairedFields"] = {};

  const current = context.current;
  const todayDaily = context.daily?.[0];
  const allDailyProbs = (context.daily || []).map((d) => d.precipitationProbabilityMax);
  const allHourlyProbs = (context.hourly || []).map((h) => h.precipitationProbability);

  // Set of all legitimate rain probability percentages in the provider dataset
  const validRainProbabilities = new Set<number>();
  if (current && typeof current.precipitationProbability === "number") {
    validRainProbabilities.add(current.precipitationProbability);
  }
  if (todayDaily && typeof todayDaily.precipitationProbabilityMax === "number") {
    validRainProbabilities.add(todayDaily.precipitationProbabilityMax);
  }
  allDailyProbs.forEach((p) => typeof p === "number" && validRainProbabilities.add(p));
  allHourlyProbs.forEach((p) => typeof p === "number" && validRainProbabilities.add(p));

  const primaryPrecipitationProb =
    current?.precipitationProbability !== undefined
      ? current.precipitationProbability
      : todayDaily?.precipitationProbabilityMax !== undefined
      ? todayDaily.precipitationProbabilityMax
      : null;

  // =========================================================================
  // 1. STRUCTURED OUTPUT VALIDATION (Rules 9 & 10)
  // If Gemini provided structured fields with conflicting values, discard & override
  // =========================================================================
  if (structuredData) {
    if (
      primaryPrecipitationProb !== null &&
      structuredData.referencedPrecipitationProbability !== undefined &&
      structuredData.referencedPrecipitationProbability !== null
    ) {
      if (structuredData.referencedPrecipitationProbability !== primaryPrecipitationProb) {
        violationsDetected.push(
          `Structured precipitationProbability mismatch: AI reported ${structuredData.referencedPrecipitationProbability}%, provider truth is ${primaryPrecipitationProb}%. Discarded conflicting value.`
        );
        repairedFields.precipitationProbability = {
          from: structuredData.referencedPrecipitationProbability,
          to: primaryPrecipitationProb,
        };
        structuredData.referencedPrecipitationProbability = primaryPrecipitationProb;
      }
    }

    if (
      current &&
      structuredData.referencedTemperature !== undefined &&
      structuredData.referencedTemperature !== null
    ) {
      if (Math.abs(structuredData.referencedTemperature - current.temperature) > 0.5) {
        violationsDetected.push(
          `Structured temperature mismatch: AI reported ${structuredData.referencedTemperature}°C, provider truth is ${current.temperature}°C. Discarded conflicting value.`
        );
        repairedFields.temperature = {
          from: structuredData.referencedTemperature,
          to: current.temperature,
        };
        structuredData.referencedTemperature = current.temperature;
      }
    }

    if (
      current &&
      structuredData.referencedWindSpeed !== undefined &&
      structuredData.referencedWindSpeed !== null
    ) {
      if (Math.abs(structuredData.referencedWindSpeed - current.windSpeed) > 1) {
        violationsDetected.push(
          `Structured windSpeed mismatch: AI reported ${structuredData.referencedWindSpeed} km/h, provider truth is ${current.windSpeed} km/h. Discarded conflicting value.`
        );
        repairedFields.windSpeed = {
          from: structuredData.referencedWindSpeed,
          to: current.windSpeed,
        };
        structuredData.referencedWindSpeed = current.windSpeed;
      }
    }

    if (current && structuredData.referencedHumidity !== undefined && structuredData.referencedHumidity !== null) {
      if (current.humidity === null) {
        violationsDetected.push(
          `Structured humidity reported as ${structuredData.referencedHumidity}% when provider humidity is null/unavailable. Discarded conflicting value.`
        );
        repairedFields.humidity = {
          from: structuredData.referencedHumidity,
          to: null,
        };
        structuredData.referencedHumidity = null;
      } else if (Math.abs(structuredData.referencedHumidity - current.humidity) > 2) {
        violationsDetected.push(
          `Structured humidity mismatch: AI reported ${structuredData.referencedHumidity}%, provider truth is ${current.humidity}%. Discarded conflicting value.`
        );
        repairedFields.humidity = {
          from: structuredData.referencedHumidity,
          to: current.humidity,
        };
        structuredData.referencedHumidity = current.humidity;
      }
    }
  }

  // =========================================================================
  // 2. PRECIPITATION PROBABILITY GROUNDING IN NATURAL LANGUAGE (Rules 1, 2, 7, 10, 11)
  // - 96% precipitation must never become 100%
  // - 70% must never become 80% or 100%
  // - 0% must never become a positive probability
  // - Absolute certainty claims are prohibited unless provider value is exactly 100%
  // =========================================================================
  if (primaryPrecipitationProb !== null) {
    // A. Provider value < 100%: Ban false 100% statements
    if (primaryPrecipitationProb < 100) {
      // Check for "100%" or "100 %" when provider is less than 100%
      const hundredRegex = /\b100\s*%/i;
      if (hundredRegex.test(correctedText)) {
        violationsDetected.push(
          `Unsubstantiated 100% precipitation claim detected when provider reported ${primaryPrecipitationProb}%. Corrected to ${primaryPrecipitationProb}%.`
        );
        correctedText = correctedText.replace(
          /\b100\s*%(?:\s*(?:chance|probability|sambhavna|संभावना))?/gi,
          `${primaryPrecipitationProb}%`
        );
      }

      // Check for absolute certainty statements
      const absoluteStatements = [
        /\b(?:guaranteed|certain|100%\s*sure|guarantee|definitely will rain)\b/gi,
        /\b(?:100%\s*barish|pakka barish)\b/gi,
        /\b(?:१००%|१००\s*%)\b/g,
      ];

      absoluteStatements.forEach((reg) => {
        reg.lastIndex = 0;
        if (reg.test(correctedText)) {
          reg.lastIndex = 0;
          violationsDetected.push("Absolute precipitation claim converted to verified probability.");
          correctedText = correctedText.replace(reg, `${primaryPrecipitationProb}% probability`);
        }
      });
    }

    // B. Specific handling for 0% precipitation: must never become positive probability
    if (primaryPrecipitationProb === 0) {
      // If provider has 0%, find any positive percentage attributed to rain
      const positiveRainRegex = /(\b(?:rain|precipitation|shower|drizzle|barish|varsha|barsat|वर्षा|बारिश)[\s\w\W]{0,35}?)(\b[1-9]\d{0,2}\s*%)/gi;
      positiveRainRegex.lastIndex = 0;
      if (positiveRainRegex.test(correctedText)) {
        positiveRainRegex.lastIndex = 0;
        violationsDetected.push(
          `Positive rain probability cited when provider truth is 0%. Corrected to 0%.`
        );
        correctedText = correctedText.replace(positiveRainRegex, `$1 0%`);
      }

      const reversePositiveRain = /(\b[1-9]\d{0,2}\s*%)(\s*[\s\w\W]{0,35}?\b(?:chance of rain|rain chance|probability of rain|rain|barish|वर्षा))/gi;
      reversePositiveRain.lastIndex = 0;
      if (reversePositiveRain.test(correctedText)) {
        reversePositiveRain.lastIndex = 0;
        violationsDetected.push(
          `Positive rain probability cited when provider truth is 0%. Corrected to 0%.`
        );
        correctedText = correctedText.replace(reversePositiveRain, `0% $2`);
      }
    }

    // C. General precipitation probability preservation:
    // If text mentions a percentage near rain/precipitation that is not in the valid provider probabilities,
    // and is an altered/rounded version (e.g. 70% becoming 80%, or 96% becoming 90% or 100%), correct it.
    const rainContextRegex = /(\b(?:rain|precipitation|showers?|drizzle|barish|barsat|varsha|baarish|chances? of rain|rain chance|probability of rain|rain probability|precipitation probability|बारिश|वर्षा)[\s\w\W]{0,40}?)(\b\d{1,3}\s*%)/gi;
    correctedText = correctedText.replace(rainContextRegex, (match, prefix, pctStr) => {
      const val = parseInt(pctStr.replace(/[^\d]/g, ""), 10);
      if (!isNaN(val) && val !== primaryPrecipitationProb && !validRainProbabilities.has(val)) {
        violationsDetected.push(
          `Conflicting precipitation probability ${val}% found near rain context. Grounded to provider value ${primaryPrecipitationProb}%.`
        );
        return `${prefix} ${primaryPrecipitationProb}%`;
      }
      return match;
    });

    const rainContextReverseRegex = /(\b\d{1,3}\s*%)(\s*[\s\w\W]{0,40}?\b(?:chance of rain|rain chance|probability of rain|rain probability|precipitation probability|barish ki sambhavna|वर्षा की संभावना))/gi;
    correctedText = correctedText.replace(rainContextReverseRegex, (match, pctStr, suffix) => {
      const val = parseInt(pctStr.replace(/[^\d]/g, ""), 10);
      if (!isNaN(val) && val !== primaryPrecipitationProb && !validRainProbabilities.has(val)) {
        violationsDetected.push(
          `Conflicting precipitation probability ${val}% found before rain phrase. Grounded to provider value ${primaryPrecipitationProb}%.`
        );
        return `${primaryPrecipitationProb}%${suffix}`;
      }
      return match;
    });
  }

  // =========================================================================
  // 3. TEMPERATURE GROUNDING (Rules 1, 3, 10, 11)
  // Temperatures must remain identical to source data
  // =========================================================================
  if (current && typeof current.temperature === "number") {
    const validTemps = new Set<number>();
    validTemps.add(Math.round(current.temperature));
    validTemps.add(Math.floor(current.temperature));
    validTemps.add(Math.ceil(current.temperature));
    if (typeof current.feelsLike === "number") {
      validTemps.add(Math.round(current.feelsLike));
      validTemps.add(Math.floor(current.feelsLike));
      validTemps.add(Math.ceil(current.feelsLike));
    }
    (context.daily || []).forEach((d) => {
      validTemps.add(Math.round(d.tempMax));
      validTemps.add(Math.round(d.tempMin));
    });
    (context.hourly || []).forEach((h) => {
      validTemps.add(Math.round(h.temperature));
    });

    // Check for "feels like XX°C"
    if (typeof current.feelsLike === "number") {
      const feelsLikeRegex = /(feels\s+like|apparent\s+temperature|महसूस)\s*(?:is|ke\s+roop\s+mein)?\s*(\d{1,2}(?:\.\d+)?)\s*(?:°C|°\s*C|deg C)/gi;
      correctedText = correctedText.replace(feelsLikeRegex, (match, prefix, valStr) => {
        const val = parseFloat(valStr);
        if (!isNaN(val) && Math.abs(val - current.feelsLike) > 0.8) {
          violationsDetected.push(
            `Feels-like temperature mismatch: AI stated ${val}°C, provider reported ${current.feelsLike}°C. Corrected.`
          );
          return `${prefix} ${current.feelsLike}°C`;
        }
        return match;
      });
    }

    // Check for "current temperature is XX°C" or "temperature: XX°C"
    const currentTempRegex = /(currently|current\s+temperature\s+is|temperature\s+is|tapman|tapmaan)\s*(?:around|approx|approximately)?\s*(\d{1,2}(?:\.\d+)?)\s*(?:°C|°\s*C|deg C)/gi;
    correctedText = correctedText.replace(currentTempRegex, (match, prefix, valStr) => {
      const val = parseFloat(valStr);
      if (!isNaN(val) && Math.abs(val - current.temperature) > 0.8 && !validTemps.has(Math.round(val))) {
        violationsDetected.push(
          `Current temperature mismatch: AI stated ${val}°C, provider reported ${current.temperature}°C. Corrected.`
        );
        return `${prefix} ${current.temperature}°C`;
      }
      return match;
    });
  }

  // =========================================================================
  // =========================================================================
  // 4. WIND SPEED GROUNDING (Rules 1, 3, 10, 11)
  // Wind values must remain identical to source data
  // =========================================================================
  if (current && typeof current.windSpeed === "number") {
    const windSpeedRegex = /(wind\s+speed(?:\s+is)?|winds\s+at|blowing\s+at|hawa\s+ki\s+raftaar)\s*(?:around|approx)?\s*(\d{1,3}(?:\.\d+)?)\s*(?:km\/h|kmph|kph)/gi;
    correctedText = correctedText.replace(windSpeedRegex, (match, prefix, valStr) => {
      const val = parseFloat(valStr);
      if (!isNaN(val) && Math.abs(val - current.windSpeed) > 1.5) {
        violationsDetected.push(
          `Wind speed mismatch: AI stated ${val} km/h, provider reported ${current.windSpeed} km/h. Corrected.`
        );
        return `${prefix} ${current.windSpeed} km/h`;
      }
      return match;
    });
  }

  // =========================================================================
  // 5. HUMIDITY GROUNDING (Bug #3)
  // - If provider humidity is null, do NOT allow claiming 0% humidity or hallucinated numbers.
  // - If provider humidity is positive, do NOT allow claiming 0% humidity.
  // =========================================================================
  if (current) {
    if (current.humidity === null) {
      const zeroOrInventedHumRegex = /(?:humidity(?:\s+is)?|relative\s+humidity(?:\s+is)?|aadrata|आर्द्रता)\s*(?:around|approx|approximately)?\s*(?:is\s*)?(\d{1,3}\s*%)/gi;
      if (zeroOrInventedHumRegex.test(correctedText)) {
        violationsDetected.push("Humidity percentage cited when provider humidity is null/unavailable. Discarded.");
        correctedText = correctedText.replace(zeroOrInventedHumRegex, "humidity is unavailable");
      }
    } else if (current.humidity > 0) {
      const zeroHumRegex = /(?:humidity(?:\s+is)?|relative\s+humidity(?:\s+is)?)\s*(?:is\s*)?0\s*%/gi;
      if (zeroHumRegex.test(correctedText)) {
        violationsDetected.push(`0% humidity cited when provider reported ${current.humidity}%. Corrected.`);
        correctedText = correctedText.replace(zeroHumRegex, `humidity is ${current.humidity}%`);
      }
    }
  }

  // =========================================================================
  // 6. ACTIVE RAIN VS FORECAST GROUNDING (Bug #2)
  // - High precipitation probability does NOT mean rain is currently falling.
  // - When current.rain === 0 && current.precipitation === 0, prohibit claiming
  //   active rain / downpour is occurring right now.
  // =========================================================================
  const rainNow = current ? (current.rain > 0 ? current.rain : current.precipitation > 0 ? current.precipitation : 0) : 0;
  if (rainNow === 0) {
    const activeRainZeroClaims = [
      /\b(?:active\s+rain\s*\(\s*0(?:\.0+)?\s*mm\/hr\s*\))/gi,
      /\b(?:active\s+rain\s+is\s+currently\s+falling|active\s+rain\s+falling\s+now|raining\s+right\s+now|it\s+is\s+currently\s+raining|heavy\s+downpour\s+occurring\s+now|downpour\s+is\s+underway|active\s+showers\s+falling\s+now)\b/gi,
      /\b(?:abhi\s+barish\s+ho\s+rahi\s+hai|abhi\s+tez\s+barish\s+pad\s+rahi\s+hai|वर्तमान\s+में\s+बारिश\s+हो\s+रही\s+है)\b/gi,
    ];
    activeRainZeroClaims.forEach((pattern) => {
      pattern.lastIndex = 0;
      if (pattern.test(correctedText)) {
        violationsDetected.push("Active rain claimed when current precipitation is 0 mm/hr. Grounded to dry current conditions.");
        pattern.lastIndex = 0;
        correctedText = correctedText.replace(pattern, "no rain is currently falling (dry conditions right now)");
      }
    });
  }

  // =========================================================================
  // 7. TRANSPORTATION, ROAD GRIP & WATERLOGGING GROUNDING (Bug #1)
  // - Disallow unsupported claims of slower vehicular transit, actual waterlogging,
  //   actual road grip degradation, or hazards affecting travel.
  // =========================================================================
  const unverifiedTrafficAssertions = [
    {
      pattern: /\b(?:expect\s+slower\s+vehicular\s+transit)\b/gi,
      replacement: "wet outdoor surfaces may increase travel caution (note: live vehicular transit speeds are not monitored)",
      reason: "Unsupported claim of slower vehicular transit.",
    },
    {
      pattern: /\b(?:potential\s+local\s+water-logging|potential\s+water-logging|local\s+water-logging|waterlogging\s+expected|roads\s+are\s+water-logged|waterlogged\s+roads)\b/gi,
      replacement: "localized water accumulation in low-lying sections may be possible if precipitation occurs",
      reason: "Definitive waterlogging assertions prohibited without municipal sensor data.",
    },
    {
      pattern: /\b(?:water\s+accumulation\s+and\s+reduced\s+road\s+grip\s+likely|road\s+grip\s+likely\s+affected|road\s+grip\s+is\s+reduced|poor\s+road\s+grip)\b/gi,
      replacement: "wet surfaces may increase the possibility of reduced tire traction",
      reason: "Asserting actual road grip without pavement telemetry is prohibited.",
    },
    {
      pattern: /\b(?:hazards\s+are\s+affecting\s+travel|severe\s+weather\s+is\s+affecting\s+travel)\b/gi,
      replacement: "weather conditions present potential factors for travel planning",
      reason: "Claiming hazards are actively affecting travel without live transport data is prohibited.",
    },
    {
      pattern: /\b(?:heavy\s+traffic\s+congestion|traffic\s+congestion|heavy\s+traffic\s+jam|massive\s+traffic\s+jam|traffic\s+jam|highway\s+is\s+blocked|roads\s+are\s+completely\s+blocked)\b/gi,
      replacement: "potential weather-related travel slowdowns",
      reason: "Live traffic congestion claims are prohibited without live traffic API data.",
    },
    {
      pattern: /\b(?:roads\s+are\s+flooded|highways\s+are\s+flooded|flooded\s+highway|flooded\s+roads)\b/gi,
      replacement: "wet roads or risk of localized water accumulation",
      reason: "Definitive road flooding assertions prohibited without infrastructure sensor data.",
    },
    {
      pattern: /\b(?:flights\s+are\s+cancelled|flights\s+are\s+delayed|trains\s+are\s+cancelled|trains\s+are\s+delayed)\b/gi,
      replacement: "atmospheric conditions may potentially affect flight/train schedules (please verify with operating carriers)",
      reason: "Definitive flight or train schedule disruption claims prohibited without live transit API.",
    },
  ];

  unverifiedTrafficAssertions.forEach(({ pattern, replacement, reason }) => {
    pattern.lastIndex = 0;
    if (pattern.test(correctedText)) {
      violationsDetected.push(reason);
      pattern.lastIndex = 0;
      correctedText = correctedText.replace(pattern, replacement);
    }
  });

  // If the query or context involves travel/routes, ensure the explicit disclaimer is included
  const isTravelQuery =
    context.travel !== undefined ||
    /\b(travel|route|driving|highway|drive|flight|train|safar|yatra|nh48|road trip)\b/i.test(context.userQuery);

  if (isTravelQuery && !correctedText.includes("*(Note: Travel advice is based purely on atmospheric")) {
    correctedText = `${correctedText.trim()}\n\n${TRAVEL_DISCLAIMER}`;
  }

  return {
    isValid: violationsDetected.length === 0,
    correctedText,
    violationsDetected,
    repairedFields,
  };
}

/**
 * Validates that the generated response is strictly about the requested location,
 * and does not mention known hallucinated foreign locations (such as Give, South Denmark, etc.)
 */
export function checkLocationConsistency(
  text: string,
  targetLocation?: { name: string; country?: string; countryCode?: string }
): { isConsistent: boolean; mismatchWarning?: string } {
  if (!targetLocation) return { isConsistent: true };

  const foreignHallucinations = [
    { name: "Give, South Denmark", regex: /\bGive,?\s+South\s+Denmark\b/i },
    { name: "South Denmark", regex: /\bSouth\s+Denmark\b/i },
    { name: "Reykjavík", regex: /\bReykjav[ií]k\b/i },
    { name: "Denmark", regex: /\bDenmark\b/i },
  ];

  if (targetLocation.countryCode !== "DK" && targetLocation.country !== "Denmark") {
    for (const h of foreignHallucinations) {
      if (h.regex.test(text)) {
        return {
          isConsistent: false,
          mismatchWarning: `Detected hallucinated foreign location '${h.name}' in response when target location is '${targetLocation.name}, ${targetLocation.country}'.`,
        };
      }
    }
  }

  return { isConsistent: true };
}
