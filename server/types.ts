export interface LocationInfo {
  name: string;
  country?: string;
  countryCode?: string;
  admin1?: string;
  admin2?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  elevation?: number;
  postcodes?: string[];
  population?: number;
  featureCode?: string;
}

export interface CurrentWeatherData {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number | null;
  precipitation: number;
  rain: number;
  precipitationProbability: number;
  weatherCode: number;
  condition: string;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  windGust?: number;
  cloudCover: number;
  uvIndex: number;
  visibility: number | null;
  pressure: number | null;
  dewPoint?: number;
  isDay: boolean;
  sunrise: string;
  sunset: string;
}

export interface HourlyForecastItem {
  time: string;
  formattedTime: string;
  temperature: number;
  feelsLike: number;
  precipitationProbability: number;
  precipitation?: number;
  rain: number;
  weatherCode: number;
  condition: string;
  windSpeed: number;
  uvIndex: number;
  humidity: number | null;
}

export interface DailyForecastItem {
  date: string;
  formattedDate: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  precipitationProbabilityMax: number;
  rainSum: number;
  weatherCode: number;
  condition: string;
  uvIndexMax: number;
  windSpeedMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherAnalysis {
  rainRisk: "none" | "low" | "moderate" | "high" | "extreme";
  rainRiskLabel: string;
  heatRisk: "normal" | "caution" | "extreme_caution" | "danger" | "extreme_danger";
  heatRiskLabel: string;
  windRisk: "calm" | "breezy" | "windy" | "gale";
  windRiskLabel: string;
  uvRisk: "low" | "moderate" | "high" | "very_high" | "extreme";
  uvRiskLabel: string;
  visibilityRisk: "good" | "moderate" | "poor" | "dense_fog";
  visibilityRiskLabel: string;
  comfortIndex: "freezing" | "cold" | "pleasant" | "warm" | "humid_muggy" | "scorching";
  comfortLabel: string;
  summary: string;
  outdoorSuitabilityScore: number;
}

export interface WeatherAdvisory {
  id: string;
  type: "rain" | "heat" | "wind" | "uv" | "fog" | "storm" | "cold";
  severity: "info" | "moderate" | "severe" | "extreme";
  title: string;
  description: string;
  recommendation: string;
  timeframe: string;
  locationName: string;
  isOfficial: false;
}

export type ActivityType =
  | "cricket"
  | "football"
  | "running"
  | "walking"
  | "cycling"
  | "hiking"
  | "picnic"
  | "outdoor_events"
  | "photography"
  | "gardening"
  | "general";

export interface ActivityAnalysis {
  activity: ActivityType;
  activityName: string;
  suitability: "excellent" | "good" | "fair" | "poor" | "unfavorable";
  suitabilityScore: number;
  riskLevel: "low" | "moderate" | "high" | "severe";
  primaryReasons: string[];
  weatherFactors: {
    factor: string;
    value: string;
    impact: "positive" | "neutral" | "negative";
  }[];
  bestTimeWindow?: string;
  tips: string[];
}

export interface ComparisonLocationResult {
  location: LocationInfo;
  current: CurrentWeatherData;
  targetForecast?: {
    targetDay: string;
    date: string;
    tempMax: number;
    tempMin: number;
    precipitationProbability: number;
    rainSum: number;
    condition: string;
    weatherCode: number;
    windSpeedMax: number;
    isThunderstorm: boolean;
    uvIndexMax: number;
  };
  analysis: WeatherAnalysis;
  advisories: WeatherAdvisory[];
}

export interface ComparisonAnalysis {
  locations: ComparisonLocationResult[];
  failedLocations?: string[];
  targetDay?: string;
  metricDeltas: {
    metric: string;
    values: { locationName: string; value: string | number }[];
    highlight: string;
  }[];
  comparativeSummary: string;
  recommendation: string;
}

export interface RouteCheckpoint {
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  timeOffsetMinutes: number;
  estimatedArrival: string;
  weather?: CurrentWeatherData;
  riskSummary?: string;
}

export interface TravelAnalysis {
  origin: LocationInfo;
  destination: LocationInfo;
  mode: "car" | "bike" | "bus" | "train" | "flight" | "general";
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  checkpoints: RouteCheckpoint[];
  originWeather: CurrentWeatherData;
  destinationWeather: CurrentWeatherData;
  weatherRiskLevel: "low" | "moderate" | "high" | "severe";
  keyWeatherRisks: string[];
  recommendations: string[];
  routeSummary: string;
}

export interface ConversationContext {
  currentLocation?: LocationInfo;
  lastQueryTimestamp?: string;
  currentActivity?: ActivityType;
  lastTravelDetails?: {
    origin?: string;
    destination?: string;
    mode?: string;
  };
  comparisonLocations?: LocationInfo[];
}

export interface QueryRequest {
  message: string;
  location?: LocationInfo;
  locationVersion?: number;
  context?: ConversationContext;
  preferredLanguage?: string;
  clientWeather?: Partial<CurrentWeatherData>;
}

export interface QueryResponse {
  success: boolean;
  reply: string;
  language: string;
  intent: string;
  isAIGenerated: boolean;
  fallbackUsed: boolean;
  context: ConversationContext;
  data: {
    location?: LocationInfo;
    current?: CurrentWeatherData;
    hourly?: HourlyForecastItem[];
    daily?: DailyForecastItem[];
    analysis?: WeatherAnalysis;
    advisories?: WeatherAdvisory[];
    activity?: ActivityAnalysis;
    comparison?: ComparisonAnalysis;
    travel?: TravelAnalysis;
    failedLocations?: string[];
    requiresLocation?: boolean;
    locationResolution?: any;
  };
}
