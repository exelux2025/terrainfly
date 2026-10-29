import { bearingDeg, destinationPoint, haversineKm } from "@/lib/gps/geo";
import type { LngLatEle } from "@/types/activity";

export type RouteSample = {
  lng: number;
  lat: number;
  ele: number;
  bearing: number;
};

export type CameraPose = {
  lng: number;
  lat: number;
  ele: number;
  bearing: number;
  pitch: number;
  zoom: number;
};

export type ElevationSample = {
  t: number;
  ele: number;
};

export const FLYOVER_DURATION_MS = 45_000;
export const DEFAULT_PITCH = 62;
export const MIN_ZOOM = 10;
export const MAX_ZOOM = 16.5;
export const MIN_PITCH = 35;
export const MAX_PITCH = 80;
export const CLEARANCE_MIN_PITCH = 46;
export const CLEARANCE_MIN_ZOOM = 10;
export const LOS_CLEARANCE_M = 72;
export const MAX_VALLEY_OFFSET_DEG = 26;
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const CAMERA_FOV_RAD = 36.87 * (Math.PI / 180);

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

export function shortestAngleDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

export function lerpAngle(from: number, to: number, t: number): number {
  return (from + shortestAngleDelta(from, to) * t + 360) % 360;
}

export function smoothToward(current: number, target: number, dtMs: number, tauMs: number): number {
  if (tauMs <= 0) return target;
  const alpha = 1 - Math.exp(-Math.max(dtMs, 0) / tauMs);
  return lerp(current, target, alpha);
}

export function smoothAngleToward(
  current: number,
  target: number,
  dtMs: number,
  tauMs: number,
): number {
  if (tauMs <= 0) return target;
  const alpha = 1 - Math.exp(-Math.max(dtMs, 0) / tauMs);
  return lerpAngle(current, target, alpha);
}

export function turnSlowdown(headingErrorDeg: number): number {
  return 1 / (1 + Math.abs(headingErrorDeg) / 38);
}

function pointAtDistance(
  coordinates: LngLatEle[],
  distances: number[],
  distanceKm: number,
): { point: LngLatEle; index: number; t: number } {
  const total = distances[distances.length - 1] ?? 0;
  const target = Math.min(Math.max(distanceKm, 0), total);
  if (coordinates.length === 0) {
    return { point: [0, 0, 0], index: 0, t: 0 };
  }
  if (coordinates.length === 1 || total === 0) {
    return { point: coordinates[0], index: 0, t: 0 };
  }

  let index = 0;
  while (index < distances.length - 2 && distances[index + 1] < target) {
    index += 1;
  }

  const span = distances[index + 1] - distances[index];
  const t = span > 0 ? (target - distances[index]) / span : 0;
  const from = coordinates[index];
  const to = coordinates[index + 1] ?? from;
  return {
    point: [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)],
    index,
    t,
  };
}

export function sampleAlongRoute(
  coordinates: LngLatEle[],
  distances: number[],
  distanceKm: number,
  lookaheadKm = 0.18,
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

  const here = pointAtDistance(coordinates, distances, target);
  const near = pointAtDistance(
    coordinates,
    distances,
    Math.min(total, target + Math.min(0.07, lookaheadKm * 0.4)),
  );
  const far = pointAtDistance(
    coordinates,
    distances,
    Math.min(total, target + lookaheadKm),
  );

  const nearBearing = bearingDeg(here.point, near.point);
  const farBearing = bearingDeg(here.point, far.point);
  const bearing = lerpAngle(nearBearing, farBearing, 0.62);

  return {
    lng: here.point[0],
    lat: here.point[1],
    ele: here.point[2],
    bearing,
  };
}

export function sliceRoute(
  coordinates: LngLatEle[],
  distances: number[],
  distanceKm: number,
): LngLatEle[] {
  if (coordinates.length === 0) return [];
  const { point, index } = pointAtDistance(coordinates, distances, distanceKm);
  const sliced = coordinates.slice(0, index + 1);
  const last = sliced[sliced.length - 1];
  if (!last || last[0] !== point[0] || last[1] !== point[1]) {
    sliced.push(point);
  }
  return sliced.length >= 2 ? sliced : [coordinates[0], point];
}

export function sliceRouteAhead(
  coordinates: LngLatEle[],
  distances: number[],
  distanceKm: number,
): LngLatEle[] {
  if (coordinates.length === 0) return [];
  const { point, index } = pointAtDistance(coordinates, distances, distanceKm);
  const ahead = [point, ...coordinates.slice(index + 1)];
  if (ahead.length >= 2) return ahead;
  const end = coordinates[coordinates.length - 1];
  return end ? [point, end] : [point];
}

