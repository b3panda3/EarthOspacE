# EarthOspacE

**AI Mission Intelligence for Earth and Near-Earth Space**

<p align="center">
  <img src="public/logo.svg" alt="EarthOspacE Logo" width="480" />
</p>

## Overview

EarthOspacE is an AI-powered space exploration platform built for the **IBM AI Builders Challenge (August 2026)**. It transforms raw data chaos into clear, actionable mission intelligence for deployed astronauts and space operations teams.

## The Problem

Space operations today face a crippling data overload crisis. Astronauts aboard the International Space Station and mission controllers on the ground must simultaneously monitor dozens of disconnected data streams — real-time weather patterns, satellite telemetry, near-Earth object tracking, solar radiation levels, space weather forecasts, and breaking news feeds — each siloed in its own system with its own format, update cadence, and alert threshold.

This fragmentation creates dangerous blind spots. A solar flare that disrupts satellite communications may be logged in one NOAA dashboard while the mission planning team consults a completely separate tool for Kp index readings. Meanwhile, a tropical cyclone threatening a launch site is tracked on yet another platform. The cognitive burden of switching between these systems — each presenting raw numbers without context or prioritization — slows decision-making at precisely the moments when speed matters most.

Current solutions are built by and for domain specialists: NOAA's Space Weather Prediction Center serves plasma physicists, NASA's NeoWs serves planetary scientists, and EONET serves Earth observation researchers. Nobody is building for the astronaut who needs a single, unified sentence: "Should I delay tomorrow's EVA?" That synthesis — transforming raw multi-source data into actionable, role-aware intelligence — is the problem EarthOspacE solves.

## Our Solution

EarthOspacE takes an AI-first architecture that treats synthesis as the core product, not an afterthought. Every data source — NASA RSS feeds, NOAA solar wind readings, EONET natural events, NewsAPI articles, NeoWs asteroid tracking, OpenWeatherMap surface conditions — flows into a unified pipeline where IBM Granite on watsonx transforms raw numbers into natural language briefings, contextualized insights, and personalized recommendations.

The platform uses a user's AI-generated profile (built from a 4-step onboarding questionnaire) to personalize every interaction. A scientist sees detailed anomaly detection narratives; an educator sees simplified explanations with teaching angles; a mission planner sees GO/NO-GO assessments with risk matrices and alternative time windows. This isn't generic summarization — it's role-aware intelligence that adapts its depth, vocabulary, and focus to whoever is reading it.

## Features

- **Live Interactive Map** — Real-time events on Leaflet.js with OpenStreetMap
- **Weather Dashboard** — Live OpenWeatherMap + NOAA data with AI impact summaries
- **Space Observatory News** — RSS aggregation from NASA, ESA, JAXA, SpaceWeather.com
- **Near-Earth Object Tracker** — NASA NeoWs API integration
- **Satellite Telemetry** — Solar wind, Kp index, geomagnetic data from NOAA
- **AI Mission Briefing** — IBM Granite generates structured daily briefings
- **Mission Planning** — GO/NO-GO/CONDITIONAL mission assessments via AI
- **Predictive Analysis** — 3-day space weather forecasts
- **AI User Profiling** — Onboarding questionnaire personalizes the dashboard
- **Human-like AI Companion (ORB-I)** — 3D humanoid companion with gender selection, voice output via Web Speech API, and multiple scenario modes (Daily Briefing, Space Weather, Brainstorm, Emergency, Free Chat)

## Tech Stack

| Category | Technology |
|----------|----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| 3D Engine | Three.js, React Three Fiber, Drei |
| AI/LLM | IBM Granite via watsonx.ai |
| Maps | Leaflet.js, OpenStreetMap |
| Backend/DB | Supabase (PostgreSQL, Auth, Real-time) |
| Charts | Recharts |
| Animation | Framer Motion |
| Icons | Lucide React |
| Types | TypeScript 5 |

## API Integrations

| API | Purpose | Auth |
|-----|---------|------|
| IBM watsonx.ai | LLM inference (all AI features) | API Key (IAM) |
| NASA Open Data | NeoWs, DONKI, APOD, RSS | Free API Key |
| NOAA SWPC | Solar wind, Kp index, geomagnetic | Free (no key) |
| OpenWeatherMap | Real-time weather data | Free API Key |
| NewsAPI | Space news aggregation | Free API Key |
| Copernicus | Satellite imagery (STAC) | Free (no key) |
| EONET | Natural events | Free (no key) |
| Supabase | Profile persistence, bookmarks | Anon Key |

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/b3panda3/EarthOspacE.git
cd EarthOspacE
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```
Edit `.env.local` with your API keys (see `.env.local.example` for details).

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Demo Mode

Set `DEMO_MODE=true` in `.env.local` to run the entire application with pre-generated mock AI responses — no API keys needed. Perfect for hackathon demos.

## Project Structure

```
EarthOspacE/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                 # API routes (weather, news, telemetry, robot...)
│   │   ├── dashboard/           # Telemetry, planning, predictive pages
│   │   ├── map/                 # Live interactive map
│   │   ├── news/                # News feed and detail
│   │   ├── observatory/         # Space observatory news
│   │   ├── profile/             # User profile and onboarding
│   │   ├── robot/               # AI companion (ORB-I)
│   │   └── page.tsx             # Main dashboard
│   ├── components/
│   │   ├── dashboard/           # Dashboard widgets
│   │   ├── map/                 # Map components
│   │   ├── news/                # News cards and filters
│   │   ├── observatory/         # Observatory components
│   │   ├── profile/             # Questionnaire
│   │   ├── robot/               # 3D robot, chat, scenarios
│   │   └── ui/                  # Header, Sidebar, Card, Button, etc.
│   └── lib/
│       ├── ai/                  # WatsonX client, companion, prediction, anomaly
│       ├── api/sources/         # NASA, NOAA, Copernicus adapters
│       ├── hooks/               # useProfile, useBookmarks
│       ├── types/               # TypeScript interfaces
│       └── utils/                # Supabase client, design tokens, demo data
├── public/                     # Static assets (logo.svg)
└── .env.local.example          # Environment variable template
```

## How It Works

### Data Pipeline

```
Raw Data (NASA, NOAA, NewsAPI, OpenWeatherMap, RSS)
    → API Routes (Next.js server-side)
    → AI Digestion (IBM Granite on watsonx)
    → Actionable Insights + Natural Language Briefings
    → Dashboard Display + ORB-I Voice Narration
```

### AI Integration

All AI features are powered by **IBM Granite** on **watsonx.ai**:
- **News Flash**: Generates one-line AI commentary for each news item
- **Daily Briefing**: Produces structured multi-section mission briefings
- **Mission Planning**: GO/NO-GO/CONDITIONAL assessments with risk factors
- **Space Weather Forecast**: 3-day predictions with confidence scores
- **Anomaly Detection**: Z-score statistical analysis + Granite explanation
- **ORB-I Companion**: Multi-turn conversational AI with scenario-specific personas

## Hackathon Submission

- **Challenge**: IBM AI Builders Challenge — Advance Space Exploration with AI
- **Team**: b3panda3
- **Repository**: [github.com/b3panda3/EarthOspacE](https://github.com/b3panda3/EarthOspacE)
- **Deadline**: August 31, 2026

## License

MIT
