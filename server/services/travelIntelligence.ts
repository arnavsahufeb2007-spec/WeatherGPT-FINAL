import { LocationInfo, RouteCheckpoint, TravelAnalysis } from "../types.js";
import { routingProvider } from "../providers/routingProvider.js";
import { weatherProvider } from "../providers/weatherProvider.js";

export async function analyzeTravel(
  origin: LocationInfo,
  destination: LocationInfo,
  mode: TravelAnalysis["mode"] = "car"
): Promise<TravelAnalysis> {
  // 1. Get real route and checkpoints from routing provider
  const route = await routingProvider.getRoute(origin, destination, mode);

  // 2. Fetch real weather for origin & destination
  const [originWeatherResult, destWeatherResult] = await Promise.all([
    weatherProvider.getWeatherData(origin.latitude, origin.longitude, origin.timezone),
    weatherProvider.getWeatherData(destination.latitude, destination.longitude, destination.timezone),
  ]);

  const originWeather = originWeatherResult.current;
  const destinationWeather = destWeatherResult.current;

  // 3. Fetch weather for intermediate checkpoints in parallel
  const enrichedCheckpoints: RouteCheckpoint[] = await Promise.all(
    route.checkpoints.map(async (cp, idx) => {
      if (idx === 0) {
        return {
          ...cp,
          weather: originWeather,
          riskSummary: `${originWeather.condition}, ${originWeather.temperature}°C`,
        };
      }
      if (idx === route.checkpoints.length - 1) {
        return {
          ...cp,
          weather: destinationWeather,
          riskSummary: `${destinationWeather.condition}, ${destinationWeather.temperature}°C`,
        };
      }

      try {
        const cpData = await weatherProvider.getWeatherData(cp.latitude, cp.longitude);
        const w = cpData.current;
        const risks: string[] = [];
        if (w.rain > 1 || w.precipitationProbability > 50) risks.push(`Rain: ${w.rain}mm (${w.precipitationProbability}%)`);
        if (w.visibility !== null && w.visibility !== undefined && w.visibility < 3000) risks.push(`Haze/Fog: ${(w.visibility / 1000).toFixed(1)}km`);
        if (w.windSpeed > 35) risks.push(`Wind: ${w.windSpeed}km/h`);

        return {
          ...cp,
          weather: w,
          riskSummary: risks.length > 0 ? risks.join(", ") : `${w.condition}, ${w.temperature}°C (Clear)`,
        };
      } catch {
        return {
          ...cp,
          riskSummary: "Checkpoint weather data unavailable",
        };
      }
    })
  );

  // 4. Synthesize weather risks across the whole transit corridor
  const keyRisks: string[] = [];
  let severeWeatherFound = false;
  let moderateWeatherFound = false;

  const allWeathers = enrichedCheckpoints.map((c) => c.weather).filter(Boolean);

  // Rain checks
  const rainyCheckpoints = enrichedCheckpoints.filter((c) => c.weather && (c.weather.rain > 2 || c.weather.precipitationProbability > 60));
  if (rainyCheckpoints.length > 0) {
    keyRisks.push(`Precipitation forecast near ${rainyCheckpoints.map((c) => c.name).join(", ")}; elevated rain exposure along this transit corridor.`);
    moderateWeatherFound = true;
  }

  // Fog / Visibility checks
  const foggyCheckpoints = enrichedCheckpoints.filter((c) => c.weather && c.weather.visibility !== null && c.weather.visibility !== undefined && c.weather.visibility < 2000);
  if (foggyCheckpoints.length > 0) {
    keyRisks.push(`Reduced visibility / dense mist along ${foggyCheckpoints.map((c) => c.name).join(", ")}`);
    severeWeatherFound = true;
  }

  // High Temperature / Heat stress
  const maxTemp = Math.max(...allWeathers.map((w) => w?.temperature ?? 25));
  const minTemp = Math.min(...allWeathers.map((w) => w?.temperature ?? 25));
  if (maxTemp >= 40) {
    keyRisks.push(`Extreme highway heat reaching ${maxTemp}°C; vehicle cooling and passenger hydration crucial.`);
    moderateWeatherFound = true;
  }
  if (maxTemp - minTemp >= 10) {
    keyRisks.push(`Significant temperature variation along route (${minTemp}°C to ${maxTemp}°C).`);
  }

  // Wind
  const windyCheckpoints = enrichedCheckpoints.filter((c) => c.weather && c.weather.windSpeed > 40);
  if (windyCheckpoints.length > 0) {
    keyRisks.push(`High crosswinds along open stretches (${windyCheckpoints.map((c) => c.name).join(", ")}).`);
    moderateWeatherFound = true;
  }

  const weatherRiskLevel = severeWeatherFound ? "high" : moderateWeatherFound ? "moderate" : "low";

  // Context-aware, data-grounded recommendations tailored to actual corridor observations
  const recommendations: string[] = [];

  if (rainyCheckpoints.length > 0) {
    const rainSectors = rainyCheckpoints.map((c) => c.name).slice(0, 3).join(", ");
    if (mode === "bike") {
      recommendations.push(`Active rain or high precipitation probability forecast near ${rainSectors}; wear waterproof high-visibility outer layers and allow extra journey time.`);
    } else if (mode === "car") {
      recommendations.push(`Precipitation detected near ${rainSectors}. Ensure wiper blades and defogger are operational; increase following distance by 2x.`);
    } else {
      recommendations.push(`Rain expected along the route near ${rainSectors}. Carry compact waterproof gear for transfers.`);
    }
  }

  if (foggyCheckpoints.length > 0) {
    const fogSectors = foggyCheckpoints.map((c) => c.name).slice(0, 3).join(", ");
    recommendations.push(`Reduced visibility (<2 km) near ${fogSectors}. Use low-beam fog lights, avoid abrupt overtaking maneuvers, and verify trip timings.`);
  }

  if (maxTemp >= 40) {
    recommendations.push(`Elevated thermal load (${maxTemp}°C) along corridor. Verify vehicle engine coolant, tire pressure, and carry oral rehydration salts or ample water.`);
  } else if (minTemp <= 6) {
    recommendations.push(`Chilly conditions (${minTemp}°C) along corridor. Pack thermal insulating layers and monitor cold morning temperature drops.`);
  }

  if (mode === "flight" && (severeWeatherFound || rainyCheckpoints.some((c) => c.weather?.weatherCode && [95, 96, 99].includes(c.weather.weatherCode)))) {
    recommendations.push("Convective cells or atmospheric turbulence possible near route corridor; keep seatbelts fastened throughout cruise.");
  }

  if (recommendations.length === 0) {
    if (mode === "bike") {
      recommendations.push("Atmospheric conditions along the corridor are favorable. Standard helmet and protective riding gear recommended.");
    } else if (mode === "car") {
      recommendations.push("Clear highway atmospheric visibility. Maintain standard highway speeds and scheduled driver rest intervals.");
    } else {
      recommendations.push("Normal meteorological conditions along the route corridor with no significant atmospheric impediments.");
    }
  }

  recommendations.push("Note: WeatherGPT travel intelligence evaluates verified atmospheric and route data. It does not monitor live traffic congestion, accidents, road closures, or transit delays.");

  const routeSummary = `Travel from ${origin.name} to ${destination.name} covers approx ${route.totalDistanceKm} km (${Math.floor(
    route.estimatedDurationMinutes / 60
  )}h ${route.estimatedDurationMinutes % 60}m by ${mode}). Origin temperature is ${originWeather.temperature}°C (${originWeather.condition}) and destination is ${
    destinationWeather.temperature
  }°C (${destinationWeather.condition}). Weather risk level along corridor: ${weatherRiskLevel.toUpperCase()}.`;

  return {
    origin,
    destination,
    mode,
    totalDistanceKm: route.totalDistanceKm,
    estimatedDurationMinutes: route.estimatedDurationMinutes,
    checkpoints: enrichedCheckpoints,
    originWeather,
    destinationWeather,
    weatherRiskLevel,
    keyWeatherRisks: keyRisks.length > 0 ? keyRisks : ["Atmospheric weather along the corridor is clear with normal meteorological visibility (note: live traffic congestion, road grip, and delays are not monitored)."],
    recommendations,
    routeSummary,
  };
}
