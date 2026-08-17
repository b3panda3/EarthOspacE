"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/utils/supabase";

const LOCAL_KEY = "eos_bookmarks";

function readLocal(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeLocal(ids: Set<string>) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.from(ids)));
}

/**
 * useBookmarks — manages saved article IDs.
 *
 * Persists to localStorage immediately (for instant UI feedback) and
 * attempts a best-effort Supabase sync. Works without a logged-in user.
 */
export function useBookmarks() {
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState<Set<string>>(new Set());

  /* Hydrate from localStorage on mount */
  useEffect(() => {
    setBookmarked(readLocal());
  }, []);

  const toggle = useCallback(async (articleId: string) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      next.has(articleId) ? next.delete(articleId) : next.add(articleId);
      writeLocal(next);
      return next;
    });

    setSyncing((prev) => new Set(prev).add(articleId));

    try {
      if (supabase) {
        const isNowBookmarked = !bookmarked.has(articleId);
        if (isNowBookmarked) {
          await supabase.from("bookmarks").upsert(
            { article_id: articleId, saved_at: new Date().toISOString() },
            { onConflict: "article_id" }
          );
        } else {
          await supabase.from("bookmarks").delete().eq("article_id", articleId);
        }
      }
    } catch {
      /* Supabase sync failure is non-fatal — localStorage is source of truth */
    } finally {
      setSyncing((prev) => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
    }
  }, [bookmarked]);

  const isBookmarked = useCallback(
    (articleId: string) => bookmarked.has(articleId),
    [bookmarked]
  );

  const isSyncing = useCallback(
    (articleId: string) => syncing.has(articleId),
    [syncing]
  );

  return { bookmarked, toggle, isBookmarked, isSyncing };
}
