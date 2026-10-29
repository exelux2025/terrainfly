"use client";

import { useEffect, useRef } from "react";
import type { PlaybackSpeed } from "@/components/PlaybackControls/PlaybackControls";
import {
  FLYOVER_DURATION_MS,
  type CameraPose,
  cameraGeometry,
  cumulativeDistancesKm,
  lookaheadForSpeed,
  nearestElevation,
  pathUpBearing,
  resolveFollowCamera,
  sampleAlongRoute,
  slopeLimitedPitch,
  smoothAngleToward,
  smoothToward,
  turnSlowdown,
} from "@/lib/animation/followRoute";
import type { PathSequence } from "@/lib/gps/sequence";
import { applyLook, enableTerrain } from "@/lib/terrain/atmosphere";
import {
  DEFAULT_LOOK_ID,
  getLook,
  getRoutePalette,
  getStyleUrl,
  type RouteColorId,
  type TerrainLookId,
} from "@/lib/terrain/looks";
import { getMapboxToken } from "@/lib/terrain/mapbox";
import {
  addPersistentPathLayers,
  addRouteLayers,
  applyRouteTheme,
  fitPath,
  fitRoute,
  setPersistentPathProgress,
  setRouteProgress,
  updatePositionMarker,
} from "@/lib/terrain/routeOverlay";
import type { MapboxMap } from "@/lib/terrain/types";
import type { Activity } from "@/types/activity";

type TerrainViewerProps = {
  activity: Activity | null;
  pathSequence?: PathSequence | null;
  lookId: TerrainLookId;
  playing: boolean;
  speed: PlaybackSpeed;
  progress: number;
  seekNonce: number;
  zoom: number;
  pitch: number;
  exaggeration: number;
  brightness: number;
  showMapLabels: boolean;
  routeColor: RouteColorId;
  durationMs?: number;
  fitOnActivityChange?: boolean;
  onProgress: (progress: number) => void;
  onEnded: () => void;
};