export function pathUpBearing(
  coordinates: LngLatEle[],
  distances: number[],
  progressKm: number,
  lookbehindKm: number,
): number {
  const here = pointAtDistance(coordinates, distances, progressKm);
  const behind = pointAtDistance(
    coordinates,
    distances,
    Math.max(0, progressKm - Math.max(0.08, lookbehindKm)),
  );
  if (haversineKm(behind.point, here.point) < 0.04) {
    const sample = sampleAlongRoute(coordinates, distances, progressKm);
    return sample.bearing;
  }
  return bearingDeg(behind.point, here.point);
}

export function flyoverZoom(distanceKm: number): number {
  if (distanceKm > 25) return 12.8;
  if (distanceKm > 10) return 13.6;
  if (distanceKm > 4) return 14.2;
  return 14.8;
}

export function lookaheadForSpeed(speed: number): number {
  return Math.min(0.36, Math.max(0.1, 0.14 * speed));
}

export function cameraGeometry(
  zoom: number,
  pitchDeg: number,
  latitude: number,
  viewportHeight = 800,
): { viewDistance: number; cameraHeight: number; groundDistance: number } {
  const pitch = (pitchDeg * Math.PI) / 180;
  const metersPerPixel =
    (EARTH_CIRCUMFERENCE_M * Math.cos((latitude * Math.PI) / 180)) /
    (512 * 2 ** zoom);
  const viewDistance =
    (viewportHeight / 2 / Math.tan(CAMERA_FOV_RAD / 2)) * metersPerPixel;
  return {
    viewDistance,
    cameraHeight: Math.max(40, viewDistance * Math.cos(pitch)),
    groundDistance: Math.max(40, viewDistance * Math.sin(pitch)),
  };
}

export function losSamplePoints(
  camera: { lng: number; lat: number },
  target: { lng: number; lat: number },
  steps = 6,
): Array<{ lng: number; lat: number; t: number }> {
  const points: Array<{ lng: number; lat: number; t: number }> = [];
  const count = Math.max(3, steps);
  for (let i = 1; i < count; i += 1) {
    const t = i / count;
    points.push({
      lng: camera.lng + (target.lng - camera.lng) * t,
      lat: camera.lat + (target.lat - camera.lat) * t,
      t,
    });
  }
  return points;
}

export function nearestElevation(
  coordinates: LngLatEle[],
  lng: number,
  lat: number,
): number {
  if (coordinates.length === 0) return 0;
  let best = coordinates[0][2];
  let bestDist = Number.POSITIVE_INFINITY;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  for (const point of coordinates) {
    const dLng = (point[0] - lng) * cosLat;
    const dLat = point[1] - lat;
    const dist = dLng * dLng + dLat * dLat;
    if (dist < bestDist) {
      bestDist = dist;
      best = point[2];
    }
  }
  return best;
}

export function lineOfSightExtraHeight(
  cameraHeight: number,
  targetEle: number,
  samples: ElevationSample[],
  clearanceM = LOS_CLEARANCE_M,
): number {
  const cameraEle = targetEle + cameraHeight;
  let extra = 0;
  for (const sample of samples) {
    const t = Math.min(1, Math.max(0, sample.t));
    const losEle = cameraEle + (targetEle - cameraEle) * t;
    extra = Math.max(extra, sample.ele + clearanceM - losEle);
  }
  return extra;
}

