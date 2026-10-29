import path from "node:path";
import { connection } from "next/server";
import { listTrackFiles, readTrackFile, trackResponse } from "@/lib/server/localTracks";

export async function GET() {
  await connection();
  const dir = path.join(process.cwd(), "samples");
  const files = await listTrackFiles(dir);
  const fileName = files[0];
  if (!fileName) {
    return new Response(
      "No local sample found. Put a .gpx, .fit, or .tcx file in the samples folder.",
      { status: 404 },
    );
  }

  const data = await readTrackFile(dir, fileName);
  return trackResponse(fileName, data);
}
