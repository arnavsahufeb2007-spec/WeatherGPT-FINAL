export interface UIStrings {
  // App brand & header
  appName: string;
  tagline: string;
  activeModule: string;
  selectCity: string;
  changeCity: string;
  useCurrentLocation: string;
  useCurrentGps: string;
  changeLanguageTitle: string;
  clickToChangeCity: string;

  // Sidebar navigation
  navHome: string;
  navForecast: string;
  navInsights: string;
  navTravel: string;
  navVoice: string;
  navExplore: string;
  navHistory: string;
  navSettings: string;
  navAuth: string;
  stationBase: string;
  selectStation: string;
  change: string;
  syncAccount: string;
  guestMode: string;
  synced: string;
  signIn: string;
  signOut: string;
  liveSynoptic: string;
  appearance: string;
  themeDark: string;
  themeLight: string;
  navigationHeader: string;

  // Badges
  badgeHourly7d: string;
  badgeGrounded: string;
  badgeMultilingual: string;
  badgeSync: string;
  badgeDeterministic: string;

  // Header module titles
  headerHome: string;
  headerForecast: string;
  headerInsights: string;
  headerTravel: string;
  headerVoice: string;
  headerExplore: string;
  headerHistory: string;
  headerSettings: string;
  headerAuth: string;

  // Bottom Navigation (mobile)
  tabHome: string;
  tabForecast: string;
  tabInsights: string;
  tabHistory: string;
  tabVoice: string;
  tabExplore: string;
  tabProfile: string;

  // Legacy tab keys
  tabAssistant: string;
  tabActivity: string;
  tabTravel: string;
  tabTravelLegacy: string;
  tabCompare: string;

  // Welcome hero / No location state
  welcomeTitle: string;
  welcomeSubtitle: string;
  searchWorldwide: string;
  loadingForecast: string;
  selectLocationForForecast: string;
  evaluatingSuitability: string;
  selectLocationForActivity: string;
  retry: string;

  // Footer
  footerTelemetry: string;
  footerRouteModels: string;
  footerDialects: string;
  footerPrivacy: string;

  // Current Weather Hero & Weather Cards
  outdoorScore: string;
  feelsLike: string;
  high: string;
  low: string;
  precipitation: string;
  humidity: string;
  windSpeed: string;
  windVector: string;
  uvIndex: string;
  visibility: string;
  pressure: string;
  advisories: string;
  hourlyForecast: string;
  dailyForecast: string;
  realTimeTelemetry: string;
  gusts: string;
  dewPoint: string;
  rainProb: string;
  rainAccumulation: string;
  noAccumulation: string;
  sunrise: string;
  sunset: string;
  sunriseWas: string;
  sunsetWas: string;
  ratingLabel: string;

  // Forecast & Outlook (Hourly & 7-Day)
  forecastBannerTag: string;
  forecastBannerTitle: string;
  forecastBannerDesc: string;
  hourlyHorizon: string;
  hourlySubtitle: string;
  metricTemperature: string;
  metricPrecipitation: string;
  sevenDayOutlook: string;
  deterministicProgression: string;
  today: string;
  tomorrow: string;
  now?: string;
  tempLabel?: string;
  feelsLikeLabel?: string;
  rainProbLabel?: string;
  activeBadge?: string;
  mm?: string;
  conditions?: Record<number, string>;
  activeAdvisoriesTitle: string;
  noActiveAdvisories: string;
  safeOperationalThresholds: string;
  actionAdvice: string;
  advisoryDisclaimer: string;

  // Landing Page
  landingHeroBadge?: string;
  landingHeroTitle?: string;
  landingHeroSubtitle?: string;
  landingGetStarted?: string;
  landingExploreWeather?: string;
  landingDiscoverFeatures?: string;
  landingExploreForecast?: string;
  landingQuickCities?: string;
  featureLiveForecastTitle?: string;
  featureLiveForecastDesc?: string;
  featureTrajectoriesTitle?: string;
  featureTrajectoriesDesc?: string;
  featureAIChatTitle?: string;
  featureAIChatDesc?: string;
  featureVoiceMultilingualTitle?: string;
  featureVoiceMultilingualDesc?: string;
  featureTravelCompareTitle?: string;
  featureTravelCompareDesc?: string;
  landingTryQueryTitle?: string;

  // Chat & Conversation
  send: string;
  sending: string;
  stop: string;
  askPlaceholder: string;
  searchPlaceholder: string;
  selectLocation: string;
  newChat: string;
  voiceDictation: string;
  suggestedInquiries: string;
  welcomeChatGreeting: string;
  aiAssistant: string;

  // Activity Explorer (AI Insights)
  activityBannerTag: string;
  activityBannerTitle: string;
  activityBannerDesc: string;
  recommendedWindow: string;
  meteorologicalFactors: string;
  safetyPrecautions: string;
  suitabilityExcellent: string;
  suitabilityGood: string;
  suitabilityFair: string;
  suitabilityPoor: string;
  suitabilityUnsuitable: string;
  activityCricket: string;
  activityRunning: string;
  activityCycling: string;
  activityFootball: string;
  activityWalking: string;
  activityPicnic: string;
  activityHiking: string;
  activityPhotography: string;
  activityGardening: string;
  activityEvents: string;

  // Travel Planner
  travelBannerTag: string;
  travelBannerTitle: string;
  travelBannerDesc: string;
  originLocation: string;
  destinationLocation: string;
  travelMode: string;
  analyzeRoute: string;
  analyzingRoute: string;
  routeSummary: string;
  departure: string;
  arrival: string;
  waypoints: string;
  modeCar: string;
  modeBike: string;
  modeBus: string;
  modeTrain: string;
  modeFlight: string;

  // Voice Studio
  voiceBannerTag: string;
  voiceBannerTitle: string;
  voiceBannerDesc: string;
  startListening: string;
  stopListening: string;
  listening: string;
  speaking: string;
  processing: string;
  micReady: string;
  configureVoice: string;
  geminiLive: string;

  // Explore & Hubs
  exploreBannerTag: string;
  exploreBannerTitle: string;
  exploreBannerDesc: string;
  tabFeaturedHubs: string;
  tabCompareCities: string;
  compareNow: string;
  firstCity: string;
  secondCity: string;
  temperatureComparison: string;
  precipitationComparison: string;
  windComparison: string;

  // Cloud History
  historyBannerTag: string;
  historyBannerTitle: string;
  historyBannerDesc: string;
  searchHistoryPlaceholder: string;
  noHistoryFound: string;
  startNewChat: string;
  clearHistory: string;
  confirmClear: string;
  guestHistoryNotice: string;

  // Settings & Calibration
  settingsBannerTag: string;
  settingsBannerTitle: string;
  settingsBannerDesc: string;
  accountSection: string;
  interfaceLanguage: string;
  interfaceLanguageDesc: string;
  tempUnitSection: string;
  appearanceSection: string;
  viewportSection: string;
  voiceSettingsSection: string;
  dangerZone: string;
  resetDefaults: string;
  resetConfirm: string;

  // Location Search Dialog
  searchDialogTitle: string;
  searchDialogPlaceholder: string;
  searchingLocations: string;
  noLocationsFound: string;
  escToClose: string;
  popularSearches: string;

  // Auth Page & Modal
  authTitle: string;
  authSubtitle: string;
  continueWithGoogle: string;
  continueAsGuest: string;
  authFeatures: string;

  // Solar Atmosphere Bar
  liveAuto: string;
  dawn: string;
  solarApex: string;
  goldenHour: string;
  dusk: string;
  night: string;

  // Device Preview Bar
  viewport: string;
  responsiveAuto: string;
  phone: string;
  tablet: string;
  laptop: string;
  desktop: string;

  // Common UI actions
  close: string;
  cancel: string;
  save: string;
  confirm: string;
  back: string;
  error: string;
}

