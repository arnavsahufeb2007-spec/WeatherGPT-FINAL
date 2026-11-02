export interface WeatherCodeInfo {
  condition: string;
  isRain: boolean;
  isSnow: boolean;
  isThunderstorm: boolean;
  isFog: boolean;
  icon: string;
}

export const WMO_CODES: Record<number, WeatherCodeInfo> = {
  0: { condition: "Clear Sky", isRain: false, isSnow: false, isThunderstorm: false, isFog: false, icon: "sun" },
  1: { condition: "Mainly Clear", isRain: false, isSnow: false, isThunderstorm: false, isFog: false, icon: "sun-medium" },
  2: { condition: "Partly Cloudy", isRain: false, isSnow: false, isThunderstorm: false, isFog: false, icon: "cloud-sun" },
  3: { condition: "Overcast", isRain: false, isSnow: false, isThunderstorm: false, isFog: false, icon: "cloud" },
  45: { condition: "Fog", isRain: false, isSnow: false, isThunderstorm: false, isFog: true, icon: "cloud-fog" },
  48: { condition: "Depositing Rime Fog", isRain: false, isSnow: false, isThunderstorm: false, isFog: true, icon: "cloud-fog" },
  51: { condition: "Light Drizzle", isRain: true, isSnow: false, isThunderstorm: false, isFog: false, icon: "cloud-drizzle" },
  53: { condition: "Moderate Drizzle", isRain: true, isSnow: false, isThunderstorm: false, isFog: false, icon: "cloud-drizzle" },
  55: { condition: "Dense Drizzle", isRain: true, isSnow: false, isThunderstorm: false, isFog: false, icon: "cloud-drizzle" },
  56: { condition: "Light Freezing Drizzle", isRain: true, isSnow: true, isThunderstorm: false, isFog: false, icon: "cloud-snow" },
  57: { condition: "Dense Freezing Drizzle", isRain: true, isSnow: true, isThunderstorm: false, isFog: false, icon: "cloud-snow" },
  61: { condition: "Slight Rain", isRain: true, isSnow: false, isThunderstorm: false, isFog: false, icon: "cloud-rain" },
  63: { condition: "Moderate Rain", isRain: true, isSnow: false, isThunderstorm: false, isFog: false, icon: "cloud-rain" },
  65: { condition: "Heavy Rain", isRain: true, isSnow: false, isThunderstorm: false, isFog: false, icon: "cloud-rain-wind" },
  66: { condition: "Light Freezing Rain", isRain: true, isSnow: true, isThunderstorm: false, isFog: false, icon: "cloud-snow" },
  67: { condition: "Heavy Freezing Rain", isRain: true, isSnow: true, isThunderstorm: false, isFog: false, icon: "cloud-snow" },
  71: { condition: "Slight Snow Fall", isRain: false, isSnow: true, isThunderstorm: false, isFog: false, icon: "snowflake" },
  73: { condition: "Moderate Snow Fall", isRain: false, isSnow: true, isThunderstorm: false, isFog: false, icon: "snowflake" },
  75: { condition: "Heavy Snow Fall", isRain: false, isSnow: true, isThunderstorm: false, isFog: false, icon: "snowflake" },
  77: { condition: "Snow Grains", isRain: false, isSnow: true, isThunderstorm: false, isFog: false, icon: "snowflake" },
  80: { condition: "Slight Rain Showers", isRain: true, isSnow: false, isThunderstorm: false, isFog: false, icon: "cloud-sun-rain" },
  81: { condition: "Moderate Rain Showers", isRain: true, isSnow: false, isThunderstorm: false, isFog: false, icon: "cloud-rain" },
  82: { condition: "Violent Rain Showers", isRain: true, isSnow: false, isThunderstorm: false, isFog: false, icon: "cloud-lightning" },
  85: { condition: "Slight Snow Showers", isRain: false, isSnow: true, isThunderstorm: false, isFog: false, icon: "snowflake" },
  86: { condition: "Heavy Snow Showers", isRain: false, isSnow: true, isThunderstorm: false, isFog: false, icon: "snowflake" },
  95: { condition: "Thunderstorm", isRain: true, isSnow: false, isThunderstorm: true, isFog: false, icon: "cloud-lightning" },
  96: { condition: "Thunderstorm with Slight Hail", isRain: true, isSnow: false, isThunderstorm: true, isFog: false, icon: "cloud-lightning" },
  99: { condition: "Thunderstorm with Heavy Hail", isRain: true, isSnow: false, isThunderstorm: true, isFog: false, icon: "cloud-lightning" },
};

export function getWeatherInfo(code: number): WeatherCodeInfo {
  return (
    WMO_CODES[code] || {
      condition: "Variable Weather",
      isRain: false,
      isSnow: false,
      isThunderstorm: false,
      isFog: false,
      icon: "cloud",
    }
  );
}
