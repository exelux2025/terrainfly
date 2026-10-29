import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const TRACK_EXTENSIONS = new Set([".gpx", ".fit", ".tcx"]);

export function trackContentType(fileName: string): string {
  return path.extname(fileName).toLowerCase() === ".fit"
    ? "application/octet-stream"
    : "application/gpx+xml";
}

export async function listTrackFiles(dir: string): Promise<string[]> {
  let entries: Array<{ name: string; isFile: () => boolean }>;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter(
      (entry) =>
        entry.isFile() && TRACK_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export async function readTrackFile(dir: string, fileName: string): Promise<Buffer> {
  const base = path.basename(fileName);
  if (base !== fileName || base.includes("..")) {
    throw new Error("Invalid track file name.");
  }
  const files = await listTrackFiles(dir);
  if (!files.includes(base)) {
    throw new Error("Track file not found.");
  }
  return readFile(path.join(dir, base));
}

export function trackResponse(fileName: string, data: Buffer): Response {
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": trackContentType(fileName),
      "Content-Disposition": `inline; filename="${fileName}"`,
      "X-Sample-Filename": fileName,
      "Cache-Control": "no-store",
    },
  });
}
