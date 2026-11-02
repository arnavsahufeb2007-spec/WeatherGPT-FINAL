import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { LiveServerMessage, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { getGenAI } from "./server/services/geminiService.js";
import { buildServerApp } from "./server/serverApp.js";

async function startServer() {
  const PORT = 3000;
  const app = buildServerApp();

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

  // Create HTTP & WebSocket Server for Gemini Live API
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/live" });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("[Live API] Client connected to /live");
    let session: any = null;

    try {
      const ai = getGenAI();
      if (!ai) {
        clientWs.send(JSON.stringify({ error: "Gemini API key not configured on server" }));
        clientWs.close();
        return;
      }

      session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction:
            "You are WeatherGPT Live conversational assistant. You provide real-time, concise, accurate conversational weather intelligence. Keep answers natural, vocal-friendly, and informative.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            const textParts = message.serverContent?.modelTurn?.parts
              ?.map((p: any) => p.text)
              .filter(Boolean)
              .join(" ");
            if (textParts) {
              clientWs.send(JSON.stringify({ text: textParts }));
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.close();
            }
          },
        },
      });

      clientWs.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.audio && session) {
            session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" },
            });
          } else if (msg.text && session) {
            session.sendRealtimeInput({
              text: msg.text,
            });
          }
        } catch (err) {
          console.error("[Live API] Error processing message from client:", err);
        }
      });

      clientWs.on("close", () => {
        console.log("[Live API] Client disconnected");
        try {
          if (session) session.close();
        } catch {}
      });

      clientWs.on("error", (err) => {
        console.error("[Live API] Client socket error:", err);
      });
    } catch (err: any) {
      console.error("[Live API] Failed to initialize live session:", err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: err.message || "Failed to initialize Live API session" }));
        clientWs.close();
      }
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`WeatherGPT server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
