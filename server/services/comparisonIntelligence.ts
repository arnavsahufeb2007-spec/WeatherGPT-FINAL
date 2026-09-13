import { ComparisonAnalysis, ComparisonLocationResult, LocationInfo } from "../types.js";
import { weatherProvider } from "../providers/weatherProvider.js";
import { analyzeWeather, generateAdvisories } from "./weatherIntelligence.js";

export async function compareLocations(locations: LocationInfo[]): Promise<ComparisonAnalysis> {
  if (locations.length < 2) {
    throw new Error("At least two locations are required for weather comparison");
  }

  // Fetch weather for all locations concurrently
  const results: ComparisonLocationResult[] = await Promise.all(
    locations.map(async (loc) => {
      const data = await weatherProvider.getWeatherData(loc.latitude, loc.longitude, loc.timezone);
      const analysis = analyzeWeather(data.current, data.hourly, data.daily);
      const advisories = generateAdvisories(loc.name, data.current, data.hourly, data.daily);

      return {
        location: loc,
        current: data.current,
        analysis,
        advisories,
      };
    })
  );

  // Calculate comparative metric deltas
  const tempValues = results.map((r) => ({ locationName: r.location.name, value: `${r.current.temperature}°C` }));
  const warmest = [...results].sort((a, b) => b.current.temperature - a.current.temperature)[0];
  const coolest = [...results].sort((a, b) => a.current.temperature - b.current.temperature)[0];
  const tempDiff = Math.round((warmest.current.temperature - coolest.current.temperature) * 10) / 10;

  const rainValues = results.map((r) => ({ locationName: r.location.name, value: `${r.current.precipitationProbability}%` }));
  const highestRain = [...results].sort((a, b) => b.current.precipitationProbability - a.current.precipitationProbability)[0];

  const humidityValues = results.map((r) => ({
    locationName: r.location.name,
    value: r.current.humidity !== null ? `${r.current.humidity}%` : "Unavailable",
  }));
  const validHumidities = results.map((r) => r.current.humidity).filter((h): h is number => h !== null);
  const windValues = results.map((r) => ({ locationName: r.location.name, value: `${r.current.windSpeed} km/h` }));
  const uvValues = results.map((r) => ({ locationName: r.location.name, value: `${r.current.uvIndex}` }));

  const metricDeltas = [
    {
      metric: "Temperature",
      values: tempValues,
      highlight: `${warmest.location.name} is warmer by ${tempDiff}°C than ${coolest.location.name}.`,
    },
    {
      metric: "Rain Probability",
      values: rainValues,
      highlight: `${highestRain.location.name} has the highest rain likelihood at ${highestRain.current.precipitationProbability}%.`,
    },
    {
      metric: "Humidity",
      values: humidityValues,
      highlight:
        validHumidities.length > 0
          ? `Humidity ranges between ${Math.min(...validHumidities)}% and ${Math.max(...validHumidities)}%.`
          : "Relative humidity sensor readings are unavailable for the compared locations.",
    },
    {
      metric: "Wind Speed",
      values: windValues,
      highlight: `Wind conditions vary from ${Math.min(...results.map((r) => r.current.windSpeed))} km/h to ${Math.max(
        ...results.map((r) => r.current.windSpeed)
      )} km/h.`,
    },
    {
      metric: "UV Index",
      values: uvValues,
      highlight: `Peak UV is ${Math.max(...results.map((r) => r.current.uvIndex))} across compared locations.`,
    },
  ];

  const comparativeSummary = `Comparison between ${locations.map((l) => l.name).join(", ")}: ${warmest.location.name} is currently ${
    warmest.current.temperature
  }°C (${warmest.current.condition}), while ${coolest.location.name} is ${coolest.current.temperature}°C (${coolest.current.condition}). Rain risk is ${
    highestRain.current.precipitationProbability > 40 ? `higher in ${highestRain.location.name}` : "minimal in all compared cities"
  }. Both offer distinct atmospheric profiles based on elevation, coastal proximity, and active weather fronts.`;

  return {
    locations: results,
    metricDeltas,
    comparativeSummary,
  };
}
