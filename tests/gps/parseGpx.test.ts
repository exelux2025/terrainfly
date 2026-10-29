import { describe, expect, it } from "vitest";
import { parseGpx } from "@/lib/gps/parseGpx";
import { parseTcx } from "@/lib/gps/parseTcx";

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="terrainfly-test">
  <trk>
    <name>Equator test</name>
    <trkseg>
      <trkpt lat="0.1" lon="10">
        <ele>10</ele>
        <time>2024-01-01T00:00:00Z</time>
      </trkpt>
      <trkpt lat="0.1" lon="10.01">
        <ele>20</ele>
        <time>2024-01-01T00:10:00Z</time>
      </trkpt>
      <trkpt lat="0.1" lon="10.02">
        <ele>15</ele>
        <time>2024-01-01T00:20:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

const SAMPLE_TCX = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase>
  <Activities>
    <Activity>
      <Id>test</Id>
      <Lap>
        <Track>
          <Trackpoint>
            <Time>2024-01-01T00:00:00Z</Time>
            <Position>
              <LatitudeDegrees>0.1</LatitudeDegrees>
              <LongitudeDegrees>10</LongitudeDegrees>
            </Position>
            <AltitudeMeters>10</AltitudeMeters>
          </Trackpoint>
          <Trackpoint>
            <Time>2024-01-01T00:10:00Z</Time>
            <Position>
              <LatitudeDegrees>0.1</LatitudeDegrees>
              <LongitudeDegrees>10.01</LongitudeDegrees>
            </Position>
            <AltitudeMeters>25</AltitudeMeters>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

describe("parseGpx", () => {
  it("extracts coordinates, duration, gain, and distance", () => {
    const activity = parseGpx(SAMPLE_GPX, "test.gpx");
    expect(activity.sourceFormat).toBe("gpx");
    expect(activity.name).toBe("Equator test");
    expect(activity.coordinates).toHaveLength(3);
    expect(activity.stats.durationSec).toBe(20 * 60);
    expect(activity.stats.elevationGainM).toBeCloseTo(10, 5);
    expect(activity.stats.distanceKm).toBeGreaterThan(2.1);
    expect(activity.stats.distanceKm).toBeLessThan(2.4);
  });

  it("rejects tracks that are too short", () => {
    expect(() =>
      parseGpx(
        `<gpx><trk><trkseg><trkpt lat="1" lon="1"><ele>1</ele></trkpt></trkseg></trk></gpx>`,
        "short.gpx",
      ),
    ).toThrow(/usable GPS track/i);
  });
});

describe("parseTcx", () => {
  it("reads lat/lng/elevation from trackpoints", () => {
    const activity = parseTcx(SAMPLE_TCX, "test.tcx");
    expect(activity.sourceFormat).toBe("tcx");
    expect(activity.coordinates).toHaveLength(2);
    expect(activity.stats.elevationGainM).toBeCloseTo(15, 5);
    expect(activity.stats.durationSec).toBe(10 * 60);
  });
});
