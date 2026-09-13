import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { geocodingProvider } from "./server/providers/geocodingProvider.js";
import { weatherProvider } from "./server/providers/weatherProvider.js";
import { analyzeWeather, generateAdvisories } from "./server/services/weatherIntelligence.js";
import { evaluateActivity } from "./server/services/activityIntelligence.js";
import { compareLocations } from "./server/services/comparisonIntelligence.js";
import { analyzeTravel } from "./server/services/travelIntelligence.js";
import { parseQuery } from "./server/services/nluService.js";
import { generateWeatherExplanation, GroundedWeatherContext } from "./server/services/geminiService.js";
import { ConversationContext, LocationInfo, QueryRequest, QueryResponse } from "./server/types.js";
import { bhashiniProvider } from "./server/providers/bhashiniProvider.js";
import { getNasaEnvironmentalData } from "./server/services/nasaService.js";
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
  // API ROUTES
  // ==========================================

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
      res.status(500).json({ success: false, error: err.message });
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
      res.status(500).json({ success: false, error: err.message });
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
      res.status(500).json({ success: false, error: err.message });
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
      res.status(500).json({ success: false, error: err.message });
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
      const { locations } = req.body;
      if (!locations || !Array.isArray(locations) || locations.length < 2) {
        return res.status(400).json({ success: false, error: "Please provide an array of at least 2 locations to compare." });
      }

      const resolvedLocations: LocationInfo[] = [];
      for (const item of locations) {
        if (typeof item === "string") {
          const resLoc = await geocodingProvider.resolveLocation(item);
          if (resLoc) resolvedLocations.push(resLoc);
        } else if (item.latitude && item.longitude) {
          resolvedLocations.push(item);
        }
      }

      if (resolvedLocations.length < 2) {
        return res.status(400).json({ success: false, error: "Could not resolve enough valid locations for comparison." });
      }

      const comparison = await compareLocations(resolvedLocations);
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

  // 10. NASA Earth Observation & Environmental Layer (Modular Supplementary Layer)
  app.get("/api/nasa/environmental", async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(String(req.query.lat));
      const lon = parseFloat(String(req.query.lon));
      const currentTemp = req.query.currentTemp ? parseFloat(String(req.query.currentTemp)) : undefined;
      const radiusKm = req.query.radius ? parseInt(String(req.query.radius), 10) : 1200;

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ success: false, error: "Latitude and longitude coordinates are required." });
      }

      const nasaData = await getNasaEnvironmentalData(lat, lon, currentTemp, radiusKm);
      res.json({ success: true, nasa: nasaData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. Main Conversational AI Weather Query Endpoint: POST /api/weather/query
  app.post("/api/weather/query", async (req: Request, res: Response) => {
    try {
      const body: QueryRequest = req.body;
      const message = (body.message || "").trim();
      if (!message) {
        return res.status(400).json({ success: false, error: "Message is required." });
      }

      const context: ConversationContext = body.context || {};
      const parsed = parseQuery(message, context);
      const language = body.preferredLanguage || parsed.language;

      // Determine location with strict binding to client request
      let primaryLocation: LocationInfo | null = null;
      const targetLoc = body.location || context.currentLocation;

      if (parsed.detectedLocations[0]) {
        const detectedName = parsed.detectedLocations[0].toLowerCase();
        // Check if detected location refers to the current bound location
        const isCurrentLoc =
          targetLoc &&
          (targetLoc.name.toLowerCase().includes(detectedName) ||
            detectedName.includes(targetLoc.name.toLowerCase()) ||
            (targetLoc.admin1 && targetLoc.admin1.toLowerCase().includes(detectedName)));

        if (isCurrentLoc && targetLoc) {
          primaryLocation = targetLoc;
        } else {
          primaryLocation = await geocodingProvider.resolveLocation(parsed.detectedLocations[0]);
        }
      }

      if (!primaryLocation) {
        if (targetLoc?.latitude !== undefined && targetLoc?.longitude !== undefined) {
          primaryLocation = targetLoc;
        } else if (targetLoc?.name) {
          primaryLocation = await geocodingProvider.resolveLocation(targetLoc.name);
        }
      }

      // Execute appropriate intelligence based on parsed intent
      const groundedContext: GroundedWeatherContext = {
        userQuery: message,
        language,
        location: primaryLocation || undefined,
      };

      const responseData: QueryResponse["data"] = {
        location: primaryLocation || undefined,
      };

      if (parsed.intent === "travel" && parsed.travelDetails) {
        const origLoc = (await geocodingProvider.resolveLocation(parsed.travelDetails.origin)) || primaryLocation;
        const destLoc = await geocodingProvider.resolveLocation(parsed.travelDetails.destination);
        if (origLoc && destLoc) {
          const travelRes = await analyzeTravel(origLoc, destLoc, parsed.travelDetails.mode);
          groundedContext.travel = travelRes;
          responseData.travel = travelRes;
        }
      } else if (parsed.intent === "comparison" && parsed.comparisonLocations && parsed.comparisonLocations.length >= 2) {
        const compLocs: LocationInfo[] = [];
        for (const cName of parsed.comparisonLocations) {
          const resolved = await geocodingProvider.resolveLocation(cName);
          if (resolved) compLocs.push(resolved);
        }
        if (compLocs.length >= 2) {
          const compRes = await compareLocations(compLocs);
          groundedContext.comparison = compRes;
          responseData.comparison = compRes;
        }
      } else {
        // Fetch weather data for primary location
        if (primaryLocation) {
          const [weatherData, nasaData] = await Promise.all([
            weatherProvider.getWeatherData(primaryLocation.latitude, primaryLocation.longitude, primaryLocation.timezone),
            getNasaEnvironmentalData(primaryLocation.latitude, primaryLocation.longitude).catch(() => null),
          ]);

          const analysis = analyzeWeather(weatherData.current, weatherData.hourly, weatherData.daily);
          const advisories = generateAdvisories(primaryLocation.name, weatherData.current, weatherData.hourly, weatherData.daily);

          groundedContext.current = weatherData.current;
          groundedContext.hourly = weatherData.hourly;
          groundedContext.daily = weatherData.daily;
          groundedContext.analysis = analysis;
          groundedContext.advisories = advisories;
          if (nasaData && nasaData.status === "available") {
            groundedContext.nasa = nasaData;
            responseData.nasa = nasaData;
          }

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
      const { text, sourceLanguage, gender } = req.body;
      if (!text || !sourceLanguage) {
        return res.status(400).json({
          success: false,
          error: "text and sourceLanguage are required.",
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
