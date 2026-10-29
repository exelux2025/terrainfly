"use client";

import { useEffect, useRef } from "react";
import type { PlaybackSpeed } from "@/components/PlaybackControls/PlaybackControls";
import {
  FLYOVER_DURATION_MS,
  cumulativeDistancesKm,
  flyoverZoom,
  sampleAlongRoute,
} from "@/lib/animation/followRoute";
import { enableTerrain } from "@/lib/terrain/createMap";
import { getMapboxToken, getStyleUrl, type TerrainStyleId } from "@/lib/terrain/mapbox";
import { addRouteLayers, fitRoute, updatePositionMarker } from "@/lib/terrain/routeOverlay";
import type { MapboxMap } from "@/lib/terrain/types";
import type { Activity } from "@/types/activity";

type TerrainViewerProps = {
  activity: Activity | null;
  style: TerrainStyleId;
  playing: boolean;
  speed: PlaybackSpeed;
  onEnded: () => void;
};

export function TerrainViewer({
  activity,
  style,
  playing,
  speed,
  onEnded,
}: TerrainViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const styleRef = useRef(style);
  const activityRef = useRef(activity);
  const progressKmRef = useRef(0);
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const onEndedRef = useRef(onEnded);
  const readyRef = useRef(false);

  styleRef.current = style;
  activityRef.current = activity;
  playingRef.current = playing;
  speedRef.current = speed;
  onEndedRef.current = onEnded;

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
        style: getStyleUrl(styleRef.current),
        center: [116.47, -8.41],
        zoom: 1.8,
        pitch: 48,
        bearing: 0,
        maxPitch: 85,
        projection: "globe",
        attributionControl: true,
      });
      map.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        "bottom-right",
      );
      mapRef.current = map;

      const onStyle = () => {
        if (!map) return;
        try {
          enableTerrain(map);
        } catch {
          // Terrain source may already exist on Standard styles.
        }
        const current = activityRef.current;
        if (current) {
          addRouteLayers(map, current, styleRef.current);
          updatePositionMarker(map, current.coordinates[0]);
          if (!playingRef.current) {
            fitRoute(map, current.coordinates);
          }
        }
        readyRef.current = true;
      };

      map.on("style.load", onStyle);
      removeStyleListener = () => map?.off("style.load", onStyle);
    }

    void init();

    return () => {
      cancelled = true;
      readyRef.current = false;
      removeStyleListener?.();
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    readyRef.current = false;
    map.setStyle(getStyleUrl(style));
  }, [style]);

  useEffect(() => {
    progressKmRef.current = 0;
    const map = mapRef.current;
    if (!map || !activity) return;

    const apply = () => {
      addRouteLayers(map, activity, styleRef.current);
      updatePositionMarker(map, activity.coordinates[0]);
      fitRoute(map, activity.coordinates);
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("style.load", apply);
    }
  }, [activity]);

  useEffect(() => {
    if (!playing || !activity) return;
    const map = mapRef.current;
    if (!map) return;

    const distances = cumulativeDistancesKm(activity.coordinates);
    const totalKm = distances[distances.length - 1] ?? 0;
    if (totalKm <= 0) return;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      if (!playingRef.current) return;
      const currentMap = mapRef.current;
      if (!currentMap) return;

      const dt = now - last;
      last = now;
      const kmPerMs = totalKm / (FLYOVER_DURATION_MS / speedRef.current);
      progressKmRef.current = Math.min(totalKm, progressKmRef.current + dt * kmPerMs);
      const sample = sampleAlongRoute(
        activity.coordinates,
        distances,
        progressKmRef.current,
      );
      currentMap.jumpTo({
        center: [sample.lng, sample.lat],
        zoom: flyoverZoom(activity.stats.distanceKm),
        pitch: 62,
        bearing: sample.bearing,
      });
      updatePositionMarker(currentMap, [sample.lng, sample.lat, sample.ele]);

      if (progressKmRef.current >= totalKm) {
        onEndedRef.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, activity, speed]);

  return <div ref={containerRef} className="h-full w-full" />;
}
