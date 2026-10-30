# WeatherGPT — Conversational Weather Intelligence

**Student project | AI-assisted weather experiences | Full-stack TypeScript**

WeatherGPT explores how live meteorological data and AI-assisted explanations can help people understand forecasts and plan everyday activities. It combines a responsive weather dashboard with conversational interaction and location-based features.

> **Portfolio note:** This repository is currently private. Features that depend on third-party credentials or cloud configuration may not run without setup.

## Project highlights
- Weather dashboard and forecast views
- Location-oriented weather exploration and comparison
- Conversational weather assistance with grounded weather context
- Activity and travel planning concepts
- Voice and multilingual interaction integrations
- Responsive layout and settings

## Technology
| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Server | Node.js, Express, WebSocket |
| AI | Google GenAI SDK |
| Data / auth integrations | Supabase, Firebase |
| Visualization | Recharts |

The repository's `package.json` is the source of truth for its dependencies. Availability of optional integrations depends on environment configuration.

## Getting started
Prerequisites: recent Node.js and npm.

```bash
npm install
npm run dev
```

For production builds:
```bash
npm run build
npm start
```

Quality checks (where the required environment is configured):
```bash
npm run lint
npm test
```

Configure provider credentials through environment variables; **never commit real API keys, tokens, or private user data**. Consult the source code for currently required variables.

## Architecture at a glance
```text
React UI (weather, forecast, chat, travel)
        |
        v
Express / TypeScript server
        |
        +--> Weather and location data providers
        +--> AI and speech integrations
        +--> Optional cloud services
```

## What I learned
- Designing responsive, data-heavy interfaces
- Connecting API-driven services to user-facing features
- Structuring a TypeScript application across frontend and server
- Thinking about grounded AI responses, errors and fallbacks

## Project status
An evolving portfolio project. Screens, third-party services and deployments should be tested independently before being represented as production-ready.

**Author:** Arnav Sahu · B.Tech AI & ML, SIRT / RGPV
