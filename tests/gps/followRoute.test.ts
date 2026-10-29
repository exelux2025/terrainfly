import { describe, expect, it } from "vitest";
import {
  cumulativeDistancesKm,
  sampleAlongRoute,
} from "@/lib/animation/followRoute";
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
});
