import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { geocodingProvider } from "./server/providers/geocodingProvider.js";
import { weatherProvider, WeatherProviderError } from "./server/providers/weatherProvider.js";
import { analyzeWeather, generateAdvisories } from "./server/services/weatherIntelligence.js";
import { evaluateActivity } from "./server/services/activityIntelligence.js";
import { compareLocations } from "./server/services/comparisonIntelligence.js";
import { analyzeTravel } from "./server/services/travelIntelligence.js";
import { parseQuery, detectLanguageFromText, resolveLocationAndIntent, resolveQueryLanguage } from "./server/services/nluService.js";
import { generateWeatherExplanation, GroundedWeatherContext } from "./server/services/geminiService.js";
import { buildMultilingualDeterministicFallback, getLocalizedLocationRequiredMessage } from "./server/services/multilingualFallback.js";
import { ConversationContext, LocationInfo, QueryRequest, QueryResponse } from "./server/types.js";
import { bhashiniProvider } from "./server/providers/bhashiniProvider.js";
import { ALL_LANGUAGES, INDIAN_LANGUAGES, INTERNATIONAL_LANGUAGES } from "./src/languages.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS and basic security headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  // ==========================================
  // API ROUTES & OAUTH CALLBACK
  // ==========================================

  // OAuth Callback Handler (for Google / Supabase Auth popup & redirect flows)
  app.get(["/auth/callback", "/auth/callback/"], (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
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
    try {
      if (window.opener && window.opener !== window) {
        window.opener.postMessage({
          type: 'SUPABASE_AUTH_SUCCESS',
          hash: window.location.hash,
          search: window.location.search,
          href: window.location.href
        }, '*');
        setTimeout(function() {
          window.close();
        }, 800);
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

  // 1. Health Status
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
    res.json({
      success: true,
      languages: ALL_LANGUAGES,
      indianLanguages: INDIAN_LANGUAGES,
      internationalLanguages: INTERNATIONAL_LANGUAGES,
    });
  });

  // BHASHINI Provider Status (never exposes secret keys)
  app.get("/api/bhashini/status", (req: Request, res: Response) => {
    res.json(bhashiniProvider.getStatus());
  });

  // BHASHINI Translation Pipeline (optional Indian-language layer)
  app.post("/api/bhashini/translate", async (req: Request, res: Response) => {
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

  // 2. Location Search & Resolution
  app.get("/api/location/search", async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) {
        return res.json({ success: true, locations: [] });
      }
      const count = req.query.count ? parseInt(String(req.query.count), 10) : 5;
      const locations = await geocodingProvider.searchLocations(q, count);
      res.json({ success: true, locations });
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

  // 3. Current Weather
  app.get("/api/weather/current", async (req: Request, res: Response) => {
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

      res.json({
        success: true,
        location: resolvedLoc,
        current: weatherData.current,
        analysis,
        advisories,
      });
    } catch (err: any) {
      handleWeatherError(res, err);
    }
  });

  // 4. Hourly Forecast
  app.get("/api/weather/hourly", async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(String(req.query.lat));
      const lon = parseFloat(String(req.query.lon));
      const tz = String(req.query.timezone || "UTC");

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ success: false, error: "Latitude and longitude coordinates are required." });
      }

      const weatherData = await weatherProvider.getWeatherData(lat, lon, tz);
      res.json({ success: true, hourly: weatherData.hourly });
    } catch (err: any) {
      handleWeatherError(res, err);
    }
  });

  // 5. Daily Forecast
  app.get("/api/weather/daily", async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(String(req.query.lat));
      const lon = parseFloat(String(req.query.lon));
      const tz = String(req.query.timezone || "UTC");

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ success: false, error: "Latitude and longitude coordinates are required." });
      }

      const weatherData = await weatherProvider.getWeatherData(lat, lon, tz);
      res.json({ success: true, daily: weatherData.daily });
    } catch (err: any) {
      handleWeatherError(res, err);
    }
  });

  // 6. Advisories & Alerts
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

  // 7. Activity Analysis
  app.post("/api/activity/analyze", async (req: Request, res: Response) => {
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

  // 8. Location Comparison
  app.post("/api/comparison/analyze", async (req: Request, res: Response) => {
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

  // 9. Travel Weather Analysis
  app.post("/api/travel/analyze", async (req: Request, res: Response) => {
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

  // 10. Main Conversational AI Weather Query Endpoint: POST /api/weather/query
  app.post("/api/weather/query", async (req: Request, res: Response) => {
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

      // If location is required but could not be resolved (and query is not travel or comparison)
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

      // Execute appropriate intelligence based on parsed intent
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
        // Fetch weather data for primary location
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

      // Grounding & AI Interpretation via Gemini
      const explanation = await generateWeatherExplanation(groundedContext);

      // Update conversational context
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

  // 12. Voice Capabilities & Status
  app.get("/api/voice/status", (req: Request, res: Response) => {
    res.json({
      success: true,
      sttAvailable: true,
      ttsAvailable: true,
      bhashini: bhashiniProvider.getStatus(),
      supportedLanguages: ALL_LANGUAGES.map((l) => ({
        code: l.code,
        bcp47: l.bcp47,
        name: l.name,
        nativeName: l.nativeName,
        category: l.category,
      })),
    });
  });

  // 13. Voice ASR (Speech-to-Text via Bhashini when configured)
  app.post("/api/voice/asr", async (req: Request, res: Response) => {
    try {
      const { audioBase64, sourceLanguage, audioFormat } = req.body;
      if (!audioBase64 || !sourceLanguage) {
        return res.status(400).json({
          success: false,
          error: "audioBase64 and sourceLanguage are required.",
        });
      }

      const result = await bhashiniProvider.asr({
        audioBase64,
        sourceLanguage,
        audioFormat,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 14. Voice TTS (Text-to-Speech via Bhashini when configured)
  app.post("/api/voice/tts", async (req: Request, res: Response) => {
    try {
      const { text, gender } = req.body;
      const sourceLanguage = req.body.sourceLanguage || req.body.language;
      if (!text || !sourceLanguage) {
        return res.status(400).json({
          success: false,
          error: "text and sourceLanguage/language are required.",
        });
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

  // 15. Real-time Weather Explanation Localization (No re-querying of weather APIs)
  app.post("/api/weather/localize", async (req: Request, res: Response) => {
    try {
      const { text, data, location, targetLanguage, userQuery } = req.body;
      const target = targetLanguage || "en";

      // If structured grounded weather data is attached, re-synthesize explanation in targetLanguage
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

      // If plain text (e.g. conversational answer or greeting)
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

  // ==========================================
  // VITE / STATIC MIDDLEWARE
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WeatherGPT server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
