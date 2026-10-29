import bbox from "@turf/bbox";
import length from "@turf/length";
import type { Activity, ActivityFormat, ActivityStats, LngLatEle } from "@/types/activity";
import { haversineKm, isValidLngLat } from "./geo";

type LineFeature = {
  type: "Feature";
  properties: Record<string, never>;
  geometry: {
    type: "LineString";
    coordinates: number[][];
  };
};

const GAIN_THRESHOLD_M = 1;

export type TrackPoint = {
  lng: number;
  lat: number;
  ele: number;
  time: number | null;
};

export function toLineFeature(coordinates: LngLatEle[]): LineFeature {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: coordinates.map(([lng, lat, ele]) => [lng, lat, ele]),
    },
  };
}

export function computeStats(
  coordinates: LngLatEle[],
  timestamps: Array<number | null>,
): ActivityStats {
  const line = toLineFeature(coordinates);
  let distanceKm = 0;
  try {
    distanceKm = length(line, { units: "kilometers" });
  } catch {
    for (let i = 1; i < coordinates.length; i += 1) {
      distanceKm += haversineKm(coordinates[i - 1], coordinates[i]);
    }
  }

  let elevationGainM = 0;
  for (let i = 1; i < coordinates.length; i += 1) {
    const delta = coordinates[i][2] - coordinates[i - 1][2];
    if (delta > GAIN_THRESHOLD_M) elevationGainM += delta;
  }

  const times = timestamps.filter((value): value is number => value != null);
  const durationSec =
    times.length >= 2 ? Math.max(0, (times[times.length - 1] - times[0]) / 1000) : 0;

  return {
    distanceKm,
    durationSec,
    elevationGainM,
    pointCount: coordinates.length,
  };
}

export function activityBounds(coordinates: LngLatEle[]): [number, number, number, number] {
  return bbox(toLineFeature(coordinates)) as [number, number, number, number];
}

export function normalizeActivity(
  name: string,
  sourceFormat: ActivityFormat,
  points: TrackPoint[],
): Activity {
  const cleaned: TrackPoint[] = [];
  for (const point of points) {
    if (!isValidLngLat(point.lng, point.lat)) continue;
    const last = cleaned[cleaned.length - 1];
    if (last && last.lng === point.lng && last.lat === point.lat) continue;
    cleaned.push({
      lng: point.lng,
      lat: point.lat,
      ele: Number.isFinite(point.ele) ? point.ele : last?.ele ?? 0,
      time: point.time,
    });
  }

  if (cleaned.length < 2) {
    throw new Error("This file does not contain a usable GPS track.");
  }

  const coordinates = cleaned.map((point) => [point.lng, point.lat, point.ele] as LngLatEle);
  const timestamps = cleaned.map((point) => point.time);

  return {
    name,
    sourceFormat,
    coordinates,
    timestamps,
    stats: computeStats(coordinates, timestamps),
  };
}
