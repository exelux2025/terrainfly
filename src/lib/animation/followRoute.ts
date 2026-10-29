import { bearingDeg, haversineKm } from "@/lib/gps/geo";
import type { LngLatEle } from "@/types/activity";

export type RouteSample = {
  lng: number;
  lat: number;
  ele: number;
  bearing: number;
};

export const FLYOVER_DURATION_MS = 45_000;

export function cumulativeDistancesKm(coordinates: LngLatEle[]): number[] {
  const distances = [0];
  for (let i = 1; i < coordinates.length; i += 1) {
    distances.push(distances[i - 1] + haversineKm(coordinates[i - 1], coordinates[i]));
  }
  return distances;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function sampleAlongRoute(
  coordinates: LngLatEle[],
  distances: number[],
  distanceKm: number,
): RouteSample {
  const total = distances[distances.length - 1] ?? 0;
  const target = Math.min(Math.max(distanceKm, 0), total);
  if (coordinates.length === 0) {
    return { lng: 0, lat: 0, ele: 0, bearing: 0 };
  }
  if (coordinates.length === 1 || total === 0) {
    const [lng, lat, ele] = coordinates[0];
    return { lng, lat, ele, bearing: 0 };
  }

  let index = 0;
  while (index < distances.length - 2 && distances[index + 1] < target) {
    index += 1;
  }

  const span = distances[index + 1] - distances[index];
  const t = span > 0 ? (target - distances[index]) / span : 0;
  const from = coordinates[index];
  const to = coordinates[index + 1] ?? from;
  const lookAhead = sampleLookAhead(coordinates, distances, target, 0.08);

  return {
    lng: lerp(from[0], to[0], t),
    lat: lerp(from[1], to[1], t),
    ele: lerp(from[2], to[2], t),
    bearing: bearingDeg([from[0], from[1], from[2]], lookAhead),
  };
}

function sampleLookAhead(
  coordinates: LngLatEle[],
  distances: number[],
  distanceKm: number,
  lookaheadKm: number,
): LngLatEle {
  const total = distances[distances.length - 1] ?? 0;
  const target = Math.min(distanceKm + lookaheadKm, total);
  let index = 0;
  while (index < distances.length - 2 && distances[index + 1] < target) {
    index += 1;
  }
  return coordinates[Math.min(index + 1, coordinates.length - 1)];
}

export function flyoverZoom(distanceKm: number): number {
  if (distanceKm > 25) return 12.8;
  if (distanceKm > 10) return 13.6;
  if (distanceKm > 4) return 14.2;
  return 14.8;
}
