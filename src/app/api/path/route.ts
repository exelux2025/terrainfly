import path from "node:path";
import { connection } from "next/server";
import { listTrackFiles } from "@/lib/server/localTracks";

export async function GET() {
  await connection();
  const dir = path.join(process.cwd(), "samples", "path");
  const files = await listTrackFiles(dir);
  if (files.length === 0) {
    return new Response(
      JSON.stringify({
        error: "No local path found. Put .gpx, .fit, or .tcx files in samples/path.",
        files: [],
      }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  return Response.json({ files });
}
