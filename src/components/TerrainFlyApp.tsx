"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CustomizePanel } from "@/components/CustomizePanel/CustomizePanel";
import { FileUploader } from "@/components/FileUploader/FileUploader";
import { LookPicker } from "@/components/LookPicker/LookPicker";
import {
  PlaybackControls,
  type PlaybackSpeed,
} from "@/components/PlaybackControls/PlaybackControls";
import { TerrainViewer } from "@/components/TerrainViewer/TerrainViewer";
import { DEFAULT_PITCH } from "@/lib/animation/followRoute";
import { parseActivityBuffer, parseActivityFile } from "@/lib/gps/parseActivity";
import {
  buildPathSequence,
  chapterDurationMs,
  localToGlobal,
  segmentWindow,
  type PathSequence,
} from "@/lib/gps/sequence";
import {
  DEFAULT_LOOK_ID,
  DEFAULT_ROUTE_COLOR,
  LOOKS,
  getLook,
  getRoutePalette,
  type RouteColorId,
  type TerrainLookId,
} from "@/lib/terrain/looks";
import { PathStack, samplePathFrame, samplePathFrameFromSequence } from "@/path";
import type { Activity } from "@/types/activity";

export function TerrainFlyApp() {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [sequence, setSequence] = useState<PathSequence | null>(null);
  const [lookId, setLookId] = useState<TerrainLookId>(DEFAULT_LOOK_ID);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [progress, setProgress] = useState(0);
  const [seekNonce, setSeekNonce] = useState(0);
  const [zoom, setZoom] = useState(14.2);
  const [pitch, setPitch] = useState(DEFAULT_PITCH);
  const [exaggeration, setExaggeration] = useState(LOOKS[DEFAULT_LOOK_ID].exaggeration);
  const [brightness, setBrightness] = useState(LOOKS[DEFAULT_LOOK_ID].brightness);
  const [routeColor, setRouteColor] = useState<RouteColorId>(DEFAULT_ROUTE_COLOR);
  const [showMapLabels, setShowMapLabels] = useState(LOOKS[DEFAULT_LOOK_ID].showMapLabels);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const palette = getRoutePalette(routeColor);
  const hideChrome = playing && !chromeVisible && !customizeOpen;
  const viewing = sequence ? segmentWindow(sequence, progress) : null;
  const viewerActivity = viewing?.segment ?? activity;
  const viewerProgress = viewing?.localProgress ?? progress;
  const pathFrame = sequence
    ? samplePathFrameFromSequence(sequence, progress)
    : activity
      ? samplePathFrame(activity, progress)
      : null;
  const sequenceRef = useRef(sequence);
  const viewingIndexRef = useRef(0);
  useEffect(() => {
    sequenceRef.current = sequence;
    viewingIndexRef.current = viewing?.index ?? 0;
  });

  const resetPlayback = useCallback(() => {
    setPlaying(false);
    setProgress(0);
  }, []);

  const applyLookDefaults = useCallback((id: TerrainLookId) => {
    const look = getLook(id);
    setLookId(id);
    setExaggeration(look.exaggeration);
    setBrightness(look.brightness);
    setShowMapLabels(look.showMapLabels);
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const parsed = await parseActivityFile(file);
        setSequence(null);
        setActivity(parsed);
        resetPlayback();
      } catch (caught) {
        setSequence(null);
        setActivity(null);
        resetPlayback();
        setError(caught instanceof Error ? caught.message : "Could not parse that file.");
      } finally {
        setBusy(false);
      }
    },
    [resetPlayback],
  );

  const loadSample = useCallback(async () => {
    setBusy(true);
    setError(null);
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
      setSequence(null);
      setActivity(parsed);
      resetPlayback();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load sample.");
    } finally {
      setBusy(false);
    }
  }, [resetPlayback]);

  const loadPath = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const list = await fetch("/api/path");
      if (!list.ok) {
        throw new Error(
          "No local path found. Put .gpx or .fit files in the samples/path folder.",
        );
      }
      const payload = (await list.json()) as { files?: string[] };
      const files = payload.files ?? [];
      if (files.length === 0) {
        throw new Error("The samples/path folder is empty.");
      }

      const parsed = await Promise.all(
        files.map(async (fileName) => {
          const response = await fetch(`/api/path/file?name=${encodeURIComponent(fileName)}`);
          if (!response.ok) {
            throw new Error(`Could not read ${fileName}.`);
          }
          return parseActivityBuffer(fileName, await response.arrayBuffer());
        }),
      );

      const next = buildPathSequence(parsed);
      setSequence(next);
      setActivity(next.segments[0]);
      resetPlayback();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load path.");
    } finally {
      setBusy(false);
    }
  }, [resetPlayback]);

  useEffect(() => {
    if (!playing || customizeOpen) return;
    let timer = window.setTimeout(() => setChromeVisible(false), 2000);
    const reveal = () => {
      setChromeVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setChromeVisible(false), 2000);
    };
    window.addEventListener("mousemove", reveal);
    window.addEventListener("touchstart", reveal);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", reveal);
      window.removeEventListener("touchstart", reveal);
    };
  }, [playing, customizeOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)) {
        return;
      }
      if (!activity || busy) return;
      event.preventDefault();
      if (!playing && progress >= 0.995) {
        setProgress(0);
        setSeekNonce((value) => value + 1);
      }
      setChromeVisible(true);
      setPlaying((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activity, busy, playing, progress]);

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden bg-zinc-950 ${
        hideChrome ? "cinema-playing" : ""
      }`}
    >
      <TerrainViewer
        activity={viewerActivity}
        pathSequence={sequence}
        lookId={lookId}
        playing={playing}
        speed={speed}
        progress={viewerProgress}
        seekNonce={seekNonce}
        zoom={zoom}
        pitch={pitch}
        exaggeration={exaggeration}
        brightness={brightness}
        showMapLabels={showMapLabels}
        routeColor={routeColor}
        durationMs={
          sequence && viewing ? chapterDurationMs(sequence, viewing.index) : undefined
        }
        fitOnActivityChange={!playing || !sequence}
        onProgress={(local) => {
          const seq = sequenceRef.current;
          if (!seq) {
            setProgress(local);
            return;
          }
          setProgress(localToGlobal(seq, viewingIndexRef.current, local));
        }}
        onEnded={() => {
          const seq = sequenceRef.current;
          if (seq && viewingIndexRef.current < seq.segments.length - 1) {
            setProgress(localToGlobal(seq, viewingIndexRef.current + 1, 0));
            setSeekNonce((value) => value + 1);
            return;
          }
          setPlaying(false);
        }}
      />

      <header className="absolute top-4 left-4 z-20">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-orange-300 drop-shadow">
          TerrainFly
        </p>
      </header>

      {pathFrame ? <PathStack frame={pathFrame} accent={palette.line} /> : null}

      {!activity ? (
        <aside className="absolute top-12 left-4 z-10 w-[min(100%-2rem,22rem)] rounded-2xl border border-white/10 bg-zinc-950/72 p-4 text-zinc-100 shadow-2xl backdrop-blur-md">
          <h1 className="text-lg font-semibold">Cinematic 3D flyover</h1>
          <p className="mt-1 mb-3 text-xs text-zinc-400">
            Drop a GPS track, pick a look, and fly the mountains.
          </p>
          <FileUploader
            busy={busy}
            error={error}
            onFile={(file) => void loadFile(file)}
            onSample={() => void loadSample()}
            onPath={() => void loadPath()}
          />
        </aside>
      ) : (
        <div
          className={`absolute top-12 left-4 z-20 transition-opacity duration-300 ${
            hideChrome ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <FileUploader
            busy={busy}
            error={error}
            compact
            onFile={(file) => void loadFile(file)}
            onSample={() => void loadSample()}
            onPath={() => void loadPath()}
          />
        </div>
      )}

      {!activity ? (
        <div className="absolute top-12 right-4 z-20 w-44">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/62 p-2 shadow-2xl backdrop-blur-md">
            <LookPicker value={lookId} onChange={applyLookDefaults} />
          </div>
        </div>
      ) : null}

      <div
        className={`absolute right-4 bottom-4 left-4 z-20 mx-auto max-w-xl transition-opacity duration-300 sm:right-auto sm:left-4 ${
          hideChrome ? "opacity-80" : "opacity-100"
        }`}
      >
        {customizeOpen && activity ? (
          <div className="mb-3">
            <CustomizePanel
              lookId={lookId}
              exaggeration={exaggeration}
              brightness={brightness}
              routeColor={routeColor}
              showMapLabels={showMapLabels}
              zoom={zoom}
              pitch={pitch}
              onExaggeration={setExaggeration}
              onBrightness={setBrightness}
              onRouteColor={setRouteColor}
              onShowMapLabels={setShowMapLabels}
              onZoom={setZoom}
              onPitch={setPitch}
              onLookChange={applyLookDefaults}
              onReset={() => applyLookDefaults(lookId)}
              onClose={() => setCustomizeOpen(false)}
            />
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-zinc-950/72 px-4 py-3 shadow-2xl backdrop-blur-md">
          <PlaybackControls
            enabled={Boolean(viewerActivity) && !busy}
            playing={playing}
            speed={speed}
            progress={progress}
            distanceKm={sequence?.stats.distanceKm ?? activity?.stats.distanceKm ?? 0}
            accent={palette.line}
            variant={hideChrome ? "mini" : "full"}
            customizeOpen={customizeOpen}
            onToggle={() => {
              if (!playing && progress >= 0.995) {
                setProgress(0);
                setSeekNonce((value) => value + 1);
              }
              setChromeVisible(true);
              setPlaying((value) => !value);
            }}
            onSpeed={setSpeed}
            onSeek={(next) => {
              setProgress(next);
              setSeekNonce((value) => value + 1);
            }}
            onCustomize={() => setCustomizeOpen((value) => !value)}
          />
        </div>
      </div>
    </div>
  );
}
