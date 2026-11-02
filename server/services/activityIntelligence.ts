import { ActivityAnalysis, ActivityType, CurrentWeatherData, DailyForecastItem, HourlyForecastItem } from "../types.js";

interface ActivityProfile {
  name: string;
  evaluator: (current: CurrentWeatherData, hourly?: HourlyForecastItem[], daily?: DailyForecastItem[]) => ActivityAnalysis;
}

export function evaluateActivity(
  activity: ActivityType,
  current: CurrentWeatherData,
  hourly?: HourlyForecastItem[],
  daily?: DailyForecastItem[]
): ActivityAnalysis {
  switch (activity) {
    case "cricket":
      return evaluateCricket(current, hourly);
    case "running":
      return evaluateRunning(current, hourly);
    case "cycling":
      return evaluateCycling(current, hourly);
    case "football":
      return evaluateFootball(current, hourly);
    case "walking":
      return evaluateWalking(current, hourly);
    case "hiking":
      return evaluateHiking(current, hourly);
    case "picnic":
      return evaluatePicnic(current, hourly);
    case "photography":
      return evaluatePhotography(current, hourly);
    case "gardening":
      return evaluateGardening(current, hourly);
    case "outdoor_events":
      return evaluateOutdoorEvents(current, hourly);
    default:
      return evaluateGeneralOutdoor(current, hourly);
  }
}

function findBestWindow(hourly?: HourlyForecastItem[], preferMorning: boolean = true): string | undefined {
  if (!hourly || hourly.length === 0) return undefined;
  // Look for 3-hour stretch with lowest rain and comfortable temp (18-30°C)
  let bestHour = "";
  let bestScore = -1;

  for (const h of hourly.slice(0, 18)) {
    let score = 100;
    score -= h.precipitationProbability * 0.8;
    score -= h.rain * 10;
    if (h.temperature > 35) score -= (h.temperature - 35) * 4;
    if (h.temperature < 15) score -= (15 - h.temperature) * 2;
    if (h.windSpeed > 30) score -= (h.windSpeed - 30) * 2;

    const hourNum = new Date(h.time).getHours();
    if (preferMorning && hourNum >= 6 && hourNum <= 10) score += 15;
    if (!preferMorning && hourNum >= 16 && hourNum <= 19) score += 15;

    if (score > bestScore) {
      bestScore = score;
      bestHour = h.formattedTime;
    }
  }

  return bestHour ? `Optimal window: around ${bestHour} with lower precipitation and milder thermal load` : undefined;
}

function evaluateCricket(current: CurrentWeatherData, hourly?: HourlyForecastItem[]): ActivityAnalysis {
  const reasons: string[] = [];
  const factors: ActivityAnalysis["weatherFactors"] = [];
  let score = 100;

  // Rain is critical for cricket (pitch damage, ball grip, player safety)
  if (current.rain > 0.5 || current.precipitationProbability > 60) {
    score -= 60;
    reasons.push("Wet pitch and slick ball significantly impede match play and ball tracking.");
    factors.push({ factor: "Rain & Pitch", value: `${current.rain} mm (${current.precipitationProbability}% prob)`, impact: "negative" });
  } else if (current.precipitationProbability > 30) {
    score -= 20;
    reasons.push("Overcast skies with moderate rain risk; keep ground covers accessible.");
    factors.push({ factor: "Rain Risk", value: `${current.precipitationProbability}% probability`, impact: "neutral" });
  } else {
    factors.push({ factor: "Ground Moisture", value: "Dry outfield", impact: "positive" });
  }

  // Heat & dehydration in Indian conditions
  if (current.temperature >= 38 || current.feelsLike >= 42) {
    score -= 35;
    reasons.push(`Intense heat (${current.temperature}°C, feels like ${current.feelsLike}°C) creates severe heat exhaustion risk for bowlers and fielders.`);
    factors.push({ factor: "Heat Index", value: `${current.temperature}°C (feels ${current.feelsLike}°C)`, impact: "negative" });
  } else if (current.temperature >= 32) {
    score -= 15;
    reasons.push("Warm conditions; frequent water breaks and boundary rotation essential.");
    factors.push({ factor: "Temperature", value: `${current.temperature}°C`, impact: "neutral" });
  } else {
    factors.push({ factor: "Temperature", value: `${current.temperature}°C (Comfortable)`, impact: "positive" });
  }

  // Visibility / Light
  if (current.visibility !== null && current.visibility !== undefined && current.visibility < 3000) {
    score -= 25;
    reasons.push("Reduced visibility may cause difficulty sighting high catches and fast deliveries.");
    factors.push({ factor: "Sightline Visibility", value: `${(current.visibility / 1000).toFixed(1)} km`, impact: "negative" });
  }

  score = Math.max(10, Math.min(100, score));
  const suitability = score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 45 ? "fair" : score >= 30 ? "poor" : "unfavorable";
  const riskLevel = score < 40 ? "high" : score < 65 ? "moderate" : "low";

  return {
    activity: "cricket",
    activityName: "Cricket",
    suitability,
    suitabilityScore: score,
    riskLevel,
    primaryReasons: reasons.length > 0 ? reasons : ["Weather conditions are well-suited for batting, bowling, and outfield fielding."],
    weatherFactors: factors,
    bestTimeWindow: findBestWindow(hourly, true),
    tips: [
      "Ensure sufficient electrolyte hydration every 30-40 minutes.",
      "Inspect pitch hardness and crease footing before the toss.",
      "Wear wide-brim hats or caps with UV-rated sports sunglasses.",
    ],
  };
}

