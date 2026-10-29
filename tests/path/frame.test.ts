import { describe, expect, it } from "vitest";
import { buildPathSequence } from "@/lib/gps/sequence";
import { samplePathFrame, samplePathFrameFromSequence } from "@/path/frame";
import { PATH_SLOTS } from "@/path/types";
import type { Activity } from "@/types/activity";

const activity: Activity = {
  name: "Ridge test",
  sourceFormat: "gpx",
  coordinates: [
    [116.4, -8.4, 1000],
    [116.41, -8.4, 1200],
    [116.42, -8.4, 1100],
  ],
  timestamps: [0, 600_000, 1_200_000],
  stats: {
    distanceKm: 2.2,
    durationSec: 1200,
    elevationGainM: 200,
    pointCount: 3,
  },
};

describe("path video frame", () => {
  it("keeps a stable slot list for continuous capture", () => {
    expect(PATH_SLOTS).toEqual([
      "title",
      "distance",
      "duration",
      "elevation",
      "gain",
      "profile",
      "progress",
    ]);
  });

  it("samples continuously from progress instead of merging files", () => {
    const start = samplePathFrame(activity, 0);
    const mid = samplePathFrame(activity, 0.5);
    const end = samplePathFrame(activity, 1);

    expect(start.name).toBe("Ridge test");
    expect(start.traveledKm).toBeLessThan(mid.traveledKm);
    expect(mid.traveledKm).toBeLessThan(end.traveledKm);
    expect(end.t).toBe(1);
    expect(end.elevationM).toBeCloseTo(1100, 0);
    expect(mid.gainToHereM).toBeGreaterThan(start.gainToHereM);
    expect(mid.profile).toHaveLength(48);
    expect(end.profileIndex).toBe(47);
  });

  it("keeps a continuous clock across separate path files", () => {
    const second: Activity = {
      ...activity,
      name: "Ridge two",
      timestamps: [2_000_000, 2_600_000, 3_200_000],
      stats: { ...activity.stats, distanceKm: 2.2, elevationGainM: 80 },
    };
    const sequence = buildPathSequence([activity, second]);
    const frame = samplePathFrameFromSequence(sequence, 0.75);
    expect(frame.chapter).toBe("Path 2 / 2");
    expect(frame.name).toBe("Ridge two");
    expect(frame.totalKm).toBeCloseTo(4.4);
    expect(frame.traveledKm).toBeGreaterThan(2.2);
  });
});
