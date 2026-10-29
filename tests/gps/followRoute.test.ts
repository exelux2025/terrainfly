import { describe, expect, it } from "vitest";
import {
  cameraGeometry,
  cumulativeDistancesKm,
  lerpAngle,
  lineOfSightExtraHeight,
  pathUpBearing,
  resolveClearanceCamera,
  resolveFollowCamera,
  sampleAlongRoute,
  shortestAngleDelta,
  sliceRoute,
  sliceRouteAhead,
  turnSlowdown,
  valleyBearingOffset,
} from "@/lib/animation/followRoute";
import { destinationPoint } from "@/lib/gps/geo";
import type { LngLatEle } from "@/types/activity";

const coords: LngLatEle[] = [
  [0, 0, 10],
  [0.01, 0, 20],
  [0.02, 0, 15],
];

describe("followRoute", () => {
  it("accumulates distance and interpolates along the line", () => {
    const distances = cumulativeDistancesKm(coords);
    expect(distances[0]).toBe(0);
    expect(distances[2]).toBeGreaterThan(2.1);

    const start = sampleAlongRoute(coords, distances, 0);
    expect(start.lng).toBeCloseTo(0);
    expect(start.lat).toBeCloseTo(0);

    const mid = sampleAlongRoute(coords, distances, distances[2] / 2);
    expect(mid.lng).toBeGreaterThan(0.004);
    expect(mid.lng).toBeLessThan(0.016);
  });

  it("lerps bearings across 0 degrees", () => {
    expect(shortestAngleDelta(350, 10)).toBeCloseTo(20);
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(0);
  });

  it("slows down more on sharper heading errors", () => {
    expect(turnSlowdown(10)).toBeGreaterThan(turnSlowdown(90));
    expect(turnSlowdown(0)).toBeCloseTo(1);
  });

  it("slices the route up to the current distance", () => {
    const distances = cumulativeDistancesKm(coords);
    const sliced = sliceRoute(coords, distances, distances[2] / 2);
    expect(sliced.length).toBeGreaterThanOrEqual(2);
    expect(sliced[0][0]).toBeCloseTo(0);
    expect(sliced[sliced.length - 1][0]).toBeGreaterThan(0.004);
    expect(sliced[sliced.length - 1][0]).toBeLessThan(0.016);
  });
});

describe("camera clearance", () => {
  it("places a destination along a bearing", () => {
    const north = destinationPoint(116.47, -8.41, 0, 1);
    expect(north.lat).toBeGreaterThan(-8.41);
    expect(north.lng).toBeCloseTo(116.47, 2);
  });

  it("flags a ridge that sticks through the line of sight", () => {
    const geom = cameraGeometry(14.2, 62, -8.41);
    const targetEle = 2000;
    const extra = lineOfSightExtraHeight(geom.cameraHeight, targetEle, [
      { t: 0.45, ele: targetEle + geom.cameraHeight * 0.7 },
    ]);
    expect(extra).toBeGreaterThan(80);
  });

  it("stays clear when samples sit below the sight line", () => {
    const geom = cameraGeometry(14.2, 62, -8.41);
    const targetEle = 2000;
    const extra = lineOfSightExtraHeight(
      geom.cameraHeight,
      targetEle,
      [0.25, 0.5, 0.75].map((t) => ({
        t,
        ele: targetEle + geom.cameraHeight * (1 - t) * 0.15,
      })),
    );
    expect(extra).toBe(0);
  });

  it("lowers pitch to look over a mountain between camera and point", () => {
    const target = { lng: 116.47, lat: -8.41, ele: 2100 };
    const cleared = resolveClearanceCamera({
      desiredPitch: 68,
      desiredZoom: 14.4,
      latitude: target.lat,
      longitude: target.lng,
      bearing: 15,
      targetEle: target.ele,
      viewportHeight: 800,
      elevationAt: (lng, lat) => {
        const dLat = lat - target.lat;
        if (dLat < -0.002 && dLat > -0.02) return 3600;
        return target.ele;
      },
    });
    expect(cleared.pitch).toBeLessThan(68);
  });

  it("shifts the camera toward the lower side of the mountain", () => {
    const offset = valleyBearingOffset(116.47, -8.41, 0, (lng) => (lng < 116.47 ? 1200 : 2800));
    expect(offset).toBeGreaterThan(6);
    const follow = resolveFollowCamera({
      travelBearing: 0,
      desiredPitch: 62,
      desiredZoom: 14,
      latitude: -8.41,
      longitude: 116.47,
      targetEle: 2000,
      viewportHeight: 800,
      elevationAt: (lng) => (lng < 116.47 ? 1200 : 2800),
    });
    expect(shortestAngleDelta(0, follow.bearing)).toBeGreaterThan(4);
  });

  it("does not zoom in past the user's zoom", () => {
    const follow = resolveFollowCamera({
      travelBearing: 15,
      desiredPitch: 62,
      desiredZoom: 12.1,
      latitude: -8.41,
      longitude: 116.47,
      targetEle: 2100,
      viewportHeight: 800,
      elevationAt: () => 2100,
    });
    expect(follow.zoom).toBeLessThanOrEqual(12.1);
  });

  it("aims along the trail behind the rider", () => {
    const line: LngLatEle[] = [
      [116.46, -8.42, 1800],
      [116.47, -8.41, 2000],
      [116.48, -8.4, 2100],
    ];
    const distances = cumulativeDistancesKm(line);
    const heading = pathUpBearing(line, distances, distances[1], 0.4);
    expect(heading).toBeGreaterThan(20);
    expect(heading).toBeLessThan(70);
  });

  it("keeps the remaining path after the rider", () => {
    const distances = cumulativeDistancesKm(coords);
    const ahead = sliceRouteAhead(coords, distances, distances[2] / 2);
    expect(ahead[0][0]).toBeGreaterThan(0.004);
    expect(ahead[ahead.length - 1][0]).toBeCloseTo(0.02);
  });
});
