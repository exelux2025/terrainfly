import { describe, expect, it } from "vitest";
import {
  pathNetworkCollection,
  pathRemainingCollection,
  pathTraveledCollection,
  simplifyTrack,
} from "@/lib/terrain/pathGeometry";
import type { Activity, LngLatEle } from "@/types/activity";

function activity(name: string, coordinates: LngLatEle[]): Activity {
  return {
    name,
    sourceFormat: "gpx",
    coordinates,
    timestamps: [1, 2],
    stats: {
      distanceKm: 1,
      durationSec: 60,
      elevationGainM: 10,
      pointCount: coordinates.length,
    },
  };
}

describe("path geometry", () => {
  it("keeps first and last points when simplifying", () => {
    const coords: LngLatEle[] = Array.from({ length: 20 }, (_, i) => [i, 0, i]);
    const simplified = simplifyTrack(coords, 5);
    expect(simplified[0]).toEqual(coords[0]);
    expect(simplified[simplified.length - 1]).toEqual(coords[coords.length - 1]);
    expect(simplified.length).toBeLessThanOrEqual(6);
  });

  it("draws every chapter in order on the persistent network", () => {
    const segments = [
      activity("A", [
        [0, 0, 10],
        [0.01, 0, 20],
      ]),
      activity("B", [
        [0.02, 0, 20],
        [0.03, 0, 30],
      ]),
      activity("C", [
        [0.04, 0, 30],
        [0.05, 0, 40],
      ]),
    ];
    const network = pathNetworkCollection(segments);
    expect(network.features.map((feature) => feature.properties.chapter)).toEqual([0, 1, 2]);
  });

  it("keeps completed chapters while trimming the current one", () => {
    const segments = [
      activity("A", [
        [0, 0, 10],
        [0.02, 0, 20],
      ]),
      activity("B", [
        [0.03, 0, 20],
        [0.04, 0, 25],
        [0.05, 0, 30],
      ]),
    ];
    const traveled = pathTraveledCollection(segments, 1, 0.5);
    expect(traveled.features).toHaveLength(2);
    expect(traveled.features[0].properties.chapter).toBe(0);
    expect(traveled.features[1].properties.chapter).toBe(1);
    const current = traveled.features[1].geometry.coordinates;
    expect(current[0][0]).toBeCloseTo(0.03);
    expect(current[current.length - 1][0]).toBeGreaterThan(0.03);
    expect(current[current.length - 1][0]).toBeLessThan(0.05);
  });

  it("shows only the remaining chapters as ghost", () => {
    const segments = [
      activity("A", [
        [0, 0, 10],
        [0.02, 0, 20],
      ]),
      activity("B", [
        [0.03, 0, 20],
        [0.05, 0, 30],
      ]),
      activity("C", [
        [0.06, 0, 30],
        [0.08, 0, 40],
      ]),
    ];
    const remaining = pathRemainingCollection(segments, 1, 0.5);
    expect(remaining.features.map((feature) => feature.properties.chapter)).toEqual([1, 2]);
    expect(remaining.features[0].geometry.coordinates[0][0]).toBeGreaterThan(0.03);
  });
});
