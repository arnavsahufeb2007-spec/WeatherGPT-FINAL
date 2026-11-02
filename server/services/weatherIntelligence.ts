import { CurrentWeatherData, DailyForecastItem, HourlyForecastItem, WeatherAdvisory, WeatherAnalysis } from "../types.js";

export function analyzeWeather(current: CurrentWeatherData, hourly?: HourlyForecastItem[], daily?: DailyForecastItem[]): WeatherAnalysis {
  // 1. Rain Risk Analysis
  let rainRisk: WeatherAnalysis["rainRisk"] = "none";
  let rainRiskLabel = "No rain expected";

  const precipProb = current.precipitationProbability;
  const rainAmount = current.rain || current.precipitation;

  if (rainAmount > 15 || precipProb > 85) {
    rainRisk = "extreme";
    rainRiskLabel = "Extreme rain risk / Heavy downpour";
  } else if (rainAmount > 5 || precipProb > 65) {
    rainRisk = "high";
    rainRiskLabel = "High rain likelihood; wet conditions probable";
  } else if (rainAmount > 1 || precipProb > 40) {
    rainRisk = "moderate";
    rainRiskLabel = "Moderate rain risk; showers possible";
  } else if (precipProb > 15 || rainAmount > 0) {
    rainRisk = "low";
    rainRiskLabel = "Low chance of light sprinkles";
  }

  // 2. Heat Risk Analysis (Apparent temperature / Heat Index)
  let heatRisk: WeatherAnalysis["heatRisk"] = "normal";
  let heatRiskLabel = "Normal comfortable temperature";

  const feelsLike = current.feelsLike;
  if (feelsLike >= 45 || current.temperature >= 44) {
    heatRisk = "extreme_danger";
    heatRiskLabel = "Extreme Danger: High risk of heat stroke / severe heatwave";
  } else if (feelsLike >= 40 || current.temperature >= 40) {
    heatRisk = "danger";
    heatRiskLabel = "Heat Danger: Prolonged outdoor exposure hazardous";
  } else if (feelsLike >= 35 || current.temperature >= 36) {
    heatRisk = "extreme_caution";
    heatRiskLabel = "Extreme Caution: Heat cramps and exhaustion possible";
  } else if (feelsLike >= 30 || current.temperature >= 32) {
    heatRisk = "caution";
    heatRiskLabel = "Caution: Warm and humid; stay hydrated";
  }

  // 3. Wind Risk Analysis
  let windRisk: WeatherAnalysis["windRisk"] = "calm";
  let windRiskLabel = "Calm to gentle breeze";

  const wind = current.windSpeed;
  const gusts = current.windGusts;

  if (wind >= 55 || gusts >= 70) {
    windRisk = "gale";
    windRiskLabel = "Dangerous gale-force winds or severe gusts";
  } else if (wind >= 38 || gusts >= 50) {
    windRisk = "windy";
    windRiskLabel = "Strong gusty winds; outdoor disturbance";
  } else if (wind >= 20 || gusts >= 30) {
    windRisk = "breezy";
    windRiskLabel = "Noticeable breeze; pleasant to fresh";
  }

  // 4. UV Risk Analysis
  let uvRisk: WeatherAnalysis["uvRisk"] = "low";
  let uvRiskLabel = "Low UV (0-2): Minimal sun protection needed";

  const uv = current.uvIndex;
  if (uv >= 11) {
    uvRisk = "extreme";
    uvRiskLabel = "Extreme UV (11+): Sunburn in minutes; avoid midday sun";
  } else if (uv >= 8) {
    uvRisk = "very_high";
    uvRiskLabel = "Very High UV (8-10): Extra protection required, seek shade";
  } else if (uv >= 6) {
    uvRisk = "high";
    uvRiskLabel = "High UV (6-7): Hat, sunscreen SPF 30+, and sunglasses needed";
  } else if (uv >= 3) {
    uvRisk = "moderate";
    uvRiskLabel = "Moderate UV (3-5): Sun protection recommended";
  }

  // 5. Visibility Risk Analysis
  let visibilityRisk: WeatherAnalysis["visibilityRisk"] = "good";
  let visibilityRiskLabel = "Good visibility (>10 km)";

  const vis = current.visibility;
  if (vis === null || vis === undefined) {
    visibilityRisk = "moderate";
    visibilityRiskLabel = "Visibility observation unavailable";
  } else if (vis < 1000) {
    visibilityRisk = "dense_fog";
    visibilityRiskLabel = "Dense fog (<1 km): Severe driving and travel hazard";
  } else if (vis < 4000) {
    visibilityRisk = "poor";
    visibilityRiskLabel = "Poor visibility (1-4 km): Mist, smog, or haze";
  } else if (vis < 10000) {
    visibilityRisk = "moderate";
    visibilityRiskLabel = "Moderate visibility (4-10 km)";
  }

  // 6. Comfort Index
  let comfortIndex: WeatherAnalysis["comfortIndex"] = "pleasant";
  let comfortLabel = "Pleasant and balanced";

  if (feelsLike <= 5) {
    comfortIndex = "freezing";
    comfortLabel = "Freezing / Very cold";
  } else if (feelsLike <= 16) {
    comfortIndex = "cold";
    comfortLabel = "Cool / Crisp";
  } else if (feelsLike <= 27 && (current.humidity === null || current.humidity <= 65)) {
    comfortIndex = "pleasant";
    comfortLabel = "Pleasant, mild, and comfortable";
  } else if (feelsLike <= 32) {
    comfortIndex = "warm";
    comfortLabel = "Warm, lightly humid";
  } else if (feelsLike <= 38 || (current.temperature > 28 && current.humidity !== null && current.humidity > 70)) {
    comfortIndex = "humid_muggy";
    comfortLabel = "Muggy and oppressive humidity";
  } else {
    comfortIndex = "scorching";
    comfortLabel = "Scorching and intense heat";
  }

  // 7. Overall Outdoor Suitability Score (0 - 100)
  let score = 100;

  // Deduct for rain
  if (rainRisk === "extreme") score -= 55;
  else if (rainRisk === "high") score -= 40;
  else if (rainRisk === "moderate") score -= 20;
  else if (rainRisk === "low") score -= 5;

  // Deduct for extreme heat or cold
  if (heatRisk === "extreme_danger") score -= 50;
  else if (heatRisk === "danger") score -= 35;
  else if (heatRisk === "extreme_caution") score -= 20;
  else if (heatRisk === "caution") score -= 10;
  if (feelsLike < 5) score -= 30;
  else if (feelsLike < 12) score -= 10;

  // Deduct for wind
  if (windRisk === "gale") score -= 40;
  else if (windRisk === "windy") score -= 20;

  // Deduct for UV
  if (uvRisk === "extreme") score -= 20;
  else if (uvRisk === "very_high") score -= 12;

  // Deduct for visibility
  if (visibilityRisk === "dense_fog") score -= 35;
  else if (visibilityRisk === "poor") score -= 15;

  score = Math.max(10, Math.min(100, score));

  const humidityDisplay = current.humidity !== null && current.humidity !== undefined
    ? `humidity is ${current.humidity}%`
    : "humidity unavailable";

  const summary = `Current conditions are ${current.condition.toLowerCase()} with ${current.temperature}°C (feels like ${current.feelsLike}°C). Rain probability is ${current.precipitationProbability}%, ${humidityDisplay}, wind is ${current.windSpeed} km/h, and UV index is ${current.uvIndex}. Overall outdoor rating: ${score}/100.`;

  return {
    rainRisk,
    rainRiskLabel,
    heatRisk,
    heatRiskLabel,
    windRisk,
    windRiskLabel,
    uvRisk,
    uvRiskLabel,
    visibilityRisk,
    visibilityRiskLabel,
    comfortIndex,
    comfortLabel,
    summary,
    outdoorSuitabilityScore: score,
  };
}

