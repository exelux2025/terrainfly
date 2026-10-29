"use client";

import { useCallback, useState } from "react";
import { FileUploader } from "@/components/FileUploader/FileUploader";
import {
  PlaybackControls,
  type PlaybackSpeed,
} from "@/components/PlaybackControls/PlaybackControls";
import { StatsOverlay } from "@/components/RouteOverlay/StatsOverlay";
import { TerrainViewer } from "@/components/TerrainViewer/TerrainViewer";
import { parseActivityBuffer, parseActivityFile } from "@/lib/gps/parseActivity";
import type { TerrainStyleId } from "@/lib/terrain/mapbox";
import type { Activity } from "@/types/activity";

export function TerrainFlyApp() {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [style, setStyle] = useState<TerrainStyleId>("satellite");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    setPlaying(false);
    try {
      const parsed = await parseActivityFile(file);
      setActivity(parsed);
    } catch (caught) {
      setActivity(null);
      setError(caught instanceof Error ? caught.message : "Could not parse that file.");
    } finally {
      setBusy(false);
    }
  }, []);

  const loadSample = useCallback(async () => {
    setBusy(true);
    setError(null);
    setPlaying(false);
    try {
      const response = await fetch("/api/sample");
      if (!response.ok) {
        throw new Error(
          "No local sample found. Put a .gpx or .fit file in the samples folder.",
        );
      }
      const buffer = await response.arrayBuffer();
      const fileName =
        response.headers.get("X-Sample-Filename") || "sample.gpx";
      const parsed = await parseActivityBuffer(fileName, buffer);
      setActivity(parsed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load sample.");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      <TerrainViewer
        activity={activity}
        style={style}
        playing={playing}
        speed={speed}
        onEnded={() => setPlaying(false)}
      />

      <aside className="absolute top-4 left-4 z-10 w-[min(100%-2rem,22rem)] rounded-2xl border border-white/10 bg-zinc-950/75 p-4 text-zinc-100 shadow-2xl backdrop-blur-md">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-orange-300">
          TerrainFly
        </p>
        <h1 className="mt-1 text-lg font-semibold">3D route viewer</h1>
        <p className="mt-1 mb-3 text-xs text-zinc-400">
          {activity ? activity.name : "V1 prototype — GPS track on Mapbox terrain"}
        </p>
        <FileUploader
          busy={busy}
          error={error}
          onFile={(file) => void loadFile(file)}
          onSample={() => void loadSample()}
        />
        <div className="mt-4">
          <StatsOverlay activity={activity} />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setStyle("satellite")}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
              style === "satellite" ? "bg-orange-500 text-zinc-950" : "bg-white/10"
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setStyle("standard")}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
              style === "standard" ? "bg-orange-500 text-zinc-950" : "bg-white/10"
            }`}
          >
            Standard
          </button>
        </div>
      </aside>

      <div className="absolute right-4 bottom-4 left-4 z-10 mx-auto max-w-xl rounded-2xl border border-white/10 bg-zinc-950/75 px-4 py-3 shadow-2xl backdrop-blur-md sm:right-auto sm:left-4">
        <PlaybackControls
          enabled={Boolean(activity) && !busy}
          playing={playing}
          speed={speed}
          onToggle={() => setPlaying((value) => !value)}
          onSpeed={setSpeed}
        />
      </div>
    </div>
  );
}