function evaluateRunning(current: CurrentWeatherData, hourly?: HourlyForecastItem[]): ActivityAnalysis {
  const reasons: string[] = [];
  const factors: ActivityAnalysis["weatherFactors"] = [];
  let score = 100;

  // Temperature
  if (current.temperature > 34 || current.feelsLike > 38) {
    score -= 45;
    reasons.push("High heat and humidity drastically increase cardiac strain during endurance running.");
    factors.push({ factor: "Thermal Strain", value: `${current.temperature}°C (Feels ${current.feelsLike}°C)`, impact: "negative" });
  } else if (current.temperature >= 15 && current.temperature <= 24) {
    factors.push({ factor: "Running Temperature", value: `${current.temperature}°C (Ideal band)`, impact: "positive" });
  } else if (current.temperature < 10) {
    score -= 10;
    reasons.push("Chilly air requires warm-up layers to prevent muscle tightness.");
    factors.push({ factor: "Chilly Air", value: `${current.temperature}°C`, impact: "neutral" });
  }

  // Humidity
  if (current.humidity !== null && current.humidity > 80 && current.temperature > 26) {
    score -= 20;
    reasons.push("High humidity suppresses sweat evaporation, leading to faster overheating.");
    factors.push({ factor: "Relative Humidity", value: `${current.humidity}%`, impact: "negative" });
  }

  // Rain & Outdoor Grip
  if (current.rain > 3) {
    score -= 30;
    reasons.push("Active rainfall creates wet running paths and damp footwear.");
    factors.push({ factor: "Rainfall", value: `${current.rain} mm/hr`, impact: "negative" });
  }

  // Air / Visibility
  if (current.visibility !== null && current.visibility !== undefined && current.visibility < 2000) {
    score -= 15;
    reasons.push("Poor air visibility requires bright reflective clothing near road traffic.");
    factors.push({ factor: "Visibility", value: `${(current.visibility / 1000).toFixed(1)} km`, impact: "neutral" });
  }

  score = Math.max(15, Math.min(100, score));
  const suitability = score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 45 ? "fair" : score >= 30 ? "poor" : "unfavorable";
  const riskLevel = score < 40 ? "high" : score < 65 ? "moderate" : "low";

  return {
    activity: "running",
    activityName: "Running & Jogging",
    suitability,
    suitabilityScore: score,
    riskLevel,
    primaryReasons: reasons.length > 0 ? reasons : ["Optimal ambient temperature and moderate breeze for outdoor running."],
    weatherFactors: factors,
    bestTimeWindow: findBestWindow(hourly, true),
    tips: [
      "Early morning hours (6:00 AM - 7:30 AM) offer lowest thermal index and cleaner air.",
      "Stay well-hydrated before starting; carry a handheld bottle for runs over 5 km.",
      "Wear breathable moisture-wicking technical fabrics.",
    ],
  };
}

