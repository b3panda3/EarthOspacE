<p align="center">
  <img src="public/logo.svg" alt="EarthOspacE Logo" width="480" />
</p>

<p align="center">
  <strong>AI Mission Intelligence for Earth and Near-Earth Space</strong><br/>
  <em>IBM AI Builders Challenge — August 2026</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/IBM_Granite-watsonx.ai-blue?logo=ibm" alt="IBM Granite" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Three.js-3D_Robot-black?logo=three.js" alt="Three.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## The Problem

Space operations today face a crippling data overload crisis. Astronauts aboard the International Space Station and mission controllers on the ground must simultaneously monitor dozens of disconnected data streams — real-time weather patterns, satellite telemetry, near-Earth object tracking, solar radiation levels, space weather forecasts, and breaking news feeds — each siloed in its own system with its own format, update cadence, and alert threshold.

This fragmentation creates dangerous blind spots. A solar flare that disrupts satellite communications may be logged in one NOAA dashboard while the mission planning team consults a completely separate tool for Kp index readings. Meanwhile, a tropical cyclone threatening a launch site is tracked on yet another platform. The cognitive burden of switching between these systems — each presenting raw numbers without context or prioritization — slows decision-making at precisely the moments when speed matters most.

Current solutions are built by and for domain specialists: NOAA's Space Weather Prediction Center serves plasma physicists, NASA's NeoWs serves planetary scientists, and EONET serves Earth observation researchers. Nobody is building for the astronaut who needs a single, unified sentence: "Should I delay tomorrow's EVA?" That synthesis — transforming raw multi-source data into actionable, role-aware intelligence — is the problem EarthOspacE solves.

## Our Solution

EarthOspacE takes an AI-first architecture that treats synthesis as the core product, not an afterthought. Every data source — NASA RSS feeds, NOAA solar wind readings, EONET natural events, NewsAPI articles, NeoWs asteroid tracking, OpenWeatherMap surface conditions — flows into a unified pipeline where IBM Granite on watsonx transforms raw numbers into natural language briefings, contextualized insights, and personalized recommendations.

The platform uses a user's AI-generated profile (built from a 4-step onboarding questionnaire) to personalize every interaction. A scientist sees detailed anomaly detection narratives; an educator sees simplified explanations with teaching angles; a mission planner sees GO/NO-GO assessments with risk matrices and alternative time windows. This isn't generic summarization — it's role-aware intelligence that adapts its depth, vocabulary, and focus to whoever is reading it.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        EarthOspacE Platform                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   NASA      │  │   NOAA      │  │  NewsAPI    │  │ OpenWeather │ │
│  │  NeoWs/DONKI│  │  SWPC/Kp    │  │  + RSS      │  │   Map       │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
│  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐ │
│  │              Next.js API Routes (Server-Side)                 │ │
│  │    Weather │ News │ Telemetry │ Events │ Map │ Robot │ Profile  │ │
│  └──────────────────────────┬────────────────────────────────────┘ │
│                              │                                      │
│  ┌──────────────────────────┴────────────────────────────────────┐ │
│  │         IBM Granite on watsonx.ai (EU Frankfurt)              │ │
│  │   Briefings │ Predictions │ Anomaly Detection │ Companion AI  │ │
│  └──────────────────────────┬────────────────────────────────────┘ │
│                              │                                      │
│  ┌──────────────────────────┴────────────────────────────────────┐ │
│  │               React 19 Frontend (Client-Side)                │ │
│  │  Dashboard │ Map │ News │ Observatory │ Robot │ Profile │ Telemetry│
│  │  Three.js 3D Companion │ Leaflet Maps │ Recharts │ Framer Motion│
│  └──────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│  ┌──────────────────────────┴────────────────────────────────────┐ │
│  │                  Supabase (Persistence)                      │ │
│  │     User Profiles │ Bookmarks │ Telemetry History               │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## Features

### Core Dashboard
- **Real-time Space Conditions Score** — AI-generated 1-10 safety assessment with breakdown by solar activity, geomagnetic activity, radiation belts, and debris risk
- **Personalized Daily Briefing** — IBM Granite generates a unique mission briefing based on your role, mission type, and current conditions
- **Live News Feed** — Aggregated from NASA RSS, NewsAPI, and ESA sources, ranked by your interest profile
- **Weather at Launch Sites** — Real-time conditions for Houston (JSC), Baikonur, and Kourou
- **Near-Earth Object Tracker** — Live NASA NeoWs data with approach dates, velocities, and hazard classifications
- **Active Incident Monitoring** — EONET natural events (wildfires, storms, volcanoes) with severity levels

