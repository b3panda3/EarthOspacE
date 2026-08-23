import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai/watsonx";
import { supabase } from "@/lib/utils/supabase";
import { isDemoMode, DEMO_PROFILE } from "@/lib/utils/demo";
import type { QuestionnaireAnswers, AiUserProfile } from "@/lib/types";

/* ── System prompt for IBM Granite ──────────────────────────────────────── */
const SYSTEM_PROMPT = `You are a user profiling AI for a space exploration platform. Analyze the following questionnaire responses and generate a JSON user profile with these fields: role (string), missionType (string), interests (object with category names as keys and 0-1 weight scores as values), updateFrequency (string), displayPreference (string), voiceEnabled (boolean), and a 2-sentence personalitySummary (string). Respond ONLY with valid JSON, no markdown.`;

/* ── POST /api/profile ───────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  // ── Demo mode: return the pre-generated demo profile instantly ──────────
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ profile: DEMO_PROFILE as unknown as AiUserProfile, stored: false, demo: true });
  }

  let answers: QuestionnaireAnswers;

  try {
    answers = (await req.json()) as QuestionnaireAnswers;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  /* Build user message from answers */
  const userMessage = `
Questionnaire responses:
- Primary Role: ${answers.primaryRole}
- Organization: ${answers.organization}
- Mission Type: ${answers.missionType}
- Current Location: ${answers.location}
- Interest Ratings (1-5 stars):
${Object.entries(answers.interestRatings)
  .map(([cat, rating]) => `  • ${cat}: ${rating}/5`)
  .join("\n")}
- Update Frequency: ${answers.updateFrequency}
- Display Preference: ${answers.displayPreference}
- Voice Briefings: ${answers.voiceEnabled ? "Yes" : "No"}

Generate the JSON profile now.
`.trim();

  let aiProfile: AiUserProfile;

  try {
    const reply = await chatCompletion([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ]);

    /* Strip any accidental markdown fences before parsing */
    const rawJson = reply.content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    aiProfile = JSON.parse(rawJson) as AiUserProfile;
  } catch (err) {
    console.error("[profile/route] AI generation failed:", err);
    /* Fallback: build a deterministic profile from the answers */
    const totalStars = Object.values(answers.interestRatings).reduce(
      (sum, v) => sum + v,
      0
    );
    const interestWeights = Object.fromEntries(
      Object.entries(answers.interestRatings).map(([cat, stars]) => [
        cat,
        totalStars > 0 ? parseFloat((stars / totalStars).toFixed(3)) : 0,
      ])
    ) as AiUserProfile["interests"];

    aiProfile = {
      role: answers.primaryRole,
      missionType: answers.missionType,
      interests: interestWeights,
      updateFrequency: answers.updateFrequency,
      displayPreference: answers.displayPreference,
      voiceEnabled: answers.voiceEnabled,
      personalitySummary:
        `A ${answers.primaryRole} based at ${answers.location}, focused on ${answers.missionType}. ` +
        `Prefers ${answers.updateFrequency} updates via ${answers.displayPreference}.`,
    };
  }

  /* ── Upsert into Supabase ─────────────────────────────────────────────── */
  if (!supabase) {
    /* Supabase not configured — return profile without DB persistence */
    return NextResponse.json({ profile: aiProfile, stored: false });
  }

  // Map camelCase JS fields to snake_case DB columns
  const record = {
    id: crypto.randomUUID(),
    role: aiProfile.role,
    mission_type: aiProfile.missionType,
    interests: aiProfile.interests,
    update_frequency: aiProfile.updateFrequency,
    display_preference: aiProfile.displayPreference,
    voice_enabled: aiProfile.voiceEnabled,
    personality_summary: aiProfile.personalitySummary,
    raw_answers: answers,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error: dbError } = await supabase
    .from("users")
    .upsert(record, { onConflict: "id" })
    .select()
    .single();

  if (dbError) {
    /* Log but don't fail — return the AI profile even if DB write fails */
    console.error("[profile/route] Supabase upsert failed:", dbError.message);
    return NextResponse.json({ profile: aiProfile, stored: false });
  }

  return NextResponse.json({ profile: data as AiUserProfile, stored: true });
}

/* ── GET /api/profile?id=<uuid> ─────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing id query parameter" },
      { status: 400 }
    );
  }

  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile: data as AiUserProfile });
}