export const enUIStrings: UIStrings = {
  appName: "WeatherGPT",
  tagline: "Conversational Weather Intelligence",
  activeModule: "ACTIVE MODULE",
  selectCity: "Select City",
  changeCity: "Change City",
  useCurrentLocation: "Use Current Location",
  useCurrentGps: "Use Current GPS",
  changeLanguageTitle: "Change display language",
  clickToChangeCity: "Click to change city",

  navHome: "Home & Chat",
  navForecast: "Live Forecast",
  navInsights: "AI Insights",
  navTravel: "Travel & Route",
  navVoice: "Voice Studio",
  navExplore: "Explore & Compare",
  navHistory: "Cloud History",
  navSettings: "Settings & Profile",
  navAuth: "Sign In & Create Account",
  stationBase: "STATION BASE",
  selectStation: "Select Station",
  change: "Change",
  syncAccount: "Sync Account",
  guestMode: "Guest mode",
  synced: "Synced",
  signIn: "Sign In",
  signOut: "Sign Out",
  liveSynoptic: "LIVE SYNOPTIC",
  appearance: "Appearance",
  themeDark: "Dark",
  themeLight: "Light",
  navigationHeader: "NAVIGATION",

  badgeHourly7d: "HOURLY & 7D",
  badgeGrounded: "GROUNDED",
  badgeMultilingual: "MULTILINGUAL",
  badgeSync: "SYNC",
  badgeDeterministic: "DETERMINISTIC",

  headerHome: "Home & Atmospheric Intelligence",
  headerForecast: "Hourly & 7-Day Synoptic Outlook",
  headerInsights: "Outdoor Suitability & Guidance",
  headerTravel: "Travel Corridors & Ensembles",
  headerVoice: "Hands-Free Voice Studio",
  headerExplore: "Explore & Compare Hubs",
  headerHistory: "Cloud Atmospheric Records",
  headerSettings: "Telemetry & Calibration",
  headerAuth: "Sign In & Create Account",

  tabHome: "Home",
  tabForecast: "Forecast",
  tabInsights: "Insights",
  tabHistory: "History",
  tabVoice: "Voice",
  tabExplore: "Explore",
  tabProfile: "Profile",

  tabAssistant: "AI Assistant",
  tabActivity: "Activity",
  tabTravel: "Route Weather",
  tabTravelLegacy: "Route Weather",
  tabCompare: "Compare",

  welcomeTitle: "Welcome to WeatherGPT",
  welcomeSubtitle:
    "Search and select any city worldwide to access verified weather observations, deterministic forecasts, and conversational AI insights.",
  searchWorldwide: "Search Location Worldwide",
  loadingForecast: "Loading verified forecast data...",
  selectLocationForForecast: "Select a location to view hourly and 7-day forecast",
  evaluatingSuitability: "Evaluating meteorological suitability...",
  selectLocationForActivity: "Select a location to evaluate outdoor activities",
  retry: "Retry",

  footerTelemetry: "Atmospheric intelligence distilled from verified Open-Meteo & NOAA METAR telemetry",
  footerRouteModels: "OSRM Route Models",
  footerDialects: "39+ Indian & Global Dialects",
  footerPrivacy: "Strict Data Privacy",

  outdoorScore: "Outdoor Score",
  feelsLike: "Feels like",
  high: "High",
  low: "Low",
  precipitation: "Precipitation",
  humidity: "Humidity",
  windSpeed: "Wind Speed",
  windVector: "WIND VECTOR",
  uvIndex: "UV Index",
  visibility: "Visibility",
  pressure: "Pressure",
  advisories: "Active Advisories",
  hourlyForecast: "Hourly Forecast",
  dailyForecast: "7-Day Forecast",
  realTimeTelemetry: "REAL-TIME TELEMETRY",
  gusts: "Gusts",
  dewPoint: "Dew pt",
  rainProb: "Prob",
  rainAccumulation: "rain",
  noAccumulation: "0.0 mm accumulation",
  sunrise: "Sunrise",
  sunset: "Sunset",
  sunriseWas: "Sunrise was",
  sunsetWas: "Sunset was",
  ratingLabel: "Overall outdoor rating",

  forecastBannerTag: "METEOROLOGICAL FORECAST",
  forecastBannerTitle: "Multi-Day & Hourly Trajectory",
  forecastBannerDesc:
    "High-resolution thermodynamic temperature projections, precipitation probabilities, barometric pressure trends, and wind vector curves.",
  hourlyHorizon: "24-Hour Diurnal Horizon",
  hourlySubtitle: "Continuous curve tracking real-time physical temperature shifts",
  metricTemperature: "Temperature",
  metricPrecipitation: "Precipitation",
  sevenDayOutlook: "7-Day Extended Outlook",
  deterministicProgression: "Deterministic physical model progression",
  today: "Today",
  tomorrow: "Tomorrow",
  now: "Now",
  tempLabel: "Temp",
  feelsLikeLabel: "Feels",
  rainProbLabel: "Rain Prob",
  activeBadge: "Active",
  mm: "mm",
  conditions: {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    80: "Rain Showers",
    81: "Moderate Showers",
    82: "Violent Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Hail",
    99: "Heavy Thunderstorm",
  },
  activeAdvisoriesTitle: "Active Meteorological Advisories",
  noActiveAdvisories: "No Active Weather Advisories",
  safeOperationalThresholds: "Atmospheric conditions are within standard safe operational thresholds.",
  actionAdvice: "Action Advice:",
  advisoryDisclaimer: "WeatherGPT Deterministic Advisory — generated from factual meteorological thresholds.",

  landingHeroBadge: "GROUNDED ATMOSPHERIC INTELLIGENCE",
  landingHeroTitle: "Conversational Weather Intelligence, Grounded in Real-Time Physics",
  landingHeroSubtitle: "Explore verified weather forecasts, multi-day trajectories, travel corridors, and AI insights across 30+ regional and global languages.",
  landingGetStarted: "Get Started",
  landingExploreWeather: "Explore Weather",
  landingDiscoverFeatures: "Discover Features",
  landingExploreForecast: "Explore Live Forecast",
  landingQuickCities: "Popular Destinations",
  featureLiveForecastTitle: "Live Grounded Forecasts",
  featureLiveForecastDesc: "Real-time Open-Meteo physical observations including barometric pressure, wind vectors, and humidity.",
  featureTrajectoriesTitle: "Hourly & 7-Day Trajectories",
  featureTrajectoriesDesc: "High-resolution thermodynamic temperature curves, precipitation probabilities, and UV index trends.",
  featureAIChatTitle: "Conversational Weather AI",
  featureAIChatDesc: "Ask natural language questions about outdoor sports, travel advice, and weather advisories.",
  featureVoiceMultilingualTitle: "30+ Language Voice Studio",
  featureVoiceMultilingualDesc: "Hands-free speech dictation and audio responses in Hindi, Hinglish, Bengali, Tamil, Spanish, and more.",
  featureTravelCompareTitle: "Travel Corridors & Comparisons",
  featureTravelCompareDesc: "Highway route weather projections and side-by-side climate analysis for global cities.",
  landingTryQueryTitle: "Sample Weather Inquiries",

  send: "Send",
  sending: "Sending...",
  stop: "Stop",
  askPlaceholder: "Ask anything about weather, rain, running, road trips...",
  searchPlaceholder: "Search any city or region worldwide...",
  selectLocation: "Select Location",
  newChat: "New Chat",
  voiceDictation: "Voice Dictation",
  suggestedInquiries: "Suggested Inquiries",
  welcomeChatGreeting: "Hello! I am WeatherGPT, your conversational weather intelligence assistant.",
  aiAssistant: "AI Weather Assistant",

  activityBannerTag: "METEOROLOGICAL SUITABILITY • HIGH-PRECISION ACTIVITY ANALYSIS",
  activityBannerTitle: "Outdoor Activity Suitability Engine",
  activityBannerDesc:
    "Physics-grounded evaluations of thermal comfort, precipitation windows, UV exposure, and aerodynamic wind resistance.",
  recommendedWindow: "Recommended Time Window",
  meteorologicalFactors: "Meteorological Factors",
  safetyPrecautions: "Safety & Precautions",
  suitabilityExcellent: "Excellent",
  suitabilityGood: "Good",
  suitabilityFair: "Fair",
  suitabilityPoor: "Poor",
  suitabilityUnsuitable: "Unsuitable",
  activityCricket: "Cricket",
  activityRunning: "Running",
  activityCycling: "Cycling",
  activityFootball: "Football",
  activityWalking: "Walking",
  activityPicnic: "Picnic",
  activityHiking: "Hiking",
  activityPhotography: "Photography",
  activityGardening: "Gardening",
  activityEvents: "Events",

  travelBannerTag: "TRANSIT METEOROLOGY • CORRIDOR ANALYSIS",
  travelBannerTitle: "Intercity Route Weather Intelligence",
  travelBannerDesc:
    "Cross-reference departure, en-route waypoints, and arrival terminal weather for driving, cycling, and train corridors.",
  originLocation: "Origin Location",
  destinationLocation: "Destination Location",
  travelMode: "Mode of Travel",
  analyzeRoute: "Analyze Route Weather",
  analyzingRoute: "Analyzing Route Corridors...",
  routeSummary: "Route Meteorological Summary",
  departure: "Departure",
  arrival: "Arrival",
  waypoints: "En-Route Waypoints",
  modeCar: "Car / Drive",
  modeBike: "Bike / Motorcycle",
  modeBus: "Bus",
  modeTrain: "Train",
  modeFlight: "Flight",

  voiceBannerTag: "HANDS-FREE MULTILINGUAL SPEECH • ULTRA-LOW LATENCY",
  voiceBannerTitle: "Interactive Synoptic Voice Studio",
  voiceBannerDesc:
    "Natural spoken weather briefings with automatic regional language recognition, Sarvam Bulbul neural voices, and conversational Gemini Live.",
  startListening: "Start Listening",
  stopListening: "Stop Listening",
  listening: "Listening...",
  speaking: "Speaking...",
  processing: "Processing...",
  micReady: "Microphone Ready",
  configureVoice: "Configure Voice & Dialects",
  geminiLive: "Gemini Live Realtime",

  exploreBannerTag: "GLOBAL SYNOPTIC NETWORK • METEOROLOGICAL HUBS",
  exploreBannerTitle: "Explore Hubs & Side-by-Side Comparison",
  exploreBannerDesc:
    "Compare meteorological profiles across multiple global metropolitan hubs or assess local microclimates side-by-side.",
  tabFeaturedHubs: "Curated Meteorological Hubs",
  tabCompareCities: "Side-by-Side City Comparison",
  compareNow: "Compare Cities",
  firstCity: "First City",
  secondCity: "Second City",
  temperatureComparison: "Temperature Comparison",
  precipitationComparison: "Precipitation & Rain Risk",
  windComparison: "Wind & Atmospheric Pressure",

  historyBannerTag: "PERSISTENT METEOROLOGICAL SESSIONS • CLOUD STORAGE",
  historyBannerTitle: "Atmospheric Inquiries & Conversation History",
  historyBannerDesc:
    "Review past meteorological queries, restored atmospheric context, and multi-day synoptic investigations.",
  searchHistoryPlaceholder: "Search past sessions by city or query...",
  noHistoryFound: "No past conversation sessions found",
  startNewChat: "Start a New Chat",
  clearHistory: "Clear All History",
  confirmClear: "Are you sure you want to delete all conversation history?",
  guestHistoryNotice: "You are in Guest Mode. Sign in to sync your history across devices.",

  settingsBannerTag: "CALIBRATION & PROFILE • METEOROLOGICAL TELEMETRY",
  settingsBannerTitle: "Preferences & System Configuration",
  settingsBannerDesc:
    "Manage language, measurement units, atmospheric display modes, voice engines, and personal meteorological profiles.",
  accountSection: "Account & Authentication",
  interfaceLanguage: "Application Interface Language",
  interfaceLanguageDesc: "Changes all buttons, labels, navigation, and dashboard controls across WeatherGPT.",
  tempUnitSection: "Temperature Measurement Unit",
  appearanceSection: "Visual Theme & Diurnal Ambience",
  viewportSection: "Responsive Viewport Simulation",
  voiceSettingsSection: "Speech & Voice Configuration",
  dangerZone: "Data & Cache Reset",
  resetDefaults: "Reset App to Factory Defaults",
  resetConfirm: "Reset all local settings, saved cities, and cache to factory defaults?",

  searchDialogTitle: "Search Global Locations",
  searchDialogPlaceholder: "Search any city, airport, zip code, or country worldwide...",
  searchingLocations: "Searching global meteorological stations...",
  noLocationsFound: "No matching locations found. Try checking the spelling.",
  escToClose: "ESC to close",
  popularSearches: "Popular Global Hubs",

  authTitle: "WeatherGPT Account",
  authSubtitle: "Cloud history, sync & preferences",
  continueWithGoogle: "Continue with Google",
  continueAsGuest: "Continue as Guest",
  authFeatures: "Features: Real-time sync, multi-device history, saved routes and locations",

  liveAuto: "Live Auto",
  dawn: "Dawn",
  solarApex: "Solar Apex",
  goldenHour: "Golden Hour",
  dusk: "Dusk",
  night: "Night",

  viewport: "VIEWPORT:",
  responsiveAuto: "Auto (Responsive)",
  phone: "Phone",
  tablet: "Tablet",
  laptop: "Laptop",
  desktop: "Desktop",

  close: "Close",
  cancel: "Cancel",
  save: "Save",
  confirm: "Confirm",
  back: "Back",
  error: "Error",
};
