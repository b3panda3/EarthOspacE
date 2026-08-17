"use client";

import Link from "next/link";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import {
  User,
  Pencil,
  Volume2,
  VolumeX,
  Bell,
  LayoutGrid,
  Rocket,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useProfile } from "@/lib/hooks/useProfile";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { AiUserProfile } from "@/lib/types";

/* ── Recharts custom tooltip ─────────────────────────────────────────────── */

function RadarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#605943] bg-[#24231f] px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[#e6c974]">{payload[0].name}</p>
      <p className="text-[#e8e7e5]">
        Weight: {(payload[0].value * 100).toFixed(0)}%
      </p>
    </div>
  );
}

/* ── Interest radar chart ────────────────────────────────────────────────── */

function InterestRadar({ profile }: { profile: AiUserProfile }) {
  const data = Object.entries(profile.interests).map(([subject, value]) => ({
    subject,
    value: parseFloat((value * 100).toFixed(1)),
    fullMark: 100,
  }));

  return (
    <div className="w-full h-72" aria-label="Interest weights radar chart">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke="#3a3830" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#96938d", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#605943", fontSize: 10 }}
            tickCount={4}
          />
          <Radar
            name="Interest"
            dataKey="value"
            stroke="#e6c974"
            fill="#e6c974"
            fillOpacity={0.18}
            dot={{ fill: "#e6c974", r: 3 }}
          />
          <Tooltip content={<RadarTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Stat pill ───────────────────────────────────────────────────────────── */

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#3a3830] last:border-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e6c974]/10">
        <Icon size={14} aria-hidden="true" className="text-[#e6c974]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#605943]">{label}</p>
        <p className="text-sm font-medium text-[#e8e7e5] truncate">{value}</p>
      </div>
    </div>
  );
}

/* ── Top interest pills ──────────────────────────────────────────────────── */

function TopInterests({ profile }: { profile: AiUserProfile }) {
  const sorted = Object.entries(profile.interests)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {sorted.map(([cat, weight], i) => (
        <Badge key={cat} variant={i === 0 ? "gold" : i === 1 ? "purple" : "muted"}>
          {cat}{" "}
          <span className="ml-1 opacity-70">{(weight * 100).toFixed(0)}%</span>
        </Badge>
      ))}
    </div>
  );
}

/* ── Loading skeleton ────────────────────────────────────────────────────── */

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-4xl py-8 animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-[#29271f]" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-64 rounded-xl bg-[#29271f]" />
        <div className="lg:col-span-2 h-64 rounded-xl bg-[#29271f]" />
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */

function EmptyProfile() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="mb-4 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#605943] bg-[#24231f]">
          <User size={28} className="text-[#605943]" aria-hidden="true" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-[#e8e7e5] mb-2">
        No profile yet
      </h2>
      <p className="text-sm text-[#96938d] mb-6">
        Complete the mission briefing questionnaire so IBM Granite can build
        your personalised space profile.
      </p>
      <Link href="/profile/onboarding">
        <Button variant="primary" size="md">
          <Sparkles size={14} aria-hidden="true" />
          Start Questionnaire
        </Button>
      </Link>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function ProfilePage() {
  const { profile, loading } = useProfile();

  if (loading) return <ProfileSkeleton />;
  if (!profile) return <EmptyProfile />;

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-[#e8e7e5]">
            Mission Profile
          </h1>
          <p className="mt-1 text-sm text-[#96938d]">
            Generated by IBM Granite · personalised for your mission context
          </p>
        </div>
        <Link href="/profile/onboarding">
          <Button variant="ghost" size="sm" aria-label="Edit profile">
            <Pencil size={14} aria-hidden="true" />
            Edit Profile
          </Button>
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* ── Left column: identity + stats ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="flex flex-col gap-4"
        >
          {/* Avatar + role */}
          <Card variant="elevated" className="text-center py-6">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#e6c974]/40 bg-[#e6c974]/10">
              <User size={28} aria-hidden="true" className="text-[#e6c974]" />
            </div>
            <p className="text-sm font-bold text-[#e8e7e5]">{profile.role}</p>
            <p className="text-xs text-[#96938d] mt-1">{profile.missionType}</p>
            <div className="mt-3 flex justify-center gap-2 flex-wrap">
              <Badge variant={profile.voiceEnabled ? "gold" : "muted"}>
                {profile.voiceEnabled ? (
                  <Volume2 size={11} className="mr-1" aria-hidden="true" />
                ) : (
                  <VolumeX size={11} className="mr-1" aria-hidden="true" />
                )}
                Voice {profile.voiceEnabled ? "On" : "Off"}
              </Badge>
            </div>
          </Card>

          {/* Config stats */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <div className="mt-1">
              <StatRow
                icon={Bell}
                label="Update Frequency"
                value={profile.updateFrequency}
              />
              <StatRow
                icon={LayoutGrid}
                label="Display Format"
                value={profile.displayPreference}
              />
              <StatRow
                icon={Rocket}
                label="Mission Type"
                value={profile.missionType}
              />
            </div>
          </Card>
        </motion.div>

        {/* ── Right column: summary + radar ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="lg:col-span-2 flex flex-col gap-4"
        >
          {/* AI personality summary */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Personality Summary</CardTitle>
              <Badge variant="purple">
                <Sparkles size={10} className="mr-1" aria-hidden="true" />
                IBM Granite
              </Badge>
            </CardHeader>
            <p className="text-sm text-[#96938d] leading-relaxed mt-1">
              {profile.personalitySummary}
            </p>
          </Card>

          {/* Radar chart */}
          <Card>
            <CardHeader>
              <CardTitle>Interest Weights</CardTitle>
              <Badge variant="muted">Radar</Badge>
            </CardHeader>
            <InterestRadar profile={profile} />
          </Card>

          {/* Top interests */}
          <Card variant="flat">
            <CardHeader>
              <CardTitle>Top Interests</CardTitle>
            </CardHeader>
            <TopInterests profile={profile} />
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
