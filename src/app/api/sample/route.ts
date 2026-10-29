import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";

const SAMPLE_EXTENSIONS = new Set([".gpx", ".fit", ".tcx"]);

export async function GET() {
  await connection();
  const dir = path.join(process.cwd(), "samples");

  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    return new Response("No samples directory", { status: 404 });
  }

  const fileName = files.find((name) =>
    SAMPLE_EXTENSIONS.has(path.extname(name).toLowerCase()),
  );
  if (!fileName) {
    return new Response("No sample FIT/GPX/TCX file", { status: 404 });
  }

  const filePath = path.join(dir, fileName);
  const data = await readFile(filePath);
  const ext = path.extname(fileName).toLowerCase();
  const contentType =
    ext === "fit" ? "application/octet-stream" : "application/gpx+xml";

  return new Response(data, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${fileName}"`,
      "X-Sample-Filename": fileName,
      "Cache-Control": "no-store",
    },
  });
}
