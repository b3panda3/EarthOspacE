"use client";

import { useState, useMemo } from "react";
import { Wind, Droplets, Loader2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import type { CityWeather } from "@/app/api/weather/route";

function weatherEmoji(icon: string): string {
  if (icon.startsWith("01")) return "\u2600\ufe0f";
  if (icon.startsWith("02")) return "\ud83c\udf24\ufe0f";
  if (icon.startsWith("03") || icon.startsWith("04")) return "\u2601\ufe0f";
  if (icon.startsWith("09") || icon.startsWith("10")) return "\ud83c\udf27\ufe0f";
  if (icon.startsWith("11")) return "\u26c8\ufe0f";
  if (icon.startsWith("13")) return "\u2744\ufe0f";
  if (icon.startsWith("50")) return "\ud83c\udf2b\ufe0f";
  return "\ud83c\udf21\ufe0f";
}

const INITIAL_SHOW = 4;

function CityRow({ city }: { city: CityWeather }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1e3a5f] last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg leading-none" aria-hidden="true">
          {weatherEmoji(city.icon)}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#e0f2fe] truncate">{city.city}</p>
          <p className="text-xs text-[#7dd3fc] capitalize truncate">{city.description}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-[#38bdf8]">{city.tempC}°C</p>
        <div className="flex items-center gap-1 text-[10px] text-[#7dd3fc]/70 justify-end">
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
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["weather"],
    queryFn: async () => {
      const res = await fetch("/api/weather");
      if (!res.ok) throw new Error("Weather fetch failed");
      return res.json() as Promise<{ cities: CityWeather[]; demo: boolean }>;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  const cities = data?.cities ?? [];
  const filtered = useMemo(() => {
    if (!search.trim()) return cities;
    const q = search.toLowerCase();
    return cities.filter((c) =>
      c.city.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  }, [cities, search]);

  const displayed = showAll ? filtered : filtered.slice(0, INITIAL_SHOW);
  const hasMore = filtered.length > INITIAL_SHOW;

  return (
    <Card>
      <CardHeader>
        <CardTitle>🌍 Space City Weather</CardTitle>
        {!data?.demo && (
          <span className="text-[10px] text-[#4ade80] border border-[#4ade80]/30 rounded px-1.5 py-0.5">
            Live
          </span>
        )}
      </CardHeader>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7dd3fc]/60" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cities..."
            className="w-full bg-[#050a14] border border-[#1e3a5f] rounded-lg pl-7 pr-3 py-1.5 text-xs text-[#e0f2fe] placeholder-[#1e3a5f] focus:outline-none focus:border-[#38bdf8] transition-colors"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="text-[#38bdf8] animate-spin" aria-label="Loading weather" />
        </div>
      )}

      {isError && <p className="text-xs text-red-400 py-3">Weather unavailable. Check API key.</p>}

      {data?.cities && (
        <div>
          {displayed.map((city) => (
            <CityRow key={city.city} city={city} />
          ))}
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-[#38bdf8] hover:text-[#7dd3fc] transition-colors"
            >
              {showAll ? (
                <><ChevronUp size={12} /> Show less</>
              ) : (
                <><ChevronDown size={12} /> Show all {filtered.length} cities</>
              )}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
