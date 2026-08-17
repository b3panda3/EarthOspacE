import { NextRequest, NextResponse } from "next/server";

/* ── Preset cities ───────────────────────────────────────────────────────── */

const CITIES = [
  { name: "Houston", country: "US" },   // NASA JSC
  { name: "Baikonur", country: "KZ" },  // Launch site
  { name: "Kourou", country: "GF" },    // ESA launch
];

interface OWMResponse {
  name: string;
  main: { temp: number; feels_like: number; humidity: number };
  weather: { description: string; icon: string }[];
  wind: { speed: number };
  sys: { country: string };
}

export interface CityWeather {
  city: string;
  country: string;
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  description: string;
  icon: string;
  windMs: number;
}

/* ── GET /api/weather ────────────────────────────────────────────────────── */

export async function GET(_req: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

  if (!apiKey || apiKey.startsWith("your_")) {
    /* Return plausible demo data when key is not configured */
    const demo: CityWeather[] = [
      { city: "Houston", country: "US", tempC: 32, feelsLikeC: 36, humidity: 78, description: "partly cloudy", icon: "02d", windMs: 4.5 },
      { city: "Baikonur", country: "KZ", tempC: 18, feelsLikeC: 16, humidity: 42, description: "clear sky", icon: "01d", windMs: 7.2 },
      { city: "Kourou", country: "GF", tempC: 28, feelsLikeC: 33, humidity: 85, description: "light rain", icon: "10d", windMs: 3.1 },
    ];
    return NextResponse.json({ cities: demo, demo: true });
  }

  const results = await Promise.allSettled(
    CITIES.map(async ({ name, country }) => {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(name)},${country}&appid=${apiKey}&units=metric`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (!res.ok) throw new Error(`OWM ${res.status}`);
      const data = (await res.json()) as OWMResponse;
      return {
        city: data.name,
        country: data.sys.country,
        tempC: Math.round(data.main.temp),
        feelsLikeC: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        description: data.weather[0]?.description ?? "",
        icon: data.weather[0]?.icon ?? "01d",
        windMs: data.wind.speed,
      } satisfies CityWeather;
    })
  );

  const cities = results
    .filter((r): r is PromiseFulfilledResult<CityWeather> => r.status === "fulfilled")
    .map((r) => r.value);

  return NextResponse.json({ cities, demo: false });
}