### AI Mission Intelligence
- **3-Day Space Weather Forecast** — Kp index, solar wind speed, and radiation belt predictions with confidence scores
- **Mission Planning Assessment** — Submit mission parameters for GO/NO-GO/CONDITIONAL verdicts with risk matrices, mitigation steps, and alternative time windows
- **Anomaly Detection** — Z-score statistical analysis on NOAA data + Granite-powered natural language explanations
- **Data Synthesis Pipeline** — Batch-queued AI processing with LRU caching and graceful fallbacks

### AI Companion (ASTRO)
- **Human-like 3D Robot** — Built with Three.js/React Three Fiber, featuring gender-adaptive physique (male/female selection in onboarding), race-neutral warm bronze skin tone, and space suit with gold accents
- **Multi-Scenario Conversations** — Free Chat, Space Weather Analysis, Brainstorming, Emergency Protocol simulation
- **Daily Briefing Mode** — Structured 4-section mission briefing delivered in-character by ASTRO
- **Web Speech API Voice** — Optional voice output for briefings and responses
- **Animated States** — Idle floating, thinking (visor pulses orange), speaking (visor pulses gold with arm gestures), waving

### Interactive Map
- **Leaflet.js + OpenStreetMap** — Real-time event markers from EONET, Copernicus, and NASA data
- **Event Filtering** — Filter by category, severity, and source
- **Satellite Tracking** — 8 tracked satellites with orbital parameters (ISS, Hubble, Sentinel fleet, GPS)

### User Profiling
- **4-Step Onboarding Questionnaire** — Role, mission context, interest ratings (8 categories), and display preferences
- **AI-Generated Profile** — IBM Granite analyzes your answers to create a weighted interest profile
- **Gender Selection** — Male/Female companion appearance that affects 3D robot physique
- **Profile Persistence** — Stored in Supabase with automatic rehydration

## Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| Framework | Next.js 16 (Turbopack) | App Router, SSR, API Routes |
| UI | React 19 | Components, hooks, state |
| Styling | Tailwind CSS 4 | Utility-first dark theme |
| 3D Engine | Three.js + React Three Fiber + Drei | ASTRO robot companion |
| AI/LLM | IBM Granite 13B via watsonx.ai | All AI features |
| Maps | Leaflet.js + OpenStreetMap | Interactive event map |
| Charts | Recharts | Telemetry sparklines, forecasts |
| Backend | Supabase (PostgreSQL) | Profile persistence, bookmarks |
| Animation | Framer Motion | Page transitions, micro-interactions |
| Icons | Lucide React | Consistent icon system |
| Data Fetching | TanStack React Query | Caching, refetch, optimistic updates |
| Types | TypeScript 5 | End-to-end type safety |

## API Integrations

| API | Purpose | Auth | Used In |
|-----|---------|------|--------|
| IBM watsonx.ai | LLM inference (all AI features) | IAM API Key | Briefings, predictions, companion, news flash, profiling |
| NASA NeoWs | Near-Earth Object tracking | Free API Key | Dashboard, map, events, telemetry |
| NASA DONKI | Solar flares, space weather | Free API Key | Telemetry, anomaly detection |
| NASA EONET | Natural events (wildfires, storms) | Free (no key) | Map, events, dashboard |
| NASA RSS | Breaking news, solar flares, Earth obs | Free (no key) | News feed, observatory |
| NOAA SWPC | Solar wind, Kp index, geomagnetic | Free (no key) | Telemetry, predictions, anomaly detection |
| OpenWeatherMap | Real-time surface weather | Free API Key | Dashboard weather widget |
| NewsAPI | Space news aggregation | Free API Key | News feed, flash commentary |
| Copernicus STAC | Satellite imagery metadata | Free (no key) | Observatory, telemetry |
| Supabase | Profile persistence, bookmarks | Anon Key | User profiles, bookmarks |

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/b3panda3/EarthOspacE.git
cd EarthOspacE
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.local.example .env.local
```
Edit `.env.local` with your API keys. At minimum, you need:
- `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` for AI features
- `NASA_API_KEY` for space data

4. **Run the development server:**
```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)** and complete the onboarding questionnaire.

### Demo Mode (No API Keys Required)

