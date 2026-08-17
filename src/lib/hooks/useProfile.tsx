"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { AiUserProfile, QuestionnaireAnswers } from "@/lib/types";

/* ── Context shape ───────────────────────────────────────────────────────── */

interface ProfileContextValue {
  /** The current AI-generated profile, or null if not yet set */
  profile: AiUserProfile | null;
  /** True while the initial load or a save is in-flight */
  loading: boolean;
  /** Last error message, if any */
  error: string | null;
  /** Submit questionnaire answers → calls /api/profile and updates state */
  saveProfile: (answers: QuestionnaireAnswers) => Promise<AiUserProfile | null>;
  /** Manually overwrite the in-memory profile (e.g. after fetching from DB) */
  setProfile: (profile: AiUserProfile | null) => void;
  /** Clear the profile and any stored ID */
  clearProfile: () => void;
}

/* ── Context + Provider ──────────────────────────────────────────────────── */

const ProfileContext = createContext<ProfileContextValue | null>(null);

const STORAGE_KEY = "EarthOspacE_profile_id";
const OLD_STORAGE_KEY = "earthospace_profile_id";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<AiUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* On mount: migrate old key and rehydrate profile from localStorage */
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Migrate old localStorage key
    const oldId = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldId) {
      localStorage.setItem(STORAGE_KEY, oldId);
      localStorage.removeItem(OLD_STORAGE_KEY);
    }
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (!storedId) return;

    setLoading(true);
    fetch(`/api/profile?id=${encodeURIComponent(storedId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((body: { profile: AiUserProfile }) => {
        setProfileState(body.profile);
      })
      .catch(() => {
        /* Stale or missing — clean up */
        localStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = useCallback(
    async (answers: QuestionnaireAnswers): Promise<AiUserProfile | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(answers),
        });

        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        const body = (await res.json()) as { profile: AiUserProfile };
        const saved = body.profile;
        setProfileState(saved);

        /* Persist ID for future sessions */
        if (saved.id && typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, saved.id);
        }

        return saved;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const setProfile = useCallback((p: AiUserProfile | null) => {
    setProfileState(p);
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
    setError(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <ProfileContext.Provider
      value={{ profile, loading, error, saveProfile, setProfile, clearProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

/* ── Hook ────────────────────────────────────────────────────────────────── */

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used inside <ProfileProvider>");
  }
  return ctx;
}
