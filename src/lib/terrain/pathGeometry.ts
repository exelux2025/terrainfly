import {
  cumulativeDistancesKm,
  sliceRoute,
  sliceRouteAhead,
} from "@/lib/animation/followRoute";
import type { Activity, LngLatEle } from "@/types/activity";

export type PathLineFeature = {
  type: "Feature";
  properties: { chapter: number; kind: "network" | "traveled" };
  geometry: {
    type: "LineString";
    coordinates: number[][];
  };
};

export type PathPointFeature = {
  type: "Feature";
  properties: { kind: "start" | "end" | "chapter"; label: string };
  geometry: {
    type: "Point";
    coordinates: number[];
  };
};

export function simplifyTrack(coordinates: LngLatEle[], maxPoints = 2400): LngLatEle[] {
  if (coordinates.length <= maxPoints) return coordinates;
  const stride = Math.max(1, Math.ceil((coordinates.length - 1) / (maxPoints - 1)));
  const out: LngLatEle[] = [];
  for (let i = 0; i < coordinates.length; i += stride) {
    out.push(coordinates[i]);
  }
  const last = coordinates[coordinates.length - 1];
  const prev = out[out.length - 1];
  if (!prev || prev[0] !== last[0] || prev[1] !== last[1] || prev[2] !== last[2]) {
    out.push(last);
  }
  return out;
}

export function pathCoordinates(segments: Activity[]): LngLatEle[] {
  return segments.flatMap((segment) => segment.coordinates);
}

function lineFeature(
  coordinates: LngLatEle[],
  chapter: number,
  kind: "network" | "traveled",
): PathLineFeature | null {
  if (coordinates.length < 2) return null;
  return {
    type: "Feature",
    properties: { chapter, kind },
    geometry: {
      type: "LineString",
      coordinates: coordinates.map(([lng, lat, ele]) => [lng, lat, ele]),
    },
  };
}

export function pathNetworkCollection(segments: Activity[]): {
  type: "FeatureCollection";
  features: PathLineFeature[];
} {
  return {
    type: "FeatureCollection",
    features: segments
      .map((segment, index) => lineFeature(simplifyTrack(segment.coordinates), index, "network"))
      .filter((feature): feature is PathLineFeature => feature != null),
  };
}

export function pathTraveledCollection(
  segments: Activity[],
  chapterIndex: number,
  localProgress: number,
): {
  type: "FeatureCollection";
  features: PathLineFeature[];
} {
  const features: PathLineFeature[] = [];
  const index = Math.min(Math.max(chapterIndex, 0), Math.max(0, segments.length - 1));
  const t = Math.min(1, Math.max(0, localProgress));

  for (let i = 0; i < index; i += 1) {
    const feature = lineFeature(simplifyTrack(segments[i].coordinates), i, "traveled");
    if (feature) features.push(feature);
  }

  const current = segments[index];
  if (current) {
    const distances = cumulativeDistancesKm(current.coordinates);
    const totalKm = distances[distances.length - 1] ?? 0;
    const sliced = sliceRoute(current.coordinates, distances, t * totalKm);
    const feature = lineFeature(simplifyTrack(sliced, 3200), index, "traveled");
    if (feature) features.push(feature);
  }

  return { type: "FeatureCollection", features };
}

export function pathRemainingCollection(
  segments: Activity[],
  chapterIndex: number,
  localProgress: number,
): {
  type: "FeatureCollection";
  features: PathLineFeature[];
} {
  const features: PathLineFeature[] = [];
  const index = Math.min(Math.max(chapterIndex, 0), Math.max(0, segments.length - 1));
  const t = Math.min(1, Math.max(0, localProgress));

  const current = segments[index];
  if (current && t < 0.999) {
    const distances = cumulativeDistancesKm(current.coordinates);
    const totalKm = distances[distances.length - 1] ?? 0;
    const ahead = sliceRouteAhead(current.coordinates, distances, t * totalKm);
    const feature = lineFeature(simplifyTrack(ahead, 3200), index, "network");
    if (feature) features.push(feature);
  }

  for (let i = index + 1; i < segments.length; i += 1) {
    const feature = lineFeature(simplifyTrack(segments[i].coordinates), i, "network");
    if (feature) features.push(feature);
  }

  return { type: "FeatureCollection", features };
}

export function pathMarkerCollection(segments: Activity[]): {
  type: "FeatureCollection";
  features: PathPointFeature[];
} {
  if (segments.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  const features: PathPointFeature[] = [];
  const start = segments[0].coordinates[0];
  const lastSegment = segments[segments.length - 1];
  const end = lastSegment.coordinates[lastSegment.coordinates.length - 1];

  features.push({
    type: "Feature",
    properties: { kind: "start", label: "Start" },
    geometry: { type: "Point", coordinates: [start[0], start[1]] },
  });

  for (let i = 1; i < segments.length; i += 1) {
    const point = segments[i].coordinates[0];
    if (!point) continue;
    features.push({
      type: "Feature",
      properties: { kind: "chapter", label: String(i + 1) },
      geometry: { type: "Point", coordinates: [point[0], point[1]] },
    });
  }

  features.push({
    type: "Feature",
    properties: { kind: "end", label: "Finish" },
    geometry: { type: "Point", coordinates: [end[0], end[1]] },
  });

  return { type: "FeatureCollection", features };
}
