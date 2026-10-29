import type { Activity, ActivityStats } from "@/types/activity";

export const PATH_FLYOVER_MS = 96_000;

export type PathSequence = {
  name: string;
  segments: Activity[];
  stats: ActivityStats;
  profile: number[];
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function startTimeMs(activity: Activity): number {
  return activity.timestamps.find((value): value is number => value != null) ?? Number.MAX_SAFE_INTEGER;
}

export function sortPathActivities(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => {
    const delta = startTimeMs(a) - startTimeMs(b);
    return delta !== 0 ? delta : a.name.localeCompare(b.name);
  });
}

function downsampleElevations(values: number[], samples = 48): number[] {
  if (values.length === 0) return Array.from({ length: samples }, () => 0.5);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const last = values.length - 1;
  return Array.from({ length: samples }, (_, i) => {
    const at = (i / (samples - 1)) * last;
    const index = Math.min(last, Math.floor(at));
    const t = at - index;
    const from = values[index];
    const to = values[Math.min(last, index + 1)];
    return (from + (to - from) * t - min) / span;
  });
}

export function buildPathSequence(activities: Activity[]): PathSequence {
  const segments = sortPathActivities(activities);
  if (segments.length === 0) {
    throw new Error("No usable tracks in the path folder.");
  }

  const stats: ActivityStats = {
    distanceKm: segments.reduce((sum, item) => sum + item.stats.distanceKm, 0),
    durationSec: segments.reduce((sum, item) => sum + item.stats.durationSec, 0),
    elevationGainM: segments.reduce((sum, item) => sum + item.stats.elevationGainM, 0),
    pointCount: segments.reduce((sum, item) => sum + item.stats.pointCount, 0),
  };
  const names = [...new Set(segments.map((item) => item.name))];
  const elevations = segments.flatMap((item) => item.coordinates.map((point) => point[2]));

  return {
    name: names.join(" → "),
    segments,
    stats,
    profile: downsampleElevations(elevations),
  };
}

export function segmentWindow(
  sequence: PathSequence,
  globalT: number,
): {
  index: number;
  segment: Activity;
  localProgress: number;
  traveledKm: number;
} {
  const total = sequence.stats.distanceKm;
  const target = clamp01(globalT) * total;
  let acc = 0;

  for (let i = 0; i < sequence.segments.length; i += 1) {
    const distance = sequence.segments[i].stats.distanceKm;
    const next = acc + distance;
    const last = i === sequence.segments.length - 1;
    if (target < next || last) {
      const local = distance > 0 ? (target - acc) / distance : 1;
      return {
        index: i,
        segment: sequence.segments[i],
        localProgress: clamp01(local),
        traveledKm: target,
      };
    }
    acc = next;
  }

  const last = sequence.segments[sequence.segments.length - 1];
  return {
    index: sequence.segments.length - 1,
    segment: last,
    localProgress: 1,
    traveledKm: total,
  };
}

export function localToGlobal(
  sequence: PathSequence,
  index: number,
  localProgress: number,
): number {
  const total = sequence.stats.distanceKm;
  if (total <= 0) return 0;
  let acc = 0;
  for (let i = 0; i < index; i += 1) {
    acc += sequence.segments[i].stats.distanceKm;
  }
  const current = sequence.segments[index]?.stats.distanceKm ?? 0;
  return clamp01((acc + clamp01(localProgress) * current) / total);
}

export function chapterDurationMs(
  sequence: PathSequence,
  index: number,
  totalMs = PATH_FLYOVER_MS,
): number {
  const total = sequence.stats.distanceKm;
  const distance = sequence.segments[index]?.stats.distanceKm ?? 0;
  const share = total > 0 ? distance / total : 1 / Math.max(1, sequence.segments.length);
  return Math.max(8_000, totalMs * share);
}
