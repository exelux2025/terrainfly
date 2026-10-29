import { toEpochMs } from "./geo";
import { normalizeActivity, type TrackPoint } from "./normalizeActivity";
import type { Activity } from "@/types/activity";

function childText(el: Element, tag: string): string | null {
  const match = el.getElementsByTagName(tag)[0];
  return match?.textContent?.trim() || null;
}

export function parseTcx(xml: string, fileName: string): Activity {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Could not parse this TCX file.");
  }

  const points: TrackPoint[] = [];
  for (const node of Array.from(doc.getElementsByTagName("Trackpoint"))) {
    const latRaw = childText(node, "LatitudeDegrees");
    const lngRaw = childText(node, "LongitudeDegrees");
    if (latRaw == null || lngRaw == null) continue;
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    const eleRaw = childText(node, "AltitudeMeters");
    const ele = eleRaw != null ? Number(eleRaw) : 0;
    points.push({
      lat,
      lng,
      ele: Number.isFinite(ele) ? ele : 0,
      time: toEpochMs(childText(node, "Time")),
    });
  }

  const name =
    doc.getElementsByTagName("Name")[0]?.textContent?.trim() || fileName;
  return normalizeActivity(name, "tcx", points);
}
