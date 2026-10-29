import type { Activity } from "@/types/activity";

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

export function formatDuration(sec: number): string {
  if (!sec) return "—";
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.round(sec % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatGain(meters: number): string {
  return `+${Math.round(meters)} m`;
}

export function formatElevation(meters: number): string {
  return `${Math.round(meters).toLocaleString("en-US")} m`;
}

export function activityStatLine(activity: Activity): string {
  return [
    formatDistance(activity.stats.distanceKm),
    formatDuration(activity.stats.durationSec),
    formatGain(activity.stats.elevationGainM),
  ].join("  ·  ");
}