export function TerrainViewer({
  activity,
  pathSequence = null,
  lookId,
  playing,
  speed,
  progress,
  seekNonce,
  zoom,
  pitch,
  exaggeration,
  brightness,
  showMapLabels,
  routeColor,
  durationMs = FLYOVER_DURATION_MS,
  fitOnActivityChange = true,
  onProgress,
  onEnded,
}: TerrainViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const lookIdRef = useRef(lookId);
  const activityRef = useRef(activity);
  const pathSequenceRef = useRef(pathSequence);
  const progressKmRef = useRef(0);
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const zoomRef = useRef(zoom);
  const pitchRef = useRef(pitch);
  const exaggerationRef = useRef(exaggeration);
  const brightnessRef = useRef(brightness);
  const showMapLabelsRef = useRef(showMapLabels);
  const routeColorRef = useRef(routeColor);
  const durationMsRef = useRef(durationMs);
  const fitOnActivityChangeRef = useRef(fitOnActivityChange);
  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);
  const poseRef = useRef<CameraPose | null>(null);
  const followZoomRef = useRef<number | null>(null);
  const followPitchRef = useRef<number | null>(null);
  const wasPlayingRef = useRef(false);
  const lastProgressEmitRef = useRef(0);
  const styleUrlRef = useRef(getStyleUrl(lookId));
  const applyRef = useRef<(snap: boolean, dtMs: number) => void>(() => {});
  const paintSceneRef = useRef<() => void>(() => {});

  useEffect(() => {
  lookIdRef.current = lookId;
  activityRef.current = activity;
  pathSequenceRef.current = pathSequence;
  playingRef.current = playing;
  speedRef.current = speed;
  zoomRef.current = zoom;
  pitchRef.current = pitch;
  exaggerationRef.current = exaggeration;
  brightnessRef.current = brightness;
  showMapLabelsRef.current = showMapLabels;
  routeColorRef.current = routeColor;
  durationMsRef.current = durationMs;
  fitOnActivityChangeRef.current = fitOnActivityChange;
  onEndedRef.current = onEnded;
  onProgressRef.current = onProgress;

  applyRef.current = (snap: boolean, dtMs: number) => {
    const map = mapRef.current;
    const current = activityRef.current;
    if (!map || !current) return;

    const distances = cumulativeDistancesKm(current.coordinates);
    const totalKm = distances[distances.length - 1] ?? 0;
    const progressKm = Math.min(Math.max(progressKmRef.current, 0), totalKm);
    const t = totalKm > 0 ? progressKm / totalKm : 0;
    const sample = sampleAlongRoute(
      current.coordinates,
      distances,
      progressKm,
      lookaheadForSpeed(speedRef.current),
    );

    const canvasHeight = map.getCanvas()?.clientHeight || 800;
    const desiredZoom = playingRef.current
      ? (followZoomRef.current ?? map.getZoom())
      : zoomRef.current;
    const desiredPitch = slopeLimitedPitch(
      current.coordinates,
      distances,
      progressKm,
      playingRef.current ? (followPitchRef.current ?? map.getPitch()) : pitchRef.current,
    );
    let targetEle = sample.ele * exaggerationRef.current;
    try {
      const queried = map.queryTerrainElevation([sample.lng, sample.lat], {
        exaggerated: true,
      });
      if (typeof queried === "number" && Number.isFinite(queried)) {
        targetEle = queried;
      }
    } catch {
      // Terrain tiles may not be ready yet.
    }

    const lookbehindKm = Math.min(
      1.15,
      Math.max(
        0.16,
        (cameraGeometry(desiredZoom, desiredPitch, sample.lat, canvasHeight).groundDistance /
          1000) *
          0.46,
      ),
    );
    const follow = resolveFollowCamera({
      travelBearing: sample.bearing,
      pathUpBearing: pathUpBearing(
        current.coordinates,
        distances,
        progressKm,
        lookbehindKm,
      ),
      desiredPitch,
      desiredZoom,
      latitude: sample.lat,
      longitude: sample.lng,
      targetEle,
      viewportHeight: canvasHeight,
      elevationAt: (lng, lat) => {
        try {
          const queried = map.queryTerrainElevation([lng, lat], { exaggerated: true });
          if (typeof queried === "number" && Number.isFinite(queried)) return queried;
        } catch {
          // Fall through to GPS.
        }
        return nearestElevation(current.coordinates, lng, lat) * exaggerationRef.current;
      },
    });

    let pose = poseRef.current;
    if (!pose || snap) {
      pose = {
        lng: sample.lng,
        lat: sample.lat,
        ele: sample.ele,
        bearing: follow.bearing,
        pitch: follow.pitch,
        zoom: follow.zoom,
      };
    } else {
      const headingError = Math.abs(
        ((((follow.bearing - pose.bearing) % 360) + 540) % 360) - 180,
      );
      const tau = 260 + Math.min(520, headingError * 8);
      const lift = follow.pitch < pose.pitch - 0.4 || follow.zoom < pose.zoom - 0.05;
      const verticalTau = lift ? 180 : 560;
      pose = {
        lng: smoothToward(pose.lng, sample.lng, dtMs, 150),
        lat: smoothToward(pose.lat, sample.lat, dtMs, 150),
        ele: smoothToward(pose.ele, sample.ele, dtMs, 170),
        bearing: smoothAngleToward(pose.bearing, follow.bearing, dtMs, tau),
        pitch: smoothToward(pose.pitch, follow.pitch, dtMs, verticalTau),
        zoom: smoothToward(pose.zoom, follow.zoom, dtMs, verticalTau),
      };
    }
    poseRef.current = pose;

    updatePositionMarker(map, [pose.lng, pose.lat, pose.ele]);
    const sequence = pathSequenceRef.current;
    const chapterIndex = sequence ? sequence.segments.indexOf(current) : -1;
    if (sequence && chapterIndex >= 0) {
      setPersistentPathProgress(map, sequence.segments, chapterIndex, t);
    } else {
      setRouteProgress(map, t);
    }

    if (!playingRef.current) {
      if (snap && progressKm > 0.02) {
        map.jumpTo({
          center: [pose.lng, pose.lat],
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: pose.bearing,
        });
      }
      return;
    }

    map.jumpTo({
      center: [pose.lng, pose.lat],
      zoom: pose.zoom,
      pitch: pose.pitch,
      bearing: pose.bearing,
    });
  };

  paintSceneRef.current = () => {
    const map = mapRef.current;
    if (!map) return;
    const look = getLook(lookIdRef.current);
    const sequence = pathSequenceRef.current;
    const current = activityRef.current;
    try {
      enableTerrain(map, exaggerationRef.current);
    } catch {
      // Terrain source may already exist on Standard styles.
    }
    try {
      applyLook(map, look, {
        exaggeration: exaggerationRef.current,
        brightness: brightnessRef.current,
        showMapLabels: showMapLabelsRef.current,
      });
    } catch {
      // Lighting/fog/hillshade are optional per style.
    }
    const palette = getRoutePalette(routeColorRef.current);
    if (sequence) {
      addPersistentPathLayers(map, sequence.segments, {
        standardSlots: look.kind === "standard",
        palette,
      });
      applyRef.current(true, 32);
      if (!playingRef.current && progressKmRef.current <= 0.001) {
        fitPath(map, sequence.segments);
      }
      return;
    }
    if (current) {
      addRouteLayers(map, current, {
        standardSlots: look.kind === "standard",
        palette,
      });
      applyRef.current(true, 32);
      if (!playingRef.current && progressKmRef.current <= 0.001) {
        fitRoute(map, current.coordinates);
      }
    }
  };
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const mountNode: HTMLDivElement = containerRef.current;
    let cancelled = false;
    let map: MapboxMap | null = null;
    let removeStyleListener: (() => void) | undefined;

    async function init() {
      let token: string;
      try {
        token = getMapboxToken();
      } catch (error) {
        mountNode.textContent =
          error instanceof Error ? error.message : "Mapbox token missing.";
        return;
      }

      const mapboxgl = await import("mapbox-gl/esm");
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !containerRef.current) return;

      map = new mapboxgl.Map({
        accessToken: token,
        container: containerRef.current,
        style: getStyleUrl(lookIdRef.current),
        center: [116.47, -8.41],
        zoom: 1.8,
        pitch: 48,
        bearing: 0,
        maxPitch: 85,
        projection: "globe",
        antialias: true,
        fadeDuration: 0,
        attributionControl: true,
      });
      map.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        "bottom-right",
      );
      mapRef.current = map;

      const onStyle = () => {
        paintSceneRef.current();
      };

      map.on("style.load", onStyle);
      removeStyleListener = () => map?.off("style.load", onStyle);
    }

    void init();

    return () => {
      cancelled = true;
      removeStyleListener?.();
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const nextUrl = getStyleUrl(lookId);
    if (nextUrl === styleUrlRef.current) {
      paintSceneRef.current();
      return;
    }
    styleUrlRef.current = nextUrl;
    map.setStyle(nextUrl);
  }, [lookId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    applyLook(map, getLook(lookIdRef.current), {
      exaggeration,
      brightness,
      showMapLabels,
    });
  }, [exaggeration, brightness, showMapLabels]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    applyRouteTheme(map, getRoutePalette(routeColor));
  }, [routeColor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pathSequence) return;
    poseRef.current = null;
    progressKmRef.current = 0;
    const apply = () => {
      const look = getLook(lookIdRef.current);
      addPersistentPathLayers(map, pathSequence.segments, {
        standardSlots: look.kind === "standard",
        palette: getRoutePalette(routeColorRef.current),
      });
      applyRef.current(true, 32);
      if (fitOnActivityChangeRef.current) {
        fitPath(map, pathSequence.segments);
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("style.load", apply);
  }, [pathSequence]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activity) return;
    if (pathSequenceRef.current) {
      applyRef.current(true, 32);
      return;
    }

    progressKmRef.current = 0;
    poseRef.current = null;
    const apply = () => {
      const look = getLook(lookIdRef.current);
      addRouteLayers(map, activity, {
        standardSlots: look.kind === "standard",
        palette: getRoutePalette(routeColorRef.current),
      });
      applyRef.current(true, 32);
      if (fitOnActivityChangeRef.current) {
        fitRoute(map, activity.coordinates);
      }
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("style.load", apply);
    }
  }, [activity]);

  useEffect(() => {
    const current = activityRef.current;
    if (!current) return;
    const distances = cumulativeDistancesKm(current.coordinates);
    const totalKm = distances[distances.length - 1] ?? 0;
    progressKmRef.current = Math.min(Math.max(progress, 0), 1) * totalKm;
    applyRef.current(true, 32);
    // seekNonce is the trigger; progress is sampled from the latest seek.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekNonce]);

  useEffect(() => {
    const stopped = wasPlayingRef.current && !playing;
    wasPlayingRef.current = playing;
    if (!playing) {
      followZoomRef.current = null;
      followPitchRef.current = null;
    }
    if (playing || stopped) return;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.jumpTo({
      zoom,
      pitch,
      center: map.getCenter(),
      bearing: map.getBearing(),
    });
  }, [zoom, pitch, playing]);

  useEffect(() => {
    if (!playing || !activity) return;
    const map = mapRef.current;
    if (!map) return;

    followZoomRef.current = map.getZoom();
    followPitchRef.current = map.getPitch();
    if (poseRef.current) {
      poseRef.current = {
        ...poseRef.current,
        zoom: followZoomRef.current,
        pitch: followPitchRef.current,
      };
    }

    const distances = cumulativeDistancesKm(activity.coordinates);
    const totalKm = distances[distances.length - 1] ?? 0;
    if (totalKm <= 0) return;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      if (!playingRef.current) return;
      const currentMap = mapRef.current;
      if (!currentMap) return;

      const dt = Math.min(64, now - last);
      last = now;
      const sample = sampleAlongRoute(
        activity.coordinates,
        distances,
        progressKmRef.current,
        lookaheadForSpeed(speedRef.current),
      );
      const headingError = poseRef.current
        ? Math.abs(
            ((((sample.bearing - poseRef.current.bearing) % 360) + 540) % 360) - 180,
          )
        : 0;
      const kmPerMs = totalKm / (durationMsRef.current / speedRef.current);
      progressKmRef.current = Math.min(
        totalKm,
        progressKmRef.current + dt * kmPerMs * turnSlowdown(headingError),
      );
      applyRef.current(false, dt);

      const t = totalKm > 0 ? progressKmRef.current / totalKm : 0;
      if (now - lastProgressEmitRef.current > 80) {
        lastProgressEmitRef.current = now;
        onProgressRef.current(t);
      }

      if (progressKmRef.current >= totalKm) {
        onProgressRef.current(1);
        onEndedRef.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, activity, speed]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      data-look={lookId ?? DEFAULT_LOOK_ID}
    />
  );
}
