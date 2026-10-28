import express, { Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import { geocodingProvider } from "./providers/geocodingProvider.js";
import { weatherProvider, WeatherProviderError } from "./providers/weatherProvider.js";
import { analyzeWeather, generateAdvisories } from "./services/weatherIntelligence.js";
import { evaluateActivity } from "./services/activityIntelligence.js";
import { compareLocations } from "./services/comparisonIntelligence.js";
import { analyzeTravel } from "./services/travelIntelligence.js";
import { resolveLocationAndIntent } from "./services/nluService.js";
import { generateWeatherExplanation, GroundedWeatherContext, transcribeAudioWithGemini } from "./services/geminiService.js";
import { buildMultilingualDeterministicFallback, getLocalizedLocationRequiredMessage } from "./services/multilingualFallback.js";
import { ConversationContext, LocationInfo, QueryRequest, QueryResponse } from "./types.js";
import { bhashiniProvider } from "./providers/bhashiniProvider.js";
import { sarvamProvider } from "./providers/sarvamProvider.js";
import { elevenlabsProvider } from "./providers/elevenlabsProvider.js";
import { ALL_LANGUAGES, INDIAN_LANGUAGES, INTERNATIONAL_LANGUAGES } from "../src/languages.js";

export interface ServerAppOptions {
  configuredAppOrigin?: string;
  aiRateLimitMax?: number;
  ttsRateLimitMax?: number;
  sttRateLimitMax?: number;
  maxTextBodySize?: string;
  maxAudioBodySize?: string;
}

/**
 * Validates whether a given origin string is a safe, absolute HTTP(S) origin.
 * Must NOT contain paths, query parameters, hashes, or credentials.
 */
export function validateConfiguredOrigin(originStr?: string): string | null {
  if (!originStr || typeof originStr !== "string") return null;
  const trimmed = originStr.trim();
  if (!trimmed || trimmed === "*") return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // Disallow path (other than '/'), query, hash, or username/password
    if (url.pathname !== "/" && url.pathname !== "") return null;
    if (url.search || url.hash || url.username || url.password) return null;

    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * Generates client-side target origin resolution script for OAuth callback HTML.
 */
export function getSafeTargetOriginScript(configuredOrigin: string | null): string {
  return `
    function getTargetOrigin() {
      var configured = ${JSON.stringify(configuredOrigin)};
      if (configured) return configured;
      try {
        var origin = window.location.origin;
        if (origin && (origin.indexOf('http://') === 0 || origin.indexOf('https://') === 0)) {
          var parsed = new URL(origin);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.protocol + '//' + parsed.host;
          }
        }
      } catch (e) {}
      return null;
    }
  `;
}

export function buildServerApp(options?: ServerAppOptions) {
  const app = express();

  // Configure reverse proxy trust if specified
  if (process.env.TRUST_PROXY) {
    const proxySetting = process.env.TRUST_PROXY === "true" ? 1 : process.env.TRUST_PROXY;
    app.set("trust proxy", proxySetting);
  }

  // 1. Defined Body Parsers
  const maxTextSize = options?.maxTextBodySize || process.env.MAX_TEXT_BODY_SIZE || "1mb";
  const maxAudioSize = options?.maxAudioBodySize || process.env.MAX_AUDIO_BODY_SIZE || "15mb";

  const textJsonParser = express.json({ limit: maxTextSize });
  const textUrlencodedParser = express.urlencoded({ extended: true, limit: maxTextSize });

  const audioJsonParser = express.json({ limit: maxAudioSize });
  const audioUrlencodedParser = express.urlencoded({ extended: true, limit: maxAudioSize });

  // 2. CORS & Security Headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  // 3. Body Parser Error Handling Middleware (Catches HTTP 413 and 400 Bad Request)
  const bodyParserErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err && (err.type === "entity.too.large" || err.status === 413 || err.statusCode === 413)) {
      return res.status(413).json({
        success: false,
        error: "Payload too large. Request body exceeds maximum allowed size.",
        code: "PAYLOAD_TOO_LARGE",
      });
    }
    if (err && err instanceof SyntaxError && "body" in err && (err as any).status === 400) {
      return res.status(400).json({
        success: false,
        error: "Invalid JSON body format.",
        code: "BAD_REQUEST",
      });
    }
    next(err);
  };

  // 4. Configurable Rate Limiters
  const rateLimitHandler = (req: Request, res: Response) => {
    res.setHeader("Retry-After", 60);
    return res.status(429).json({
      success: false,
      error: "Too many requests. Please try again later.",
      code: "TOO_MANY_REQUESTS",
    });
  };

  const isTestEnv = process.env.NODE_ENV === "test";
  const defaultAiMax = isTestEnv ? 1000 : 30;
  const defaultTtsMax = isTestEnv ? 1000 : 20;
  const defaultSttMax = isTestEnv ? 1000 : 20;

  const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: options?.aiRateLimitMax ?? Number(process.env.AI_RATE_LIMIT_MAX || defaultAiMax),
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    validate: false,
    keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || "127.0.0.1",
  });

  const ttsRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: options?.ttsRateLimitMax ?? Number(process.env.TTS_RATE_LIMIT_MAX || defaultTtsMax),
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    validate: false,
    keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || "127.0.0.1",
  });

  const sttRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: options?.sttRateLimitMax ?? Number(process.env.STT_RATE_LIMIT_MAX || defaultSttMax),
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    validate: false,
    keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || "127.0.0.1",
  });

  // Target OAuth Origin validation
  const safeConfiguredOrigin = validateConfiguredOrigin(
    options?.configuredAppOrigin || process.env.APP_ORIGIN || process.env.PUBLIC_URL
  );

  // ==========================================
  // API ROUTES
  // ==========================================

  // OAuth Callback Handler (for Google / Supabase Auth popup & redirect flows)
  app.get(["/auth/callback", "/auth/callback/"], (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
    const targetOriginScript = getSafeTargetOriginScript(safeConfiguredOrigin);

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>WeatherGPT • Authentication Complete</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #080f1a;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 1rem;
      padding: 2.2rem;
      text-align: center;
      max-width: 380px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .spinner {
      border: 3px solid rgba(56, 189, 248, 0.15);
      border-top: 3px solid #38bdf8;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.2rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h2 { font-size: 1.15rem; margin: 0 0 0.5rem; font-weight: 700; color: #fff; }
    p { font-size: 0.85rem; color: #94a3b8; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Authenticating with Google...</h2>
    <p>Finalizing your verified WeatherGPT session. This window will close automatically in a moment.</p>
  </div>
  <script>
    ${targetOriginScript}
    try {
      if (window.opener && window.opener !== window) {
        var targetOrigin = getTargetOrigin();
        if (targetOrigin) {
          window.opener.postMessage({
            type: 'SUPABASE_AUTH_SUCCESS',
            hash: window.location.hash,
            search: window.location.search,
            href: window.location.href
          }, targetOrigin);
          setTimeout(function() {
            window.close();
          }, 800);
        } else {
          console.error("WeatherGPT Auth Callback: Unable to determine safe target origin.");
        }
      } else {
        window.location.href = '/' + window.location.search + window.location.hash;
      }
    } catch (e) {
      window.location.href = '/';
    }
  </script>
</body>
</html>`);
  });

  // Health Status
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "WeatherGPT API",
      timestamp: new Date().toISOString(),
      weatherProvider: process.env.WEATHER_PROVIDER || "open-meteo",
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      bhashini: bhashiniProvider.getStatus(),
    });
  });

  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Multilingual Languages Registry Route
  app.get("/api/languages", (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.json({
      success: true,
      languages: ALL_LANGUAGES,
      indianLanguages: INDIAN_LANGUAGES,
      internationalLanguages: INTERNATIONAL_LANGUAGES,
    });
  });

  // BHASHINI Provider Status
  app.get("/api/bhashini/status", (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(bhashiniProvider.getStatus());
  });

  // BHASHINI Translation Pipeline (Text route with 1MB limit)
  app.post("/api/bhashini/translate", textJsonParser, textUrlencodedParser, bodyParserErrorHandler, async (req: Request, res: Response) => {
    try {
      const { text, sourceLanguage, targetLanguage } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, error: "Text is required." });
      }
      const result = await bhashiniProvider.translate({
        text,
        sourceLanguage: sourceLanguage || "en",
        targetLanguage: targetLanguage || "hi",
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Location Search & Geocoding
  app.get(["/api/location/search", "/api/geocoding/search", "/api/geocoding"], async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || req.query.query || "").trim();
      if (!q) {
        return res.json({ success: true, locations: [], results: [] });
      }
      const count = req.query.count ? parseInt(String(req.query.count), 10) : 5;
      const locations = await geocodingProvider.searchLocations(q, count);
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.json({ success: true, locations, results: locations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  function handleWeatherError(res: Response, err: any) {
    if (err instanceof WeatherProviderError) {
      const status = err.category === "validation_error" ? 400 :
                     err.category === "timeout" ? 504 :
                     err.category === "http_error" ? (err.statusCode || 502) :
                     502;
      return res.status(status).json({
        success: false,
        error: err.message,
        category: err.category,
        statusCode: err.statusCode,
      });
    }
    return res.status(500).json({ success: false, error: err.message || "Internal weather error" });
  }

  // Current Weather
  app.get(["/api/weather/current", "/api/weather/live"], async (req: Request, res: Response) => {
    try {
      let lat = req.query.lat ? parseFloat(String(req.query.lat)) : NaN;
      let lon = req.query.lon ? parseFloat(String(req.query.lon)) : NaN;
      let locationName = String(req.query.location || "").trim();
      let resolvedLoc: LocationInfo | null = null;

      if (isNaN(lat) || isNaN(lon)) {
        if (!locationName) {
          return res.status(400).json({ success: false, error: "Location coordinates or name is required." });
        }
        resolvedLoc = await geocodingProvider.resolveLocation(locationName);
        if (!resolvedLoc) {
          return res.status(404).json({ success: false, error: `Location "${locationName}" could not be resolved.` });
        }
        lat = resolvedLoc.latitude;
        lon = resolvedLoc.longitude;
      } else {
        resolvedLoc = {
          name: locationName || "Selected Coordinates",
          latitude: lat,
          longitude: lon,
          timezone: String(req.query.timezone || "UTC"),
        };
      }

      const weatherData = await weatherProvider.getWeatherData(lat, lon, resolvedLoc.timezone);
      const analysis = analyzeWeather(weatherData.current, weatherData.hourly, weatherData.daily);
      const advisories = generateAdvisories(resolvedLoc.name, weatherData.current, weatherData.hourly, weatherData.daily);

      res.setHeader("Cache-Control", "public, max-age=180, stale-while-revalidate=600");
      res.json({
        success: true,
        location: resolvedLoc,
        current: weatherData.current,
        hourly: weatherData.hourly,
        daily: weatherData.daily,
        analysis,
        advisories,
      });
    } catch (err: any) {
      handleWeatherError(res, err);
    }
  });

  // Hourly Forecast
  app.get("/api/weather/hourly", async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(String(req.query.lat));
      const lon = parseFloat(String(req.query.lon));
      const tz = String(req.query.timezone || "UTC");

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ success: false, error: "Latitude and longitude coordinates are required." });
      }

      const weatherData = await weatherProvider.getWeatherData(lat, lon, tz);
      res.setHeader("Cache-Control", "public, max-age=180, stale-while-revalidate=600");
      res.json({ success: true, hourly: weatherData.hourly });
    } catch (err: any) {
      handleWeatherError(res, err);
    }
  });

  // Daily Forecast
  app.get("/api/weather/daily", async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(String(req.query.lat));
      const lon = parseFloat(String(req.query.lon));
      const tz = String(req.query.timezone || "UTC");

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ success: false, error: "Latitude and longitude coordinates are required." });
      }

      const weatherData = await weatherProvider.getWeatherData(lat, lon, tz);
      res.setHeader("Cache-Control", "public, max-age=180, stale-while-revalidate=600");
      res.json({ success: true, daily: weatherData.daily });
    } catch (err: any) {
      handleWeatherError(res, err);
    }
  });

  // Advisories & Alerts
  app.get("/api/alerts", async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(String(req.query.lat));
      const lon = parseFloat(String(req.query.lon));
      const locationName = String(req.query.location || "Selected Location");
      const tz = String(req.query.timezone || "UTC");

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ success: false, error: "Latitude and longitude coordinates are required." });
      }

      const weatherData = await weatherProvider.getWeatherData(lat, lon, tz);
      const advisories = generateAdvisories(locationName, weatherData.current, weatherData.hourly, weatherData.daily);

      res.json({ success: true, advisories });
    } catch (err: any) {
      handleWeatherError(res, err);
    }
  });

  // Activity Analysis (AI Intelligence route)
  app.post("/api/activity/analyze", textJsonParser, textUrlencodedParser, bodyParserErrorHandler, aiRateLimiter, async (req: Request, res: Response) => {
    try {
      const { activity, location, lat, lon } = req.body;
      let latitude = lat ? parseFloat(String(lat)) : NaN;
      let longitude = lon ? parseFloat(String(lon)) : NaN;
      let locInfo: LocationInfo | null = null;

      if (isNaN(latitude) || isNaN(longitude)) {
        if (!location) {
          return res.status(400).json({ success: false, error: "Location coordinates or place name are required." });
        }
        locInfo = await geocodingProvider.resolveLocation(String(location));
        if (!locInfo) {
          return res.status(404).json({ success: false, error: `Could not resolve location "${location}"` });
        }
        latitude = locInfo.latitude;
        longitude = locInfo.longitude;
      }

      const weatherData = await weatherProvider.getWeatherData(latitude, longitude, locInfo?.timezone);
      const activityAnalysis = evaluateActivity(activity || "running", weatherData.current, weatherData.hourly, weatherData.daily);

      res.json({
        success: true,
        location: locInfo || { name: location || "Target Location", latitude, longitude, timezone: "UTC" },
        currentWeather: weatherData.current,
        activityAnalysis,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Location Comparison (AI Intelligence route)
  app.post("/api/comparison/analyze", textJsonParser, textUrlencodedParser, bodyParserErrorHandler, aiRateLimiter, async (req: Request, res: Response) => {
    try {
      const { locations, timeContext } = req.body;
      if (!locations || !Array.isArray(locations) || locations.length < 2) {
        return res.status(400).json({ success: false, error: "Please provide an array of at least 2 locations to compare." });
      }

      const resolvedLocations: LocationInfo[] = [];
      const failedLocations: string[] = [];
      for (const item of locations) {
        if (typeof item === "string") {
          const resLoc = await geocodingProvider.resolveLocation(item);
          if (resLoc) resolvedLocations.push(resLoc);
          else failedLocations.push(item);
        } else if (item.latitude && item.longitude) {
          resolvedLocations.push(item);
        }
      }

      if (resolvedLocations.length < 2) {
        return res.status(400).json({
          success: false,
          error: "Could not resolve enough valid locations for comparison.",
          failedLocations,
        });
      }

      const comparison = await compareLocations(resolvedLocations, timeContext);
      if (failedLocations.length > 0) {
        comparison.failedLocations = failedLocations;
      }
      res.json({ success: true, comparison });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Travel Weather Analysis (AI Intelligence route)
  app.post("/api/travel/analyze", textJsonParser, textUrlencodedParser, bodyParserErrorHandler, aiRateLimiter, async (req: Request, res: Response) => {
    try {
      const { origin, destination, mode } = req.body;
      if (!origin || !destination) {
        return res.status(400).json({ success: false, error: "Both origin and destination are required." });
      }

      let originLoc: LocationInfo | null = typeof origin === "object" ? origin : await geocodingProvider.resolveLocation(String(origin));
      let destLoc: LocationInfo | null = typeof destination === "object" ? destination : await geocodingProvider.resolveLocation(String(destination));

      if (!originLoc || !destLoc) {
        return res.status(404).json({ success: false, error: `Could not resolve travel endpoints: ${!originLoc ? origin : ""} ${!destLoc ? destination : ""}` });
      }

      const travelAnalysis = await analyzeTravel(originLoc, destLoc, mode || "car");
      res.json({ success: true, travel: travelAnalysis });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Main Conversational AI Weather Query Endpoint: POST /api/weather/query
  app.post("/api/weather/query", textJsonParser, textUrlencodedParser, bodyParserErrorHandler, aiRateLimiter, async (req: Request, res: Response) => {
    try {
      const body: QueryRequest = req.body;
      const message = (body.message || "").trim();
      if (!message) {
        return res.status(400).json({ success: false, error: "Message is required." });
      }

      const context: ConversationContext = body.context || {};
      const { parsed, resolution } = await resolveLocationAndIntent(
        message,
        context,
        body.preferredLanguage,
        body.location
      );

      const language = resolution.language;
      let primaryLocation: LocationInfo | null = resolution.location;

      if (parsed.intent !== "travel" && parsed.intent !== "comparison" && resolution.requiresLocation) {
        const reply = getLocalizedLocationRequiredMessage(language);
        return res.json({
          success: true,
          reply,
          language,
          intent: parsed.intent,
          isAIGenerated: false,
          fallbackUsed: true,
          context: {
            ...context,
            lastQueryTimestamp: new Date().toISOString(),
          },
          data: {
            requiresLocation: true,
            locationResolution: resolution,
          },
        });
      }

      const groundedContext: GroundedWeatherContext = {
        userQuery: message,
        language,
        location: primaryLocation || undefined,
      };

      const responseData: QueryResponse["data"] = {
        location: primaryLocation || undefined,
        requiresLocation: false,
        locationResolution: resolution,
      };

      if (parsed.intent === "travel" && parsed.travelDetails) {
        const origLoc = (await geocodingProvider.resolveLocation(parsed.travelDetails.origin)) || primaryLocation;
        const destLoc = await geocodingProvider.resolveLocation(parsed.travelDetails.destination);
        if (origLoc && destLoc) {
          const travelRes = await analyzeTravel(origLoc, destLoc, parsed.travelDetails.mode);
          groundedContext.travel = travelRes;
          responseData.travel = travelRes;
        }
      } else if (parsed.intent === "comparison" && parsed.comparisonLocations && parsed.comparisonLocations.length >= 1) {
        const compLocs: LocationInfo[] = [];
        const failedLocNames: string[] = [];

        for (const cName of parsed.comparisonLocations) {
          try {
            const resolved = await geocodingProvider.resolveLocation(cName);
            if (resolved) {
              compLocs.push(resolved);
            } else {
              failedLocNames.push(cName);
            }
          } catch {
            failedLocNames.push(cName);
          }
        }

        if (compLocs.length >= 2) {
          const compRes = await compareLocations(compLocs, parsed.timeContext);
          if (failedLocNames.length > 0) {
            compRes.failedLocations = failedLocNames;
            groundedContext.failedLocations = failedLocNames;
            responseData.failedLocations = failedLocNames;
          }
          groundedContext.comparison = compRes;
          responseData.comparison = compRes;
          primaryLocation = compLocs[0];
          groundedContext.location = primaryLocation;
          responseData.location = primaryLocation;
        } else if (compLocs.length === 1 && failedLocNames.length > 0) {
          primaryLocation = compLocs[0];
          groundedContext.location = primaryLocation;
          responseData.location = primaryLocation;

          const weatherData = await weatherProvider.getWeatherData(primaryLocation.latitude, primaryLocation.longitude, primaryLocation.timezone);
          const analysis = analyzeWeather(weatherData.current, weatherData.hourly, weatherData.daily);
          const advisories = generateAdvisories(primaryLocation.name, weatherData.current, weatherData.hourly, weatherData.daily);

          groundedContext.current = weatherData.current;
          groundedContext.hourly = weatherData.hourly;
          groundedContext.daily = weatherData.daily;
          groundedContext.analysis = analysis;
          groundedContext.advisories = advisories;
          groundedContext.failedLocations = failedLocNames;

          responseData.current = weatherData.current;
          responseData.hourly = weatherData.hourly;
          responseData.daily = weatherData.daily;
          responseData.analysis = analysis;
          responseData.advisories = advisories;
          responseData.failedLocations = failedLocNames;
        }
      } else {
        if (primaryLocation) {
          const weatherData = await weatherProvider.getWeatherData(primaryLocation.latitude, primaryLocation.longitude, primaryLocation.timezone);

          const analysis = analyzeWeather(weatherData.current, weatherData.hourly, weatherData.daily);
          const advisories = generateAdvisories(primaryLocation.name, weatherData.current, weatherData.hourly, weatherData.daily);

          groundedContext.current = weatherData.current;
          groundedContext.hourly = weatherData.hourly;
          groundedContext.daily = weatherData.daily;
          groundedContext.analysis = analysis;
          groundedContext.advisories = advisories;

          responseData.current = weatherData.current;
          responseData.hourly = weatherData.hourly;
          responseData.daily = weatherData.daily;
          responseData.analysis = analysis;
          responseData.advisories = advisories;

          if (parsed.intent === "activity" && parsed.activity) {
            const actRes = evaluateActivity(parsed.activity, weatherData.current, weatherData.hourly, weatherData.daily);
            groundedContext.activity = actRes;
            responseData.activity = actRes;
          }
        }
      }

      const explanation = await generateWeatherExplanation(groundedContext);

      const updatedContext: ConversationContext = {
        currentLocation: primaryLocation || context.currentLocation,
        lastQueryTimestamp: new Date().toISOString(),
        currentActivity: parsed.activity || context.currentActivity,
      };

      const responsePayload: QueryResponse = {
        success: true,
        reply: explanation.reply,
        language,
        intent: parsed.intent,
        isAIGenerated: explanation.isAIGenerated,
        fallbackUsed: explanation.fallbackUsed,
        context: updatedContext,
        data: responseData,
      };

      res.json(responsePayload);
    } catch (err: any) {
      console.error("Error handling /api/weather/query:", err);
      res.status(500).json({
        success: false,
        error: "Weather intelligence service encountered an unexpected issue. Please try again.",
      });
    }
  });

  // Voice Capabilities & Status
  app.get("/api/voice/status", (req: Request, res: Response) => {
    res.json({
      success: true,
      sttAvailable: true,
      ttsAvailable: true,
      bhashini: bhashiniProvider.getStatus(),
      sarvam: sarvamProvider.getStatus(),
      elevenlabs: elevenlabsProvider.getStatus(),
      supportedLanguages: ALL_LANGUAGES.map((l) => ({
        code: l.code,
        bcp47: l.bcp47,
        name: l.name,
        nativeName: l.nativeName,
        category: l.category,
      })),
    });
  });

  // Voice Transcription & ASR (Audio route with 15MB limit + STT rate limiter)
  app.post(["/api/voice/transcribe", "/api/voice/asr"], audioJsonParser, audioUrlencodedParser, bodyParserErrorHandler, sttRateLimiter, async (req: Request, res: Response) => {
    try {
      const { audioBase64, language, sourceLanguage, languageCode, mimeType, audioFormat } = req.body;
      const targetLang = language || sourceLanguage || languageCode;

      if (!audioBase64) {
        return res.status(400).json({
          success: false,
          error: "audioBase64 is required for speech recognition.",
        });
      }

      const audioBuffer = Buffer.from(audioBase64, "base64");

      if (elevenlabsProvider.isAvailable()) {
        const elevenResult = await elevenlabsProvider.transcribe({
          audioBuffer,
          mimeType: mimeType || (audioFormat ? `audio/${audioFormat}` : "audio/webm"),
          languageCode: targetLang,
        });

        if (elevenResult.success && elevenResult.transcript) {
          return res.json(elevenResult);
        }

        if (!bhashiniProvider.isAvailable()) {
          return res.status(elevenResult.code?.includes("400") ? 400 : 502).json(elevenResult);
        }
      }

      if (bhashiniProvider.isAvailable() && targetLang) {
        const bhashiniResult = await bhashiniProvider.asr({
          audioBase64,
          sourceLanguage: targetLang,
          audioFormat: audioFormat || "wav",
        });
        return res.json(bhashiniResult);
      }

      return res.status(503).json({
        success: false,
        error: "No server-side speech recognition provider is currently configured (configure ELEVENLABS_API_KEY in .env).",
        code: "stt-provider-unavailable",
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Explicit ElevenLabs Speech-To-Text Endpoint (Audio route with 15MB limit + STT rate limiter)
  app.post("/api/voice/elevenlabs/transcribe", audioJsonParser, audioUrlencodedParser, bodyParserErrorHandler, sttRateLimiter, async (req: Request, res: Response) => {
    try {
      const { audioBase64, language, mimeType } = req.body;
      if (!audioBase64) {
        return res.status(400).json({
          success: false,
          error: "audioBase64 is required.",
        });
      }

      if (!elevenlabsProvider.isAvailable()) {
        return res.status(503).json({
          success: false,
          error: "ElevenLabs API is not configured or ELEVENLABS_API_KEY is missing on server.",
          code: "elevenlabs-unavailable",
        });
      }

      const audioBuffer = Buffer.from(audioBase64, "base64");
      const result = await elevenlabsProvider.transcribe({
        audioBuffer,
        mimeType: mimeType || "audio/webm",
        languageCode: language,
      });

      res.status(result.success ? 200 : 502).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Gemini Audio Transcription Endpoint (Audio route with 15MB limit + STT rate limiter)
  app.post(["/api/audio/transcribe"], audioJsonParser, audioUrlencodedParser, bodyParserErrorHandler, sttRateLimiter, async (req: Request, res: Response) => {
    try {
      const { audioBase64, mimeType = "audio/webm", language } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ success: false, error: "audioBase64 is required for transcription" });
      }

      const text = await transcribeAudioWithGemini(audioBase64, mimeType, language);
      return res.json({
        success: true,
        text,
        model: "gemini-3.5-transcribe",
        language: language || "auto",
      });
    } catch (err: any) {
      console.error("Gemini transcribe error:", err);
      return res.status(500).json({ success: false, error: err.message || "Transcription failed" });
    }
  });

  // Explicit ElevenLabs Text-To-Speech Endpoint (Text route with 1MB limit + TTS rate limiter)
  app.post("/api/voice/elevenlabs/tts", textJsonParser, textUrlencodedParser, bodyParserErrorHandler, ttsRateLimiter, async (req: Request, res: Response) => {
    try {
      const { text, voiceId, targetLanguage, stability, similarityBoost } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          error: "text is required.",
        });
      }

      if (!elevenlabsProvider.isAvailable()) {
        return res.status(503).json({
          success: false,
          error: "ElevenLabs API is not configured or ELEVENLABS_API_KEY is missing on server.",
          code: "elevenlabs-unavailable",
        });
      }

      const result = await elevenlabsProvider.tts({
        text,
        voiceId,
        targetLanguage,
        stability,
        similarityBoost,
      });

      res.status(result.success ? 200 : 502).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Voice TTS via Sarvam Bulbul v3 (Text route with 1MB limit + TTS rate limiter)
  app.post("/api/voice/sarvam/tts", textJsonParser, textUrlencodedParser, bodyParserErrorHandler, ttsRateLimiter, async (req: Request, res: Response) => {
    try {
      const { text, gender, speaker, pace } = req.body;
      const targetLanguage = req.body.targetLanguage || req.body.language || req.body.sourceLanguage;

      if (!text || !targetLanguage) {
        return res.status(400).json({
          success: false,
          error: "text and targetLanguage/language are required.",
        });
      }

      if (
        targetLanguage.toLowerCase() === "all" ||
        targetLanguage.toLowerCase() === "auto"
      ) {
        return res.status(400).json({
          success: false,
          error: "A concrete language code is required. 'ALL' or 'auto' cannot be synthesized directly.",
          code: "concrete-language-required",
        });
      }

      if (!sarvamProvider.isAvailable()) {
        return res.status(503).json({
          success: false,
          error: "Sarvam AI TTS is not configured or SARVAM_API_KEY is missing on server.",
          code: "sarvam-unavailable",
        });
      }

      if (!sarvamProvider.isLanguageSupported(targetLanguage)) {
        return res.status(400).json({
          success: false,
          error: `Language '${targetLanguage}' is not supported by Sarvam Bulbul v3.`,
          code: "language-unsupported",
        });
      }

      const result = await sarvamProvider.tts({
        text,
        targetLanguage,
        gender,
        speaker,
        pace,
      });

      if (!result.success) {
        return res.status(502).json(result);
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Voice TTS Unified Endpoint (Text route with 1MB limit + TTS rate limiter)
  app.post("/api/voice/tts", textJsonParser, textUrlencodedParser, bodyParserErrorHandler, ttsRateLimiter, async (req: Request, res: Response) => {
    try {
      const { text, gender, speaker, pace, voiceId } = req.body;
      const sourceLanguage = req.body.sourceLanguage || req.body.language || req.body.targetLanguage;
      if (!text || !sourceLanguage) {
        return res.status(400).json({
          success: false,
          error: "text and sourceLanguage/language are required.",
        });
      }

      if (
        sourceLanguage.toLowerCase() === "all" ||
        sourceLanguage.toLowerCase() === "auto"
      ) {
        return res.status(400).json({
          success: false,
          error: "A concrete language code is required. 'ALL' or 'auto' cannot be synthesized directly.",
          code: "concrete-language-required",
        });
      }

      if (sarvamProvider.isAvailable() && sarvamProvider.isLanguageSupported(sourceLanguage)) {
        const sarvamResult = await sarvamProvider.tts({
          text,
          targetLanguage: sourceLanguage,
          gender,
          speaker,
          pace,
        });

        if (sarvamResult.success && sarvamResult.audioBase64) {
          return res.json(sarvamResult);
        }
      }

      if (elevenlabsProvider.isAvailable()) {
        const elevenResult = await elevenlabsProvider.tts({
          text,
          voiceId,
          targetLanguage: sourceLanguage,
        });
        if (elevenResult.success && elevenResult.audioBase64) {
          return res.json(elevenResult);
        }
      }

      const result = await bhashiniProvider.tts({
        text,
        sourceLanguage,
        gender,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Real-time Weather Localize (Text route with 1MB limit + AI rate limiter)
  app.post("/api/weather/localize", textJsonParser, textUrlencodedParser, bodyParserErrorHandler, aiRateLimiter, async (req: Request, res: Response) => {
    try {
      const { text, data, location, targetLanguage, userQuery } = req.body;
      const target = targetLanguage || "en";

      if (data && (data.current || data.travel || data.comparison || data.activity)) {
        let localized = "";
        try {
          const aiResult = await generateWeatherExplanation({
            userQuery: userQuery || "Grounded weather intelligence explanation",
            language: target,
            location: location || data.location,
            current: data.current,
            hourly: data.hourly,
            daily: data.daily,
            analysis: data.analysis,
            advisories: data.advisories,
            activity: data.activity,
            comparison: data.comparison,
            travel: data.travel,
          });
          localized = aiResult.reply;
        } catch (geminiErr: any) {
          console.info("Gemini localization fallback used:", geminiErr?.message || geminiErr);
        }

        if (!localized || localized.includes("AI processing limit")) {
          localized = buildMultilingualDeterministicFallback({
            userQuery: userQuery || "Weather",
            language: target,
            location: location || data.location,
            current: data.current,
            hourly: data.hourly,
            daily: data.daily,
            analysis: data.analysis,
            advisories: data.advisories,
            activity: data.activity,
            comparison: data.comparison,
            travel: data.travel,
          });
        }

        return res.json({ success: true, text: localized, language: target });
      }

      if (text) {
        try {
          const aiResult = await generateWeatherExplanation({
            userQuery: `Translate or re-express this meteorological assistant response into ${target}. Retain all numerical figures, numbers, and weather facts exactly without modification: "${text}"`,
            language: target,
            location: location,
          });
          if (aiResult?.reply && !aiResult.reply.includes("AI processing limit")) {
            return res.json({ success: true, text: aiResult.reply, language: target });
          }
        } catch {
          // fallback
        }
      }

      return res.json({ success: true, text: text || "", language: target });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return app;
}
