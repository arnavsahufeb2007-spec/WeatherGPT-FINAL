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
        if (w.visibility < 3000) risks.push(`Haze/Fog: ${(w.visibility / 1000).toFixed(1)}km`);
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
    keyRisks.push(`Precipitation forecast near ${rainyCheckpoints.map((c) => c.name).join(", ")}; wet surfaces may increase the possibility of reduced tire traction.`);
    moderateWeatherFound = true;
  }

  // Fog / Visibility checks
  const foggyCheckpoints = enrichedCheckpoints.filter((c) => c.weather && c.weather.visibility < 2000);
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

  // Mode specific recommendations
  const recommendations: string[] = [];
  if (mode === "bike") {
    recommendations.push("During wet spells, wet pavement may increase the possibility of reduced traction on painted road markings and expansion joints.");
    recommendations.push("Wear high-visibility reflective riding gear and securely fastened rain liner.");
  } else if (mode === "car") {
    recommendations.push("Inspect wiper blade condition, windshield washer fluid, and tire treads before departure.");
    recommendations.push("Maintain safe following distance in rainy or foggy sectors.");
  } else if (mode === "train" || mode === "bus") {
    recommendations.push("Carry light layers to manage transition between air-conditioned cabins and humid stations.");
  } else if (mode === "flight") {
    recommendations.push("Turbulence can occur near strong convective weather or thunderstorm cells.");
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
