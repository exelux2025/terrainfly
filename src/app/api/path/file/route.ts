import path from "node:path";
import { connection } from "next/server";
import { readTrackFile, trackResponse } from "@/lib/server/localTracks";

export async function GET(request: Request) {
  await connection();
  const fileName = new URL(request.url).searchParams.get("name") ?? "";
  if (!fileName) {
    return new Response("Missing file name", { status: 400 });
  }

  try {
    const data = await readTrackFile(path.join(process.cwd(), "samples", "path"), fileName);
    return trackResponse(fileName, data);
  } catch {
    return new Response("Path track not found", { status: 404 });
  }
}
