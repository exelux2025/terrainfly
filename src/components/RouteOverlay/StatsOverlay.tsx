"use client";

import type { Activity } from "@/types/activity";

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

function formatDuration(sec: number): string {
  if (!sec) return "—";
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.round(sec % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatGain(meters: number): string {
  return `${Math.round(meters)} m`;
}

export function StatsOverlay({ activity }: { activity: Activity | null }) {
  if (!activity) {
    return (
      <p className="text-xs leading-5 text-zinc-400">
        Upload a track to see distance, duration, and elevation gain on 3D terrain.
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-lg bg-white/5 px-2 py-2">
        <dt className="text-[10px] uppercase tracking-wide text-zinc-400">Distance</dt>
        <dd className="mt-1 text-sm font-semibold text-zinc-50">
          {formatDistance(activity.stats.distanceKm)}
        </dd>
      </div>
      <div className="rounded-lg bg-white/5 px-2 py-2">
        <dt className="text-[10px] uppercase tracking-wide text-zinc-400">Duration</dt>
        <dd className="mt-1 text-sm font-semibold text-zinc-50">
          {formatDuration(activity.stats.durationSec)}
        </dd>
      </div>
      <div className="rounded-lg bg-white/5 px-2 py-2">
        <dt className="text-[10px] uppercase tracking-wide text-zinc-400">Gain</dt>
        <dd className="mt-1 text-sm font-semibold text-zinc-50">
          {formatGain(activity.stats.elevationGainM)}
        </dd>
      </div>
    </dl>
  );
}
