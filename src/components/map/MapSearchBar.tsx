"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2, X } from "lucide-react";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface MapSearchBarProps {
  onFlyTo: (lat: number, lng: number, zoom?: number) => void;
}

export default function MapSearchBar({ onFlyTo }: MapSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Close on outside click ───────────────────────────────────────────── */
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  /* ── Nominatim search with 400ms debounce ─────────────────────────────── */
  const search = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "en" },
      });
      const data = (await res.json()) as NominatimResult[];
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  }

  function handleSelect(result: NominatimResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onFlyTo(lat, lng, 10);
    setQuery(result.display_name.split(",")[0]);
    setOpen(false);
    setResults([]);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm" role="search">
      <label htmlFor="map-search" className="sr-only">
        Search locations on map
      </label>

      <div className="relative flex items-center">
        <Search
          size={14}
          aria-hidden="true"
          className="absolute left-3 text-[#605943] pointer-events-none"
        />
        <input
          id="map-search"
          type="search"
          value={query}
          onChange={handleInput}
          placeholder="Search location…"
          autoComplete="off"
          aria-expanded={open}
          aria-controls="map-search-results"
          aria-autocomplete="list"
          className="h-9 w-full rounded-lg pl-8 pr-8 text-sm bg-[#24231f] border border-[#605943] text-[#e8e7e5] placeholder-[#605943] focus:outline-none focus:ring-2 focus:ring-[#e6c974]/60 focus:border-[#e6c974]/60 transition-colors"
        />
        {loading ? (
          <Loader2
            size={14}
            aria-hidden="true"
            className="absolute right-3 text-[#605943] animate-spin"
          />
        ) : query.length > 0 ? (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2.5 text-[#605943] hover:text-[#e8e7e5] transition-colors focus-visible:outline-none"
          >
            <X size={13} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <ul
          id="map-search-results"
          role="listbox"
          aria-label="Search results"
          className="absolute top-full mt-1 w-full rounded-xl border border-[#605943] overflow-hidden shadow-xl z-50"
          style={{ background: "rgba(36,35,31,0.98)" }}
        >
          {results.map((result) => (
            <li key={result.place_id} role="option" aria-selected="false">
              <button
                className="w-full text-left px-3 py-2.5 text-xs text-[#e8e7e5] hover:bg-[#29271f] transition-colors truncate focus-visible:outline-none focus-visible:bg-[#29271f]"
                onClick={() => handleSelect(result)}
              >
                {result.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