export function generateAdvisories(
  locationName: string,
  current: CurrentWeatherData,
  hourly?: HourlyForecastItem[],
  daily?: DailyForecastItem[]
): WeatherAdvisory[] {
  const advisories: WeatherAdvisory[] = [];

  // Heatwave / Extreme Heat
  if (current.temperature >= 40 || current.feelsLike >= 42) {
    advisories.push({
      id: `adv_heat_${Date.now()}`,
      type: "heat",
      severity: current.temperature >= 44 ? "extreme" : "severe",
      title: "WeatherGPT Heat Stress Advisory",
      description: `Temperature is ${current.temperature}°C with heat index of ${current.feelsLike}°C. Intense solar radiation and thermal stress present.`,
      recommendation: "Avoid direct outdoor sunlight between 11 AM - 4 PM. Drink water, ORS or electrolytes, and wear loose cotton clothing.",
      timeframe: "Current & Afternoon peak",
      locationName,
      isOfficial: false,
    });
  }

  // Rain & Precipitation Advisories
  const activeRainAmount = current.rain > 0 ? current.rain : current.precipitation > 0 ? current.precipitation : 0;
  const next6HoursRain = hourly?.slice(0, 6).some((h) => h.rain > 5 || h.precipitationProbability > 75);

  if (activeRainAmount > 0) {
    // Condition A: Active precipitation is currently falling
    advisories.push({
      id: `adv_rain_${Date.now()}`,
      type: "rain",
      severity: activeRainAmount > 15 ? "extreme" : activeRainAmount > 5 ? "severe" : "moderate",
      title: activeRainAmount > 15 ? "WeatherGPT Heavy Downpour Advisory" : "WeatherGPT Active Rain Advisory",
      description: `Active rain of ${activeRainAmount} mm/hr is currently falling. Wet road surfaces may increase the possibility of reduced tire traction or localized water accumulation in low-lying sections.`,
      recommendation: "Carry waterproof gear and allow extra time for travel. Note: WeatherGPT advisories are derived from atmospheric observations and do not monitor live traffic congestion, road closures, or flood gauges.",
      timeframe: "Active now",
      locationName,
      isOfficial: false,
    });
  } else if (current.precipitationProbability >= 75 || next6HoursRain) {
    // Condition B: No precipitation currently falling (0 mm/hr), but high forecast probability or upcoming rain
    const upcomingHeavyRain = hourly?.slice(0, 6).some((h) => h.rain > 10);
    advisories.push({
      id: `adv_rain_prob_${Date.now()}`,
      type: "rain",
      severity: upcomingHeavyRain ? "severe" : "moderate",
      title: "WeatherGPT Precipitation Risk Advisory (Forecast)",
      description: `No active rain is currently falling (0 mm/hr), but atmospheric conditions indicate a ${current.precipitationProbability}% probability of precipitation during the forecast window. If rain commences, wet surfaces may increase the possibility of reduced tire traction.`,
      recommendation: "Keep an umbrella or waterproof outerwear accessible. For real-time highway conditions or road flooding, check local transport authorities.",
      timeframe: "Upcoming hours (Forecast)",
      locationName,
      isOfficial: false,
    });
  }

  // Strong Wind / Gusts
  if (current.windSpeed >= 40 || current.windGusts >= 55) {
    advisories.push({
      id: `adv_wind_${Date.now()}`,
      type: "wind",
      severity: current.windGusts >= 65 ? "severe" : "moderate",
      title: "WeatherGPT High Wind Advisory",
      description: `Wind speeds reaching ${current.windSpeed} km/h with gusts up to ${current.windGusts} km/h.`,
      recommendation: "Secure loose outdoor fixtures and temporary signage. Two-wheeler riders and cyclists should exercise extra caution.",
      timeframe: "Active now",
      locationName,
      isOfficial: false,
    });
  }

  // Dense Fog / Poor Visibility
  if (current.visibility !== null && current.visibility !== undefined && current.visibility < 1500) {
    advisories.push({
      id: `adv_fog_${Date.now()}`,
      type: "fog",
      severity: current.visibility < 600 ? "severe" : "moderate",
      title: "WeatherGPT Low Visibility Advisory",
      description: `Visibility dropped to ${(current.visibility / 1000).toFixed(1)} km due to fog/mist/particulate haze.`,
      recommendation: "Use low-beam headlights, maintain safe following distance, and avoid overtaking on unlit highways.",
      timeframe: "Early morning / Night hours",
      locationName,
      isOfficial: false,
    });
  }

  // High UV Advisory
  if (current.uvIndex >= 8 && current.isDay) {
    advisories.push({
      id: `adv_uv_${Date.now()}`,
      type: "uv",
      severity: current.uvIndex >= 11 ? "extreme" : "moderate",
      title: "WeatherGPT Very High UV Index Advisory",
      description: `UV Index is measured at ${current.uvIndex}. Unprotected skin damage can occur rapidly.`,
      recommendation: "Apply broad-spectrum sunscreen (SPF 30+), wear UV-filtering sunglasses, and seek shade during midday hours.",
      timeframe: "Midday sun window (10:30 AM - 3:30 PM)",
      locationName,
      isOfficial: false,
    });
  }

  // Thunderstorm & Severe Convective Storms
  if ([95, 96, 99].includes(current.weatherCode)) {
    advisories.push({
      id: `adv_storm_${Date.now()}`,
      type: "storm",
      severity: current.weatherCode === 99 ? "extreme" : "severe",
      title: "WeatherGPT Thunderstorm & Lightning Advisory",
      description: `Active convective electrical activity and storm cells detected in ${locationName}. High wind gusts and localized heavy downpours possible.`,
      recommendation: "Seek sturdy indoor shelter immediately. Stay away from isolated trees, metal fences, open balconies, and avoid standing near water bodies.",
      timeframe: "Active now",
      locationName,
      isOfficial: false,
    });
  }

  // Extreme Cold & Frost Advisory
  if (current.temperature <= 5 || current.feelsLike <= 3) {
    advisories.push({
      id: `adv_cold_${Date.now()}`,
      type: "cold",
      severity: current.temperature <= 0 ? "extreme" : "severe",
      title: current.temperature <= 0 ? "WeatherGPT Freezing Conditions Advisory" : "WeatherGPT Cold Stress Advisory",
      description: `Ambient temperature is ${current.temperature}°C (feels like ${current.feelsLike}°C). Elevated risk of hypothermia and frost.`,
      recommendation: "Wear insulated windproof layers, cover extremities (hands, head, ears), and ensure domestic animals and vulnerable household members remain in heated or shielded spaces.",
      timeframe: "Current & Nighttime hours",
      locationName,
      isOfficial: false,
    });
  }

  // Oppressive Humid Heat Stress (Tropical / Coastal Muggy conditions)
  if (current.temperature >= 32 && (current.humidity ?? 0) >= 75 && current.feelsLike >= 38 && current.temperature < 40) {
    advisories.push({
      id: `adv_humid_${Date.now()}`,
      type: "heat",
      severity: current.feelsLike >= 42 ? "severe" : "moderate",
      title: "WeatherGPT Oppressive Humid Heat Advisory",
      description: `High moisture (${current.humidity}%) suppresses body sweat evaporation, elevating thermal discomfort to a feels-like ${current.feelsLike}°C.`,
      recommendation: "Avoid heavy cardio during peak midday humidity. Hydrate regularly with water or mineral salts, and rest in ventilated or air-conditioned environments.",
      timeframe: "Current & Midday",
      locationName,
      isOfficial: false,
    });
  }

  return advisories;
}