function evaluateCycling(current: CurrentWeatherData, hourly?: HourlyForecastItem[]): ActivityAnalysis {
  const reasons: string[] = [];
  const factors: ActivityAnalysis["weatherFactors"] = [];
  let score = 100;

  // Wind speed is huge for cycling
  if (current.windSpeed > 35 || current.windGusts > 45) {
    score -= 40;
    reasons.push(`Strong crosswinds (${current.windSpeed} km/h, gusts ${current.windGusts} km/h) threaten balance and increase bike drag.`);
    factors.push({ factor: "Wind & Gusts", value: `${current.windSpeed} km/h (Gusts ${current.windGusts})`, impact: "negative" });
  } else if (current.windSpeed < 15) {
    factors.push({ factor: "Wind Resistance", value: `${current.windSpeed} km/h (Gentle)`, impact: "positive" });
  }

  // Rain / Precipitation Risk
  if (current.rain > 1 || current.precipitationProbability > 60) {
    score -= 35;
    reasons.push("Active rain and elevated precipitation probability increase exposure to inclement cycling conditions.");
    factors.push({ factor: "Precipitation Risk", value: `${current.precipitationProbability}% rain chance`, impact: "negative" });
  }

  // Temperature
  if (current.temperature > 37) {
    score -= 30;
    reasons.push(`High ambient temperature (${current.temperature}°C) and thermal strain accelerate fatigue during extended outdoor cycling.`);
    factors.push({ factor: "Thermal Strain", value: `${current.temperature}°C`, impact: "negative" });
  }

  score = Math.max(15, Math.min(100, score));
  const suitability = score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 45 ? "fair" : score >= 30 ? "poor" : "unfavorable";
  const riskLevel = score < 45 ? "high" : score < 65 ? "moderate" : "low";

  return {
    activity: "cycling",
    activityName: "Cycling",
    suitability,
    suitabilityScore: score,
    riskLevel,
    primaryReasons: reasons.length > 0 ? reasons : ["Favorable wind speeds and low precipitation risk for cycling."],
    weatherFactors: factors,
    bestTimeWindow: findBestWindow(hourly, true),
    tips: [
      "Check tire pressure and disc brake responsiveness prior to departure.",
      "Use front white and rear flashing red lights even in daytime if haze is present.",
      "Carry weather-appropriate layers and remain cautious if sudden precipitation occurs.",
    ],
  };
}

function evaluateFootball(current: CurrentWeatherData, hourly?: HourlyForecastItem[]): ActivityAnalysis {
  const reasons: string[] = [];
  const factors: ActivityAnalysis["weatherFactors"] = [];
  let score = 100;

  if (current.weatherCode >= 95) {
    score -= 75;
    reasons.push("Active or impending thunderstorm with lightning; outdoor field sports are strictly hazardous.");
    factors.push({ factor: "Thunderstorm / Lightning", value: "Severe Hazard", impact: "negative" });
  }

  if (current.temperature > 36 || current.feelsLike > 40) {
    score -= 40;
    reasons.push("High heat index requires shortened halves and mandatory hydration stops.");
    factors.push({ factor: "Heat Index", value: `${current.feelsLike}°C`, impact: "negative" });
  }

  if (current.rain > 5) {
    score -= 30;
    reasons.push("Heavy rainfall leads to waterlogged turf and irregular ball roll.");
    factors.push({ factor: "Pitch Waterlogging", value: `${current.rain} mm/hr`, impact: "negative" });
  } else if (current.rain > 0.5) {
    score -= 10;
    reasons.push("Light rain causes fast slick turf but is generally playable with appropriate stud cleats.");
    factors.push({ factor: "Light Drizzle", value: "Playable with caution", impact: "neutral" });
  }

  score = Math.max(10, Math.min(100, score));
  const suitability = score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 45 ? "fair" : score >= 30 ? "poor" : "unfavorable";
  return {
    activity: "football",
    activityName: "Football / Soccer",
    suitability,
    suitabilityScore: score,
    riskLevel: score < 45 ? "high" : score < 65 ? "moderate" : "low",
    primaryReasons: reasons.length > 0 ? reasons : ["Good turf traction and temperate climate for a football match."],
    weatherFactors: factors,
    bestTimeWindow: findBestWindow(hourly, false),
    tips: ["Wear molded studs suitable for current ground hardness.", "Schedule water stops every 20-25 minutes."],
  };
}

