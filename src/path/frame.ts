import { cumulativeDistancesKm } from "@/lib/animation/followRoute";
import { segmentWindow, type PathSequence } from "@/lib/gps/sequence";
import type { Activity, LngLatEle } from "@/types/activity";
import type { PathVideoFrame } from "./types";

const PROFILE_SAMPLES = 48;
const GAIN_THRESHOLD_M = 1;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function atDistance(
  distances: number[],
  traveledKm: number,
): { index: number; t: number } {
  const total = distances[distances.length - 1] ?? 0;
  const target = Math.min(Math.max(traveledKm, 0), total);
  if (distances.length < 2 || total <= 0) return { index: 0, t: 0 };

  let index = 0;
  while (index < distances.length - 2 && distances[index + 1] < target) {
    index += 1;
  }
  const span = distances[index + 1] - distances[index];
  return { index, t: span > 0 ? (target - distances[index]) / span : 0 };
}

function elevationAt(
  coordinates: LngLatEle[],
  distances: number[],
  traveledKm: number,
): number {
  if (coordinates.length === 0) return 0;
  const { index, t } = atDistance(distances, traveledKm);
  const from = coordinates[index][2];
  const to = (coordinates[index + 1] ?? coordinates[index])[2];
  return lerp(from, to, t);
}

function gainUntil(
  coordinates: LngLatEle[],
  distances: number[],
  traveledKm: number,
): number {
  if (coordinates.length < 2) return 0;
  const { index, t } = atDistance(distances, traveledKm);
  let gain = 0;
  for (let i = 1; i <= index; i += 1) {
    const delta = coordinates[i][2] - coordinates[i - 1][2];
    if (delta > GAIN_THRESHOLD_M) gain += delta;
  }
  const next = coordinates[index + 1];
  if (next) {
    const delta = (next[2] - coordinates[index][2]) * t;
    if (delta > GAIN_THRESHOLD_M) gain += delta;
  }
  return gain;
}

function elapsedUntil(
  timestamps: Array<number | null>,
  distances: number[],
  traveledKm: number,
  durationSec: number,
  t: number,
): number {
  if (durationSec <= 0) return 0;
  const { index, t: localT } = atDistance(distances, traveledKm);
  const from = timestamps[index];
  const to = timestamps[index + 1];
  const start = timestamps.find((value): value is number => value != null);
  if (from != null && to != null && start != null) {
    return Math.max(0, (lerp(from, to, localT) - start) / 1000);
  }
  return t * durationSec;
}

function downsampleProfile(coordinates: LngLatEle[]): number[] {
  if (coordinates.length === 0) return Array.from({ length: PROFILE_SAMPLES }, () => 0.5);
  const eles = coordinates.map((point) => point[2]);
  const min = Math.min(...eles);
  const max = Math.max(...eles);
  const span = max - min || 1;
  const last = coordinates.length - 1;
  return Array.from({ length: PROFILE_SAMPLES }, (_, i) => {
    const at = (i / (PROFILE_SAMPLES - 1)) * last;
    const index = Math.min(last, Math.floor(at));
    const t = at - index;
    const value = lerp(eles[index], eles[Math.min(last, index + 1)], t);
    return (value - min) / span;
  });
}

/** Sample a continuous video frame. Call this every tick — do not concatenate files. */
export function samplePathFrame(activity: Activity, progress01: number): PathVideoFrame {
  const t = clamp01(progress01);
  const distances = cumulativeDistancesKm(activity.coordinates);
  const totalKm = distances[distances.length - 1] ?? activity.stats.distanceKm;
  const traveledKm = t * totalKm;
  const profile = downsampleProfile(activity.coordinates);

  return {
    t,
    name: activity.name,
    traveledKm,
    totalKm,
    remainingKm: Math.max(0, totalKm - traveledKm),
    elapsedSec: elapsedUntil(
      activity.timestamps,
      distances,
      traveledKm,
      activity.stats.durationSec,
      t,
    ),
    durationSec: activity.stats.durationSec,
    elevationM: elevationAt(activity.coordinates, distances, traveledKm),
    gainToHereM: gainUntil(activity.coordinates, distances, traveledKm),
    totalGainM: activity.stats.elevationGainM,
    profile,
    profileIndex: Math.round(t * (PROFILE_SAMPLES - 1)),
  };
}

/** Continuous video clock across separate path files. Does not merge GPS files. */
export function samplePathFrameFromSequence(
  sequence: PathSequence,
  progress01: number,
): PathVideoFrame {
  const t = clamp01(progress01);
  const window = segmentWindow(sequence, t);
  const local = samplePathFrame(window.segment, window.localProgress);
  const priorGain = sequence.segments
    .slice(0, window.index)
    .reduce((sum, item) => sum + item.stats.elevationGainM, 0);
  const priorTime = sequence.segments
    .slice(0, window.index)
    .reduce((sum, item) => sum + item.stats.durationSec, 0);

  return {
    ...local,
    t,
    name: window.segment.name,
    chapter: `Path ${window.index + 1} / ${sequence.segments.length}`,
    traveledKm: window.traveledKm,
    totalKm: sequence.stats.distanceKm,
    remainingKm: Math.max(0, sequence.stats.distanceKm - window.traveledKm),
    elapsedSec: priorTime + local.elapsedSec,
    durationSec: sequence.stats.durationSec,
    gainToHereM: priorGain + local.gainToHereM,
    totalGainM: sequence.stats.elevationGainM,
    profile: sequence.profile,
    profileIndex: Math.round(t * Math.max(0, sequence.profile.length - 1)),
  };
}
