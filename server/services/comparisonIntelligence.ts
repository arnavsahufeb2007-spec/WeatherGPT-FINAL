import { ComparisonAnalysis, ComparisonLocationResult, LocationInfo } from "../types.js";
import { weatherProvider } from "../providers/weatherProvider.js";
import { analyzeWeather, generateAdvisories } from "./weatherIntelligence.js";

export async function compareLocations(
  locations: LocationInfo[],
  timeContext?: { isTomorrow?: boolean; isDayAfterTomorrow?: boolean; timeOfDay?: string }
): Promise<ComparisonAnalysis> {
  if (locations.length < 2) {
    throw new Error("At least two locations are required for weather comparison");
  }

  const isTomorrow = Boolean(timeContext?.isTomorrow);
  const isDayAfter = Boolean(timeContext?.isDayAfterTomorrow);
  const targetDayLabel = isTomorrow ? "tomorrow" : isDayAfter ? "day after tomorrow" : "today";
  const dailyIndex = isTomorrow ? 1 : isDayAfter ? 2 : 0;

  // Fetch weather for all locations concurrently
  const results: ComparisonLocationResult[] = await Promise.all(
    locations.map(async (loc) => {
      const data = await weatherProvider.getWeatherData(loc.latitude, loc.longitude, loc.timezone);
      const analysis = analyzeWeather(data.current, data.hourly, data.daily);
      const advisories = generateAdvisories(loc.name, data.current, data.hourly, data.daily);

      let targetForecast: ComparisonLocationResult["targetForecast"];
      const dailyItem = data.daily && data.daily.length > dailyIndex ? data.daily[dailyIndex] : data.daily?.[0];

      if (dailyItem) {
        const isThunderstorm = [95, 96, 99].includes(dailyItem.weatherCode) || /thunderstorm|storm/i.test(dailyItem.condition);
        targetForecast = {
          targetDay: targetDayLabel,
          date: dailyItem.date,
          tempMax: dailyItem.tempMax,
          tempMin: dailyItem.tempMin,
          precipitationProbability: dailyItem.precipitationProbabilityMax,
          rainSum: Math.round(dailyItem.rainSum * 10) / 10,
          condition: dailyItem.condition,
          weatherCode: dailyItem.weatherCode,
          windSpeedMax: dailyItem.windSpeedMax,
          isThunderstorm,
          uvIndexMax: dailyItem.uvIndexMax,
        };
      }

      return {
        location: loc,
        current: data.current,
        targetForecast,
        analysis,
        advisories,
      };
    })
  );

  // If comparing for tomorrow or future day
  if (isTomorrow || isDayAfter) {
    // 1. High/Low Temp
    const tempValues = results.map((r) => ({
      locationName: r.location.name,
      value: r.targetForecast
        ? `High ${r.targetForecast.tempMax}°C / Low ${r.targetForecast.tempMin}°C`
        : `${r.current.temperature}°C`,
    }));
    const highestMax = [...results].sort((a, b) => (b.targetForecast?.tempMax ?? 0) - (a.targetForecast?.tempMax ?? 0))[0];
    const lowestMin = [...results].sort((a, b) => (a.targetForecast?.tempMin ?? 0) - (b.targetForecast?.tempMin ?? 0))[0];

    // 2. Rain Probability
    const rainValues = results.map((r) => ({
      locationName: r.location.name,
      value: `${r.targetForecast?.precipitationProbability ?? r.current.precipitationProbability}%`,
    }));
    const highestRain = [...results].sort(
      (a, b) => (b.targetForecast?.precipitationProbability ?? 0) - (a.targetForecast?.precipitationProbability ?? 0)
    )[0];
    const lowestRain = [...results].sort(
      (a, b) => (a.targetForecast?.precipitationProbability ?? 0) - (b.targetForecast?.precipitationProbability ?? 0)
    )[0];

    // 3. Expected Rain Volume
    const rainSumValues = results.map((r) => ({
      locationName: r.location.name,
      value: `${r.targetForecast?.rainSum ?? 0} mm`,
    }));

    // 4. Thunderstorm Risk
    const stormValues = results.map((r) => ({
      locationName: r.location.name,
      value: r.targetForecast?.isThunderstorm ? "Thunderstorm Expected" : "No Thunderstorm Expected",
    }));
    const stormCities = results.filter((r) => r.targetForecast?.isThunderstorm);

    // 5. Wind Speed
    const windValues = results.map((r) => ({
      locationName: r.location.name,
      value: `${r.targetForecast?.windSpeedMax ?? r.current.windSpeed} km/h`,
    }));

    const metricDeltas = [
      {
        metric: "Temperature (High / Low)",
        values: tempValues,
        highlight: `${highestMax.location.name} has the higher daytime peak at ${highestMax.targetForecast?.tempMax}°C, while ${lowestMin.location.name} dips to ${lowestMin.targetForecast?.tempMin}°C overnight.`,
      },
      {
        metric: "Precipitation Probability",
        values: rainValues,
        highlight:
          highestRain.targetForecast?.precipitationProbability === lowestRain.targetForecast?.precipitationProbability
            ? `Both locations share a ${highestRain.targetForecast?.precipitationProbability}% chance of precipitation ${targetDayLabel}.`
            : `${highestRain.location.name} has a higher rain likelihood (${highestRain.targetForecast?.precipitationProbability}%) compared to ${lowestRain.location.name} (${lowestRain.targetForecast?.precipitationProbability}%).`,
      },
      {
        metric: "Rain Amount",
        values: rainSumValues,
        highlight: `Expected precipitation volume is ${results.map((r) => `${r.targetForecast?.rainSum ?? 0} mm in ${r.location.name}`).join(" vs ")}.`,
      },
      {
        metric: "Thunderstorm Activity",
        values: stormValues,
        highlight:
          stormCities.length > 0
            ? `Thunderstorms are forecast for ${stormCities.map((c) => c.location.name).join(", ")}, whereas convective storms are not forecast for ${results.filter((r) => !r.targetForecast?.isThunderstorm).map((c) => c.location.name).join(", ") || "other cities"}.`
            : `No convective thunderstorm activity is forecast for either location ${targetDayLabel}.`,
      },
      {
        metric: "Wind Speed",
        values: windValues,
        highlight: `Peak gust/wind speeds range from ${Math.min(...results.map((r) => r.targetForecast?.windSpeedMax ?? 0))} km/h to ${Math.max(...results.map((r) => r.targetForecast?.windSpeedMax ?? 0))} km/h.`,
      },
    ];

    // Determine weather-wise more suitable location
    let preferredLocation = results[0];
    if (results.length === 2) {
      const a = results[0];
      const b = results[1];
      const aStorm = a.targetForecast?.isThunderstorm ? 1 : 0;
      const bStorm = b.targetForecast?.isThunderstorm ? 1 : 0;

      if (aStorm !== bStorm) {
        preferredLocation = aStorm === 0 ? a : b;
      } else {
        const aRain = a.targetForecast?.precipitationProbability ?? 0;
        const bRain = b.targetForecast?.precipitationProbability ?? 0;
        if (Math.abs(aRain - bRain) >= 5) {
          preferredLocation = aRain < bRain ? a : b;
        }
      }
    }

    const otherLocations = results.filter((r) => r.location.name !== preferredLocation.location.name);
    const rainExpectedAnywhere = results.some((r) => (r.targetForecast?.precipitationProbability ?? 0) >= 40);
    const stormsExpectedAnywhere = results.some((r) => r.targetForecast?.isThunderstorm);

    let recommendationReason = "";
    if (stormsExpectedAnywhere) {
      if (!preferredLocation.targetForecast?.isThunderstorm) {
        recommendationReason = `${preferredLocation.location.name} presents better weather conditions for outdoor activity because no thunderstorms are forecast, whereas ${otherLocations.map((o) => o.location.name).join(", ")} has thunderstorm activity forecast.`;
      } else {
        recommendationReason = `Both cities have thunderstorms forecast; outdoor plans may encounter atmospheric disruptions.`;
      }
    } else if (rainExpectedAnywhere) {
      recommendationReason = `${preferredLocation.location.name} is weather-wise more suitable due to slightly lower precipitation probability (${preferredLocation.targetForecast?.precipitationProbability}% vs ${otherLocations.map((o) => `${o.location.name} ${o.targetForecast?.precipitationProbability}%`).join(", ")}).`;
    } else {
      recommendationReason = `Both locations offer favorable weather conditions for travel and outdoor plans.`;
    }

    const rainThunderWarning = rainExpectedAnywhere || stormsExpectedAnywhere
      ? " Rain and thunderstorms are likely, so allow extra travel time and consider carrying rain protection."
      : "";

    const recommendation = `Weather-wise more suitable: ${recommendationReason}${rainThunderWarning}`;

    const comparativeSummary = `Forecast comparison for ${targetDayLabel} between ${locations.map((l) => l.name).join(" and ")}: ${results.map((r) => `${r.location.name} expects High ${r.targetForecast?.tempMax}°C / Low ${r.targetForecast?.tempMin}°C with ${r.targetForecast?.condition} (${r.targetForecast?.precipitationProbability}% rain probability, ${r.targetForecast?.rainSum} mm)`).join("; ")}.`;

    return {
      locations: results,
      targetDay: targetDayLabel,
      metricDeltas,
      comparativeSummary,
      recommendation,
    };
  }

  // Current / Today comparison
  const tempValues = results.map((r) => ({ locationName: r.location.name, value: `${r.current.temperature}°C` }));
  const warmest = [...results].sort((a, b) => b.current.temperature - a.current.temperature)[0];
  const coolest = [...results].sort((a, b) => a.current.temperature - b.current.temperature)[0];
  const tempDiff = Math.round((warmest.current.temperature - coolest.current.temperature) * 10) / 10;

  const rainValues = results.map((r) => ({ locationName: r.location.name, value: `${r.current.precipitationProbability}%` }));
  const highestRain = [...results].sort((a, b) => b.current.precipitationProbability - a.current.precipitationProbability)[0];
  const lowestRain = [...results].sort((a, b) => a.current.precipitationProbability - b.current.precipitationProbability)[0];

  const humidityValues = results.map((r) => ({
    locationName: r.location.name,
    value: r.current.humidity !== null ? `${r.current.humidity}%` : "Unavailable",
  }));
  const validHumidities = results.map((r) => r.current.humidity).filter((h): h is number => h !== null);
  const windValues = results.map((r) => ({ locationName: r.location.name, value: `${r.current.windSpeed} km/h` }));
  const uvValues = results.map((r) => ({ locationName: r.location.name, value: `${r.current.uvIndex}` }));

  const stormCities = results.filter((r) => [95, 96, 99].includes(r.current.weatherCode) || /thunderstorm|storm/i.test(r.current.condition));
  const stormValues = results.map((r) => ({
    locationName: r.location.name,
    value: [95, 96, 99].includes(r.current.weatherCode) || /thunderstorm|storm/i.test(r.current.condition) ? "Thunderstorm Active" : "No Thunderstorm",
  }));

  const metricDeltas = [
    {
      metric: "Current Temperature",
      values: tempValues,
      highlight: `${warmest.location.name} is currently warmer by ${tempDiff}°C than ${coolest.location.name}.`,
    },
    {
      metric: "Rain Probability",
      values: rainValues,
      highlight: `${highestRain.location.name} has the highest rain likelihood at ${highestRain.current.precipitationProbability}%.`,
    },
    {
      metric: "Thunderstorm Activity",
      values: stormValues,
      highlight:
        stormCities.length > 0
          ? `Thunderstorm activity is observed/forecast for ${stormCities.map((c) => c.location.name).join(", ")}.`
          : `No convective thunderstorm activity is currently reported across compared locations.`,
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

  const rainExpected = results.some((r) => r.current.precipitationProbability >= 40);
  const stormsExpected = stormCities.length > 0;
  const preferred = lowestRain;
  const rainNote = rainExpected || stormsExpected
    ? " Rain and thunderstorms are likely, so allow extra travel time and consider carrying rain protection."
    : "";

  const recommendation = `Weather-wise more suitable: ${preferred.location.name} offers better weather conditions for outdoor activity with lower precipitation likelihood (${preferred.current.precipitationProbability}%).${rainNote}`;

  const comparativeSummary = `Comparison between ${locations.map((l) => l.name).join(", ")}: ${warmest.location.name} is currently ${
    warmest.current.temperature
  }°C (${warmest.current.condition}), while ${coolest.location.name} is ${coolest.current.temperature}°C (${coolest.current.condition}). Rain likelihood is ${
    highestRain.current.precipitationProbability > 40 ? `higher in ${highestRain.location.name} (${highestRain.current.precipitationProbability}%)` : "minimal in all compared cities"
  }.`;

  return {
    locations: results,
    targetDay: "current",
    metricDeltas,
    comparativeSummary,
    recommendation,
  };
}