function evaluatePicnic(current: CurrentWeatherData, hourly?: HourlyForecastItem[]): ActivityAnalysis {
  const reasons: string[] = [];
  const factors: ActivityAnalysis["weatherFactors"] = [];
  let score = 100;

  if (current.precipitationProbability > 40 || current.rain > 0) {
    score -= 45;
    reasons.push("Rain threat makes outdoor lawn seating and dining impractical without covered pavilion shelter.");
    factors.push({ factor: "Rain Chance", value: `${current.precipitationProbability}%`, impact: "negative" });
  }

  if (current.windSpeed > 25) {
    score -= 25;
    reasons.push("Gusty winds may blow away picnic blankets, food containers, and parasols.");
    factors.push({ factor: "Wind", value: `${current.windSpeed} km/h`, impact: "negative" });
  }

  if (current.temperature > 35 || current.feelsLike > 38) {
    score -= 35;
    reasons.push("Oppressive afternoon heat limits comfortable sitting on open lawns.");
    factors.push({ factor: "Heat", value: `${current.temperature}°C`, impact: "negative" });
  } else if (current.temperature >= 20 && current.temperature <= 29 && (current.humidity === null || current.humidity < 65)) {
    factors.push({ factor: "Lawn Comfort", value: "Ideal pleasant weather", impact: "positive" });
  }

  score = Math.max(15, Math.min(100, score));
  const suitability = score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 45 ? "fair" : score >= 30 ? "poor" : "unfavorable";
  return {
    activity: "picnic",
    activityName: "Picnic & Leisure",
    suitability,
    suitabilityScore: score,
    riskLevel: score < 50 ? "high" : score < 70 ? "moderate" : "low",
    primaryReasons: reasons.length > 0 ? reasons : ["Mild temperatures, clear skies, and calm winds make this an excellent day for a picnic."],
    weatherFactors: factors,
    bestTimeWindow: findBestWindow(hourly, false),
    tips: ["Choose shaded spots under broad trees.", "Bring a waterproof ground sheet beneath the picnic blanket."],
  };
}

function evaluateHiking(current: CurrentWeatherData, hourly?: HourlyForecastItem[]): ActivityAnalysis {
  const reasons: string[] = [];
  const factors: ActivityAnalysis["weatherFactors"] = [];
  let score = 100;

  if (current.weatherCode >= 95) {
    score -= 70;
    reasons.push("Severe thunderstorm and lightning hazard on exposed ridges and hill trails.");
    factors.push({ factor: "Storm Risk", value: "Severe", impact: "negative" });
  }

  if (current.rain > 3 || current.precipitationProbability > 65) {
    score -= 40;
    reasons.push("Elevated precipitation probability and rainfall create challenging outdoor hiking conditions.");
    factors.push({ factor: "Precipitation Risk", value: `${current.precipitationProbability}% rain chance`, impact: "negative" });
  }

  if (current.visibility !== null && current.visibility !== undefined && current.visibility < 2000) {
    score -= 30;
    reasons.push("Dense fog or mist obscures trail markings and ridge viewpoints.");
    factors.push({ factor: "Trail Visibility", value: `${(current.visibility / 1000).toFixed(1)} km`, impact: "negative" });
  }

  score = Math.max(10, Math.min(100, score));
  const suitability = score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 45 ? "fair" : score >= 30 ? "poor" : "unfavorable";
  return {
    activity: "hiking",
    activityName: "Hiking & Trekking",
    suitability,
    suitabilityScore: score,
    riskLevel: score < 45 ? "high" : score < 65 ? "moderate" : "low",
    primaryReasons: reasons.length > 0 ? reasons : ["Clear mountain sightlines, calm winds, and stable weather for hiking."],
    weatherFactors: factors,
    bestTimeWindow: findBestWindow(hourly, true),
    tips: ["Always inform someone of your route and estimated turnaround time.", "Pack headlamp, thermal layer, and waterproof rain shell."],
  };
}

