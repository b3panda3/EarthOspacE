"use client";

import { Thermometer, Wind, Droplets, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import type { CityWeather } from "@/app/api/weather/route";

/* ── OWM icon → emoji (avoids external img calls) ───────────────────────── */
function weatherEmoji(icon: string): string {
  if (icon.startsWith("01")) return "☀️";
  if (icon.startsWith("02")) return "🌤️";
  if (icon.startsWith("03") || icon.startsWith("04")) return "☁️";
  if (icon.startsWith("09") || icon.startsWith("10")) return "🌧️";
  if (icon.startsWith("11")) return "⛈️";
  if (icon.startsWith("13")) return "❄️";
  if (icon.startsWith("50")) return "🌫️";
  return "🌡️";
}

function CityRow({ city }: { city: CityWeather }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#3a3830] last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg leading-none" aria-hidden="true">
          {weatherEmoji(city.icon)}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#e8e7e5] truncate">
            {city.city}
          </p>
          <p className="text-xs text-[#605943] capitalize truncate">
            {city.description}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-[#e6c974]">{city.tempC}°C</p>
        <div className="flex items-center gap-1 text-[10px] text-[#605943] justify-end">
          <Droplets size={9} aria-hidden="true" />
          {city.humidity}%
          <Wind size={9} aria-hidden="true" className="ml-1" />
          {city.windMs}m/s
        </div>
      </div>
    </div>
  );
}

export default function WeatherWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["weather"],
    queryFn: async () => {
      const res = await fetch("/api/weather");
      if (!res.ok) throw new Error("Weather fetch failed");
      return res.json() as Promise<{ cities: CityWeather[]; demo: boolean }>;
    },
    refetchInterval: 5 * 60 * 1000, // 5 min
    staleTime: 4 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>🌍 Space City Weather</CardTitle>
        {data?.demo && (
          <span className="text-[10px] text-[#605943] border border-[#3a3830] rounded px-1.5 py-0.5">
            Demo
          </span>
        )}
      </CardHeader>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="text-[#605943] animate-spin" aria-label="Loading weather" />
        </div>
      )}

      {isError && (
        <p className="text-xs text-[#605943] py-3">Weather unavailable.</p>
      )}

      {data?.cities && (
        <div>
          {data.cities.map((city) => (
            <CityRow key={city.city} city={city} />
          ))}
        </div>
      )}
    </Card>
  );
}
