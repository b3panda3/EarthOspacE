"use client";

import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { NearEarthComet } from "@/app/api/events/route";

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export default function CometList() {
  const { data, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Events fetch failed");
      return res.json() as Promise<{ comets: NearEarthComet[] }>;
    },
    refetchInterval: 60 * 60 * 1000, // 1 hr
    staleTime: 55 * 60 * 1000,
  });

  const comets = data?.comets ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>☄️ Upcoming Close Approaches</CardTitle>
      </CardHeader>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="text-[#605943] animate-spin" aria-label="Loading comets" />
        </div>
      )}

      {!isLoading && comets.length === 0 && (
        <p className="text-xs text-[#605943] py-3">No data available.</p>
      )}

      <ul role="list" className="divide-y divide-[#3a3830]">
        {comets.slice(0, 5).map((comet) => {
          const days = daysUntil(comet.closeApproachDate);
          return (
            <li key={comet.id} className="py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[#e8e7e5] truncate">
                  {comet.name}
                </p>
                <Badge variant={days <= 2 ? "red" : days <= 5 ? "gold" : "muted"}>
                  {days === 0 ? "Today" : `${days}d`}
                </Badge>
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-[10px] text-[#605943]">
                <span>{comet.closeApproachDate}</span>
                <span>{comet.distanceAU} AU</span>
                <span>{comet.velocityKmh} km/h</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