function evaluatePhotography(current: CurrentWeatherData, hourly?: HourlyForecastItem[]): ActivityAnalysis {
  const reasons: string[] = [];
  const factors: ActivityAnalysis["weatherFactors"] = [];
  let score = 85;

  if (current.visibility !== null && current.visibility !== undefined) {
    if (current.visibility > 10000) {
      score += 10;
      factors.push({ factor: "Atmospheric Clarity", value: `${(current.visibility / 1000).toFixed(0)} km (Crystal clear)`, impact: "positive" });
    } else if (current.visibility < 3000) {
      score -= 20;
      reasons.push("Haze or heavy fog limits landscape depth and background contrast.");
      factors.push({ factor: "Haze / Fog", value: `${(current.visibility / 1000).toFixed(1)} km`, impact: "negative" });
    }
  }

  if (current.cloudCover >= 30 && current.cloudCover <= 70) {
    score += 10;
    factors.push({ factor: "Cloud Texture", value: `${current.cloudCover}% (Dramatic skies)`, impact: "positive" });
  }

  if (current.rain > 5) {
    score -= 35;
    reasons.push("Heavy downpour risks water damage to camera bodies and lens elements.");
    factors.push({ factor: "Precipitation", value: `${current.rain} mm`, impact: "negative" });
  }

  score = Math.max(20, Math.min(100, score));
  const suitability = score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 45 ? "fair" : score >= 30 ? "poor" : "unfavorable";
  return {
    activity: "photography",
    activityName: "Outdoor Photography",
    suitability,
    suitabilityScore: score,
    riskLevel: score < 50 ? "high" : score < 70 ? "moderate" : "low",
    primaryReasons: reasons.length > 0 ? reasons : ["Good ambient lighting and clean sightlines for photography."],
    weatherFactors: factors,
    bestTimeWindow: `Golden hour: ${current.sunrise.slice(11, 16)} AM or ${current.sunset.slice(11, 16)} PM`,
    tips: ["Use lens hoods to mitigate harsh flare during high midday sun.", "Carry a silica gel pouch and weather-sealed rain sleeve for sudden drizzle."],
  };
}

function evaluateGardening(current: CurrentWeatherData, hourly?: HourlyForecastItem[]): ActivityAnalysis {
  const score = current.rain > 10 || current.temperature > 39 ? 35 : current.temperature > 32 ? 65 : 85;
  return {
    activity: "gardening",
    activityName: "Gardening & Plant Care",
    suitability: score >= 75 ? "good" : score >= 50 ? "fair" : "poor",
    suitabilityScore: score,
    riskLevel: score < 50 ? "moderate" : "low",
    primaryReasons: current.temperature > 35 ? ["Midday heat risks transplant shock and rapid moisture loss."] : ["Good soil moisture and manageable ambient temperature."],
    weatherFactors: [
      { factor: "Temperature", value: `${current.temperature}°C`, impact: current.temperature > 35 ? "negative" : "positive" },
      { factor: "Soil Moisture Condition", value: current.humidity !== null ? `${current.humidity}% humidity` : "Normal range", impact: "positive" },
    ],
    bestTimeWindow: findBestWindow(hourly, true),
    tips: ["Water root zones in the early morning to minimize fungal evaporation loss."],
  };
}

function evaluateWalking(current: CurrentWeatherData, hourly?: HourlyForecastItem[]): ActivityAnalysis {
  const analysis = evaluateRunning(current, hourly);
  analysis.activity = "walking";
  analysis.activityName = "Walking & Strolling";
  analysis.suitabilityScore = Math.min(100, analysis.suitabilityScore + 10);
  if (analysis.suitabilityScore >= 80) analysis.suitability = "excellent";
  return analysis;
}

function evaluateOutdoorEvents(current: CurrentWeatherData, hourly?: HourlyForecastItem[]): ActivityAnalysis {
  const analysis = evaluatePicnic(current, hourly);
  analysis.activity = "outdoor_events";
  analysis.activityName = "Outdoor Events & Gatherings";
  return analysis;
}

function evaluateGeneralOutdoor(current: CurrentWeatherData, hourly?: HourlyForecastItem[]): ActivityAnalysis {
  const score = current.rain > 5 || current.temperature > 40 ? 30 : current.rain > 1 || current.temperature > 34 ? 60 : 85;
  return {
    activity: "general",
    activityName: "General Outdoor Activities",
    suitability: score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 45 ? "fair" : "poor",
    suitabilityScore: score,
    riskLevel: score < 50 ? "moderate" : "low",
    primaryReasons: [`Current temperature is ${current.temperature}°C, rain probability ${current.precipitationProbability}%.`],
    weatherFactors: [
      { factor: "Temperature", value: `${current.temperature}°C`, impact: "positive" },
      { factor: "Precipitation", value: `${current.precipitationProbability}%`, impact: current.precipitationProbability > 40 ? "negative" : "positive" },
    ],
    bestTimeWindow: findBestWindow(hourly, true),
    tips: ["Carry drinking water and check forecasts before embarking on long outdoor plans."],
  };
}
