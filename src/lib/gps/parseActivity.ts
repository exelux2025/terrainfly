import type { Activity, ActivityFormat } from "@/types/activity";
import { parseFit } from "./parseFit";
import { parseGpx } from "./parseGpx";
import { parseTcx } from "./parseTcx";

function formatFromName(fileName: string): ActivityFormat {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "fit" || ext === "gpx" || ext === "tcx") return ext;
  throw new Error("Upload a .fit, .gpx, or .tcx file.");
}

export async function parseActivityFile(file: File): Promise<Activity> {
  const format = formatFromName(file.name);
  const buffer = await file.arrayBuffer();

  if (format === "fit") {
    return parseFit(buffer, file.name);
  }

  const xml = new TextDecoder().decode(buffer);
  if (format === "gpx") return parseGpx(xml, file.name);
  return parseTcx(xml, file.name);
}

export async function parseActivityBuffer(
  fileName: string,
  buffer: ArrayBuffer,
): Promise<Activity> {
  const file = new File([buffer], fileName);
  return parseActivityFile(file);
}
