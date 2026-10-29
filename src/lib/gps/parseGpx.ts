import { toEpochMs } from "./geo";
import { normalizeActivity, type TrackPoint } from "./normalizeActivity";
import type { Activity } from "@/types/activity";

function attr(el: Element, name: string): number | null {
  const raw = el.getAttribute(name);
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function childText(el: Element, tag: string): string | null {
  const match = el.getElementsByTagName(tag)[0];
  return match?.textContent?.trim() || null;
}

export function parseGpx(xml: string, fileName: string): Activity {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Could not parse this GPX file.");
  }

  const nodes = [
    ...Array.from(doc.getElementsByTagName("trkpt")),
    ...Array.from(doc.getElementsByTagName("rtept")),
  ];

  const points: TrackPoint[] = [];
  for (const node of nodes) {
    const lat = attr(node, "lat");
    const lon = attr(node, "lon");
    if (lat == null || lon == null) continue;
    const eleRaw = childText(node, "ele");
    const ele = eleRaw != null ? Number(eleRaw) : 0;
    points.push({
      lat,
      lng: lon,
      ele: Number.isFinite(ele) ? ele : 0,
      time: toEpochMs(childText(node, "time")),
    });
  }

  const name =
    doc.getElementsByTagName("name")[0]?.textContent?.trim() || fileName;
  return normalizeActivity(name, "gpx", points);
}
