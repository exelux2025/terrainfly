import { Decoder, Stream } from "@garmin/fitsdk";
import { semicirclesToDegrees, toEpochMs } from "./geo";
import { normalizeActivity, type TrackPoint } from "./normalizeActivity";
import type { Activity } from "@/types/activity";

type FitRecord = {
  timestamp?: unknown;
  positionLat?: number;
  positionLong?: number;
  altitude?: number;
  enhancedAltitude?: number;
};

export function parseFit(buffer: ArrayBuffer, fileName: string): Activity {
  const stream = Stream.fromArrayBuffer(buffer);
  if (!Decoder.isFIT(stream)) {
    throw new Error("This file is not a Garmin FIT activity.");
  }
  stream.reset();

  const decoder = new Decoder(stream);
  const { messages, errors } = decoder.read();
  if (errors?.length && !messages?.recordMesgs?.length) {
    throw new Error("Could not decode this FIT file.");
  }

  const records = (messages?.recordMesgs ?? []) as FitRecord[];
  const points: TrackPoint[] = [];

  for (const record of records) {
    if (record.positionLat == null || record.positionLong == null) continue;
    const lat = semicirclesToDegrees(record.positionLat);
    const lng = semicirclesToDegrees(record.positionLong);
    const ele = record.enhancedAltitude ?? record.altitude ?? 0;
    points.push({
      lat,
      lng,
      ele: Number.isFinite(ele) ? ele : 0,
      time: toEpochMs(record.timestamp),
    });
  }

  return normalizeActivity(fileName, "fit", points);
}
