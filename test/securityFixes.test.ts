import test from "node:test";
import assert from "node:assert/strict";
import express, { Request, Response, NextFunction } from "express";
import http from "node:http";
import { rateLimit } from "express-rate-limit";

// Helper function to create express test server or test route behavior
import { buildServerApp, validateConfiguredOrigin, getSafeTargetOriginScript } from "../server/serverApp.js";

test("Finding 1 — Restrict JSON body sizes: Text routes enforce 1MB limit & Audio routes enforce 15MB limit", async () => {
  const app = buildServerApp({
    aiRateLimitMax: 1000, // High rate limits for payload testing
    ttsRateLimitMax: 1000,
    sttRateLimitMax: 1000,
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Text route with body > 1MB should be rejected with 413 Payload Too Large
    const oversizedTextPayload = JSON.stringify({
      message: "weather query",
      largeData: "a".repeat(1.2 * 1024 * 1024), // 1.2 MB
    });

    const res1 = await fetch(`${baseUrl}/api/weather/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: oversizedTextPayload,
    });

    assert.equal(res1.status, 413, "Oversized JSON to text route must return HTTP 413 Payload Too Large");
    const json1 = await res1.json();
    assert.equal(json1.success, false);
    assert.equal(json1.code, "PAYLOAD_TOO_LARGE");

    // 2. Audio route with 2MB base64 audio payload should be accepted by body parser (not 413)
    const audioPayload = JSON.stringify({
      audioBase64: "a".repeat(2 * 1024 * 1024), // 2 MB
      language: "hi",
    });

    const res2 = await fetch(`${baseUrl}/api/voice/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: audioPayload,
    });

    // Body parser accepts 2MB for audio route (route handler will process or return provider error, not 413)
    assert.notEqual(res2.status, 413, "2MB payload to audio transcribe endpoint must NOT be rejected with 413");

    // 3. Audio route with > 15MB payload should be rejected with 413
    const oversizedAudioPayload = JSON.stringify({
      audioBase64: "a".repeat(16 * 1024 * 1024), // 16 MB
    });

    const res3 = await fetch(`${baseUrl}/api/voice/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: oversizedAudioPayload,
    });

    assert.equal(res3.status, 413, "Oversized >15MB payload to audio transcribe endpoint must return 413");

    // 4. Malformed JSON payload should receive 400 Bad Request cleanly
    const res4 = await fetch(`${baseUrl}/api/weather/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"message": "broken json...',
    });

    assert.equal(res4.status, 400, "Malformed JSON body must return HTTP 400 Bad Request");
    const json4 = await res4.json();
    assert.equal(json4.success, false);
    assert.equal(json4.code, "BAD_REQUEST");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("Finding 2 — Secure OAuth callback postMessage origin: Must not post to wildcard '*'", async () => {
  // Unit test origin validation helper
  assert.equal(validateConfiguredOrigin("https://weathergpt.app"), "https://weathergpt.app");
  assert.equal(validateConfiguredOrigin("http://localhost:3000"), "http://localhost:3000");
  assert.equal(validateConfiguredOrigin("https://app.example.com:8080"), "https://app.example.com:8080");

  // Invalid / unsafe origins fail closed to null
  assert.equal(validateConfiguredOrigin("javascript:alert(1)"), null);
  assert.equal(validateConfiguredOrigin("https://example.com/path/to/page"), null); // Path not allowed in origin
  assert.equal(validateConfiguredOrigin("https://user:pass@example.com"), null); // Credentials not allowed
  assert.equal(validateConfiguredOrigin("*"), null);

  // Integration test GET /auth/callback
  const app = buildServerApp({});
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const res = await fetch(`${baseUrl}/auth/callback`);
    assert.equal(res.status, 200);
    const html = await res.text();

    // Must NOT contain postMessage(..., '*')
    assert.ok(!html.includes("'*'"), "OAuth callback script must NOT send postMessage with wildcard '*'");
    assert.ok(!html.includes('"*\''), "OAuth callback script must NOT send postMessage with wildcard '*'");

    // Must contain target origin determination logic
    assert.ok(html.includes("postMessage"), "Must contain postMessage call");
    assert.ok(html.includes("targetOrigin"), "Must send postMessage to verified targetOrigin variable");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("Finding 3 — Rate-limit public AI and TTS endpoints: Excessive requests receive HTTP 429", async () => {
  const app = buildServerApp({
    aiRateLimitMax: 3, // Very low limit for testing
    ttsRateLimitMax: 3,
    sttRateLimitMax: 3,
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // Send 3 allowed requests to /api/weather/query
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${baseUrl}/api/weather/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hello" }),
      });
      assert.notEqual(res.status, 429, `Request ${i + 1} should be under the rate limit`);
    }

    // 4th request should be blocked with 429
    const res4 = await fetch(`${baseUrl}/api/weather/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello again" }),
    });

    assert.equal(res4.status, 429, "4th request exceeding rate limit must return HTTP 429 Too Many Requests");
    const json4 = await res4.json();
    assert.equal(json4.success, false);
    assert.equal(json4.code, "TOO_MANY_REQUESTS");
    assert.ok(res4.headers.has("retry-after") || res4.headers.has("ratelimit-reset") || json4.error, "Must include rate limit feedback");

    // TTS endpoint should also enforce its own rate limit independently
    for (let i = 0; i < 3; i++) {
      await fetch(`${baseUrl}/api/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "test", sourceLanguage: "en" }),
      });
    }

    const ttsBlocked = await fetch(`${baseUrl}/api/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "test blocked", sourceLanguage: "en" }),
    });

    assert.equal(ttsBlocked.status, 429, "Exceeding TTS limit must return HTTP 429");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