Set `DEMO_MODE=true` in `.env.local` to run the entire application with pre-generated mock AI responses. All data sources (NASA, NOAA, EONET) still fetch live data — only AI features (briefings, predictions, companion chat) use mock responses. Perfect for hackathon demos when API credits are limited.

## Project Structure

```
EarthOspacE/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                 # 12 API route handlers
│   │   │   ├── briefing/        # Daily AI briefing
│   │   │   ├── events/          # EONET + NeoWs aggregator
│   │   │   ├── map/             # Map event data
│   │   │   ├── news/            # NewsAI + RSS aggregation
│   │   │   ├── observatory/     # Space observatory news
│   │   │   ├── planning/        # Mission GO/NO-GO assessment
│   │   │   ├── predictive/      # 3-day space weather forecast
│   │   │   ├── profile/         # AI user profiling
│   │   │   ├── robot/           # ASTRO companion chat
│   │   │   ├── synthesize/      # Batch AI news flash generation
│   │   │   ├── telemetry/       # Aggregated live telemetry
│   │   │   └── weather/         # OpenWeatherMap integration
│   │   ├── dashboard/           # Telemetry, planning, predictive pages
│   │   ├── map/                 # Live interactive map (Leaflet)
│   │   ├── news/                # News feed and article detail
│   │   ├── observatory/         # Space observatory with AI context
│   │   ├── profile/             # User profile and onboarding
│   │   ├── robot/               # ASTRO AI companion (3D + chat)
│   │   └── page.tsx             # Main dashboard (home)
│   ├── components/
│   │   ├── dashboard/           # StatCard, WeatherWidget, CometList, etc.
│   │   ├── map/                 # Leaflet map components
│   │   ├── news/                # NewsCard, filters, detail view
│   │   ├── observatory/         # Observatory cards and filters
│   │   ├── profile/             # Questionnaire stepper
│   │   ├── robot/               # RobotCharacter, RobotScene, ChatInterface
│   │   └── ui/                  # Header, Sidebar, Card, Button, Badge, etc.
│   └── lib/
│       ├── ai/                  # watsonx client, companion, prediction, anomaly
│       ├── api/sources/         # NASA, NOAA, Copernicus data adapters
│       ├── api/cache.ts         # LRU cache with TTL
│       ├── hooks/               # useProfile, useBookmarks
│       ├── types/index.ts       # 50+ TypeScript interfaces
│       └── utils/               # Supabase client, demo data
├── public/
│   └── logo.svg                 # EarthOspacE official logo
├── .env.local.example          # Environment variable template
├── .gitignore
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

## AI Integration Details

All AI features are powered by **IBM Granite 13B** on **watsonx.ai (EU Frankfurt)**:

| Feature | Model | Input | Output |
|---------|-------|-------|--------|
| News Flash | Granite Chat v2 | Article title + summary + user profile | 2-sentence contextual commentary |
| Daily Briefing | Granite Chat v2 | Current telemetry + news headlines | 4-section structured briefing |
| Mission Planning | Granite Chat v2 | Mission params + forecast + conditions | GO/NO-GO/CONDITIONAL with risk matrix |
| Space Weather Forecast | Granite Instruct v2 | Current + historical telemetry | 3-day predictions with confidence |
| Quick Assessment | Granite Instruct v2 | Current conditions | 1-10 score + breakdown |
| Anomaly Explanation | Granite Instruct v2 | Statistical anomaly + context | Natural language explanation |
| ASTRO Companion | Granite Chat v2 | Conversation history + platform data | In-character response |
| User Profiling | Granite Chat v2 | Questionnaire answers | Weighted interest profile |

## Demo / Presentation Strategy

For hackathon judges, the platform supports two modes:

1. **Live Mode** (DEMO_MODE=false): All AI features call real IBM Granite API. Requires valid watsonx credentials. Data sources (NASA, NOAA, EONET) always fetch live data regardless of demo mode.

2. **Demo Mode** (DEMO_MODE=true): Pre-generated realistic AI responses with simulated 600ms latency. Perfect for reliable demos without API dependency. Toggle via environment variable.

## Hackathon Submission

- **Challenge**: IBM AI Builders Challenge — Advance Space Exploration with AI
- **Team**: b3panda3
- **Repository**: [github.com/b3panda3/EarthOspacE](https://github.com/b3panda3/EarthOspacE)
- **Deadline**: August 31, 2026

## License

MIT