export function slopeLimitedPitch(
  coordinates: LngLatEle[],
  distances: number[],
  progressKm: number,
  desiredPitch: number,
  lookbehindKm = 0.42,
): number {
  const here = pointAtDistance(coordinates, distances, progressKm);
  const behind = pointAtDistance(
    coordinates,
    distances,
    Math.max(0, progressKm - lookbehindKm),
  );
  const runM = Math.max(40, lookbehindKm * 1000);
  const riseM = Math.max(0, here.point[2] - behind.point[2]);
  const slopeDeg = (Math.atan2(riseM, runM) * 180) / Math.PI;
  const maxPitch = 76 - slopeDeg * 0.7;
  return Math.min(desiredPitch, Math.max(CLEARANCE_MIN_PITCH, maxPitch));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function losExtraForPose(options: {
  longitude: number;
  latitude: number;
  bearing: number;
  pitch: number;
  zoom: number;
  targetEle: number;
  viewportHeight: number;
  elevationAt: (lng: number, lat: number) => number;
}): number {
  const geom = cameraGeometry(
    options.zoom,
    options.pitch,
    options.latitude,
    options.viewportHeight,
  );
  const behind = destinationPoint(
    options.longitude,
    options.latitude,
    (options.bearing + 180) % 360,
    geom.groundDistance / 1000,
  );
  const samples = losSamplePoints(
    behind,
    { lng: options.longitude, lat: options.latitude },
    8,
  ).map((point) => ({
    t: point.t,
    ele: options.elevationAt(point.lng, point.lat),
  }));
  return lineOfSightExtraHeight(geom.cameraHeight, options.targetEle, samples);
}

export function valleyBearingOffset(
  lng: number,
  lat: number,
  travelBearing: number,
  elevationAt: (lng: number, lat: number) => number,
  sampleKm = 0.38,
): number {
  const left = destinationPoint(lng, lat, (travelBearing + 270) % 360, sampleKm);
  const right = destinationPoint(lng, lat, (travelBearing + 90) % 360, sampleKm);
  const leftEle = elevationAt(left.lng, left.lat);
  const rightEle = elevationAt(right.lng, right.lat);
  const relief = Math.max(50, Math.abs(leftEle - rightEle));
  return clamp(((rightEle - leftEle) / relief) * 22, -MAX_VALLEY_OFFSET_DEG, MAX_VALLEY_OFFSET_DEG);
}

function cameraForHeight(
  desiredPitch: number,
  desiredZoom: number,
  latitude: number,
  viewportHeight: number,
  neededHeight: number,
): { pitch: number; zoom: number } {
  const geom = cameraGeometry(desiredZoom, desiredPitch, latitude, viewportHeight);
  const minPitchRad = (CLEARANCE_MIN_PITCH * Math.PI) / 180;
  if (neededHeight <= geom.viewDistance * Math.cos(minPitchRad) && neededHeight < geom.viewDistance) {
    const pitch = Math.max(
      CLEARANCE_MIN_PITCH,
      Math.min(desiredPitch, (Math.acos(neededHeight / geom.viewDistance) * 180) / Math.PI),
    );
    return { pitch, zoom: desiredZoom };
  }

  const neededView = neededHeight / Math.max(0.18, Math.cos(minPitchRad));
  const zoomDelta = Math.log2(Math.max(1.02, neededView / geom.viewDistance));
  return {
    pitch: CLEARANCE_MIN_PITCH,
    zoom: Math.max(CLEARANCE_MIN_ZOOM, desiredZoom - Math.min(0.9, zoomDelta)),
  };
}

export function resolveFollowCamera(options: {
  travelBearing: number;
  pathUpBearing?: number;
  desiredPitch: number;
  desiredZoom: number;
  latitude: number;
  longitude: number;
  targetEle: number;
  viewportHeight: number;
  elevationAt: (lng: number, lat: number) => number;
}): { bearing: number; pitch: number; zoom: number } {
  const pathUp = options.pathUpBearing ?? options.travelBearing;
  let bearing = lerpAngle(options.travelBearing, pathUp, 0.74);
  const valley = valleyBearingOffset(
    options.longitude,
    options.latitude,
    bearing,
    options.elevationAt,
  );
  bearing = (bearing + valley + 360) % 360;

  const extraAt = (nextBearing: number, pitch: number, zoom: number) =>
    losExtraForPose({
      longitude: options.longitude,
      latitude: options.latitude,
      bearing: nextBearing,
      pitch,
      zoom,
      targetEle: options.targetEle,
      viewportHeight: options.viewportHeight,
      elevationAt: options.elevationAt,
    });

  let pitch = options.desiredPitch;
  let zoom = options.desiredZoom;
  let extra = extraAt(bearing, pitch, zoom);

  if (extra > 0) {
    const sign = valley === 0 ? 1 : Math.sign(valley);
    for (const bump of [8, 16, 24]) {
      const trial = (bearing + sign * bump + 360) % 360;
      const trialExtra = extraAt(trial, pitch, zoom);
      if (trialExtra < extra) {
        extra = trialExtra;
        bearing = trial;
      }
      if (extra <= 0) break;
    }
  }

  if (extra > 0) {
    const geom = cameraGeometry(zoom, pitch, options.latitude, options.viewportHeight);
    const lifted = cameraForHeight(
      pitch,
      zoom,
      options.latitude,
      options.viewportHeight,
      geom.cameraHeight + extra * 1.12,
    );
    pitch = lifted.pitch;
    zoom = Math.min(options.desiredZoom, lifted.zoom);
  }

  return {
    bearing,
    pitch,
    zoom: Math.min(options.desiredZoom, zoom),
  };
}

export function resolveClearanceCamera(options: {
  desiredPitch: number;
  desiredZoom: number;
  latitude: number;
  longitude: number;
  bearing: number;
  targetEle: number;
  viewportHeight: number;
  elevationAt: (lng: number, lat: number) => number;
}): { pitch: number; zoom: number; bearing: number } {
  return resolveFollowCamera({
    ...options,
    travelBearing: options.bearing,
  });
}
