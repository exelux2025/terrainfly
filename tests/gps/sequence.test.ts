import { describe, expect, it } from "vitest";
import {
  buildPathSequence,
  localToGlobal,
  segmentWindow,
} from "@/lib/gps/sequence";
import type { Activity } from "@/types/activity";

function activity(name: string, startMs: number, distanceKm: number, gain: number): Activity {
  return {
    name,
    sourceFormat: "gpx",
    coordinates: [
      [116.4, -8.4, 1000],
      [116.4 + distanceKm * 0.01, -8.4, 1000 + gain],
    ],
    timestamps: [startMs, startMs + 60_000],
    stats: {
      distanceKm,
      durationSec: 60,
      elevationGainM: gain,
      pointCount: 2,
    },
  };
}

describe("path sequence", () => {
  it("sorts segments by start time without merging files", () => {
    const sequence = buildPathSequence([
      activity("North", 2_000, 3, 40),
      activity("East", 1_000, 2, 10),
    ]);
    expect(sequence.segments.map((item) => item.name)).toEqual(["East", "North"]);
    expect(sequence.stats.distanceKm).toBe(5);
    expect(sequence.stats.elevationGainM).toBe(50);
    expect(sequence.profile).toHaveLength(48);
  });

  it("maps a continuous 0–1 clock onto the current chapter", () => {
    const sequence = buildPathSequence([
      activity("A", 1, 2, 10),
      activity("B", 2, 2, 10),
    ]);
    const first = segmentWindow(sequence, 0.25);
    const second = segmentWindow(sequence, 0.75);
    expect(first.segment.name).toBe("A");
    expect(second.segment.name).toBe("B");
    expect(localToGlobal(sequence, 1, 0)).toBeCloseTo(0.5);
  });

  it("keeps later chapters after the clock moves on", () => {
    const sequence = buildPathSequence([
      activity("A", 1, 2, 10),
      activity("B", 2, 2, 10),
      activity("C", 3, 2, 10),
    ]);
    expect(sequence.segments.map((item) => item.name)).toEqual(["A", "B", "C"]);
    expect(segmentWindow(sequence, 0.9).segment.name).toBe("C");
    expect(sequence.segments).toHaveLength(3);
  });
});
