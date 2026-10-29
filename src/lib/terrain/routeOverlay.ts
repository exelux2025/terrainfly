import type { Activity, LngLatEle } from "@/types/activity";
import { activityBounds, toLineFeature } from "@/lib/gps/normalizeActivity";
import type { RoutePalette } from "./looks";
import { ROUTE_PALETTES } from "./looks";
import {
  pathCoordinates,
  pathMarkerCollection,
  pathRemainingCollection,
  pathTraveledCollection,
} from "./pathGeometry";
import type { MapboxGeoJSONSource, MapboxMap } from "./types";
import {
  GHOST_ROUTE_LAYER_ID,
  LABEL_LAYER_ID,
  MARKER_LAYER_ID,
  MARKER_SOURCE_ID,
  PATH_CHAPTER_LAYER_ID,
  PATH_NETWORK_LAYER_ID,
  PATH_NETWORK_SOURCE_ID,
  PATH_TRAVELED_CASING_LAYER_ID,
  PATH_TRAVELED_LAYER_ID,
  PATH_TRAVELED_SOURCE_ID,
  POSITION_HALO_LAYER_ID,
  POSITION_LAYER_ID,
  POSITION_SOURCE_ID,
  ROUTE_CASING_LAYER_ID,
  ROUTE_LAYER_ID,
  ROUTE_SOURCE_ID,
} from "./mapbox";

const LINE_WIDTH = ["interpolate", ["linear"], ["zoom"], 11, 2.3, 13.5, 3.2, 16, 4.4];
const CASING_WIDTH = ["interpolate", ["linear"], ["zoom"], 11, 4.1, 13.5, 5.4, 16, 6.8];
const GHOST_WIDTH = ["interpolate", ["linear"], ["zoom"], 11, 1.7, 13.5, 2.3, 16, 3];

function markerCollection(activity: Activity) {
  const start = activity.coordinates[0];
  const end = activity.coordinates[activity.coordinates.length - 1];
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: { kind: "start", label: "Start" },
        geometry: { type: "Point" as const, coordinates: [start[0], start[1]] },
      },
      {
        type: "Feature" as const,
        properties: { kind: "end", label: "Finish" },
        geometry: { type: "Point" as const, coordinates: [end[0], end[1]] },
      },
    ],
  };
}

function addLayerSafe(map: MapboxMap, layer: Record<string, unknown>): void {
  try {
    map.addLayer(layer as never);
  } catch {
    const paint = { ...((layer.paint as Record<string, unknown>) ?? {}) };
    delete paint["line-elevation-reference"];
    delete paint["line-z-offset"];
    delete paint["line-trim-offset"];
    const fallback: Record<string, unknown> = { ...layer, paint };
    delete fallback.slot;
    try {
      map.addLayer(fallback as never);
    } catch {
      // Style may not support this layer type.
    }
  }
}

function positionCollection(point: LngLatEle | null) {
  return {
    type: "FeatureCollection" as const,
    features: point
      ? [
          {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "Point" as const,
              coordinates: [point[0], point[1], point[2]],
            },
          },
        ]
      : [],
  };
}

function removeLayerIfPresent(map: MapboxMap, id: string): void {
  if (map.getLayer(id)) map.removeLayer(id);
}

function ensureLineSource(map: MapboxMap, activity: Activity): void {
  const existing = map.getSource(ROUTE_SOURCE_ID) as MapboxGeoJSONSource | undefined;
  if (existing) {
    existing.setData(toLineFeature(activity.coordinates));
    return;
  }
  map.addSource(ROUTE_SOURCE_ID, {
    type: "geojson",
    lineMetrics: true,
    data: toLineFeature(activity.coordinates),
  });
}

function setPaint(map: MapboxMap, layerId: string, property: string, value: unknown): void {
  if (!map.getLayer(layerId)) return;
  try {
    map.setPaintProperty(layerId, property as never, value as never);
  } catch {
    // Property not supported on this layer.
  }
}

export type RouteLayerOptions = {
  standardSlots?: boolean;
  palette?: RoutePalette;
};

export function addRouteLayers(
  map: MapboxMap,
  activity: Activity,
  options: RouteLayerOptions | "satellite" | "standard" = {},
): void {
  const resolved: RouteLayerOptions =
    typeof options === "string"
      ? { standardSlots: options === "satellite" }
      : options;
  const slot = resolved.standardSlots ? "middle" : undefined;
  const markerSlot = resolved.standardSlots ? "top" : undefined;
  const palette = resolved.palette ?? ROUTE_PALETTES.ember;

  ensureLineSource(map, activity);

  if (!map.getSource(MARKER_SOURCE_ID)) {
    map.addSource(MARKER_SOURCE_ID, {
      type: "geojson",
      data: markerCollection(activity),
    });
  } else {
    const source = map.getSource(MARKER_SOURCE_ID) as MapboxGeoJSONSource;
    source.setData(markerCollection(activity));
  }

  if (!map.getSource(POSITION_SOURCE_ID)) {
    map.addSource(POSITION_SOURCE_ID, {
      type: "geojson",
      data: positionCollection(null),
    });
  }

  if (!map.getLayer(GHOST_ROUTE_LAYER_ID)) {
    addLayerSafe(map, {
      id: GHOST_ROUTE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      ...(slot ? { slot } : {}),
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": palette.ghost,
        "line-width": GHOST_WIDTH,
        "line-opacity": 0.55,
        "line-elevation-reference": "ground",
        "line-z-offset": 3,
        "line-trim-offset": [0.001, 1],
      },
    });
  }

  if (!map.getLayer(ROUTE_CASING_LAYER_ID)) {
    addLayerSafe(map, {
      id: ROUTE_CASING_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      ...(slot ? { slot } : {}),
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": palette.casing,
        "line-width": CASING_WIDTH,
        "line-opacity": 0.9,
        "line-elevation-reference": "ground",
        "line-z-offset": 4,
        "line-trim-offset": [0, 0.001],
      },
    });
  }

  if (!map.getLayer(ROUTE_LAYER_ID)) {
    addLayerSafe(map, {
      id: ROUTE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      ...(slot ? { slot } : {}),
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": palette.line,
        "line-width": LINE_WIDTH,
        "line-opacity": 1,
        "line-elevation-reference": "ground",
        "line-z-offset": 5,
        "line-trim-offset": [0, 0.001],
      },
    });
  }

  if (!map.getLayer(MARKER_LAYER_ID)) {
    addLayerSafe(map, {
      id: MARKER_LAYER_ID,
      type: "circle",
      source: MARKER_SOURCE_ID,
      ...(markerSlot ? { slot: markerSlot } : {}),
      paint: {
        "circle-radius": 4.5,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#fff8f0",
        "circle-color": [
          "match",
          ["get", "kind"],
          "start",
          palette.start,
          "end",
          palette.finish,
          "#ffffff",
        ],
        "circle-pitch-alignment": "viewport",
      },
    });
  }

  if (!map.getLayer(LABEL_LAYER_ID)) {
    addLayerSafe(map, {
      id: LABEL_LAYER_ID,
      type: "symbol",
      source: MARKER_SOURCE_ID,
      ...(markerSlot ? { slot: markerSlot } : {}),
      layout: {
        "text-field": ["get", "label"],
        "text-size": 13,
        "text-offset": [0, 1.15],
        "text-anchor": "top",
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#fff8f0",
        "text-halo-color": "#1a120c",
        "text-halo-width": 1.4,
      },
    });
  }

  if (!map.getLayer(POSITION_HALO_LAYER_ID)) {
    addLayerSafe(map, {
      id: POSITION_HALO_LAYER_ID,
      type: "circle",
      source: POSITION_SOURCE_ID,
      ...(markerSlot ? { slot: markerSlot } : {}),
      paint: {
        "circle-radius": 8,
        "circle-color": palette.line,
        "circle-opacity": 0.16,
        "circle-pitch-alignment": "viewport",
      },
    });
  }

  if (!map.getLayer(POSITION_LAYER_ID)) {
    addLayerSafe(map, {
      id: POSITION_LAYER_ID,
      type: "circle",
      source: POSITION_SOURCE_ID,
      ...(markerSlot ? { slot: markerSlot } : {}),
      paint: {
        "circle-radius": 4.6,
        "circle-color": "#ffffff",
        "circle-stroke-width": 2.2,
        "circle-stroke-color": palette.line,
        "circle-pitch-alignment": "viewport",
      },
    });
  }

  applyRouteTheme(map, palette);
  setRouteMode(map, "single");
}

export function applyRouteTheme(map: MapboxMap, palette: RoutePalette): void {
  setPaint(map, GHOST_ROUTE_LAYER_ID, "line-color", palette.ghost);
  setPaint(map, ROUTE_CASING_LAYER_ID, "line-color", palette.casing);
  setPaint(map, ROUTE_LAYER_ID, "line-color", palette.line);
  setPaint(map, PATH_NETWORK_LAYER_ID, "line-color", palette.ghost);
  setPaint(map, PATH_TRAVELED_CASING_LAYER_ID, "line-color", palette.casing);
  setPaint(map, PATH_TRAVELED_LAYER_ID, "line-color", palette.line);
  setPaint(map, POSITION_HALO_LAYER_ID, "circle-color", palette.line);
  setPaint(map, POSITION_LAYER_ID, "circle-color", "#ffffff");
  setPaint(map, POSITION_LAYER_ID, "circle-stroke-color", palette.line);
  const markerColor = [
    "match",
    ["get", "kind"],
    "start",
    palette.start,
    "end",
    palette.finish,
    "chapter",
    palette.ghost,
    "#ffffff",
  ];
  setPaint(map, MARKER_LAYER_ID, "circle-color", markerColor);
  setPaint(map, PATH_CHAPTER_LAYER_ID, "circle-color", palette.line);
}

export function updatePositionMarker(map: MapboxMap, point: LngLatEle | null): void {
  const source = map.getSource(POSITION_SOURCE_ID) as MapboxGeoJSONSource | undefined;
  source?.setData(positionCollection(point));
}

export function setRouteProgress(map: MapboxMap, progress01: number): void {
  const t = Math.min(1, Math.max(0.001, progress01));
  for (const id of [ROUTE_LAYER_ID, ROUTE_CASING_LAYER_ID]) {
    if (!map.getLayer(id)) continue;
    try {
      map.setPaintProperty(id, "line-trim-offset", [0, t]);
    } catch {
      // line-trim-offset is unavailable on this style/layer.
    }
  }
  if (map.getLayer(GHOST_ROUTE_LAYER_ID)) {
    try {
      map.setPaintProperty(GHOST_ROUTE_LAYER_ID, "line-trim-offset", [t, 1]);
    } catch {
      // Ghost trim is optional.
    }
  }
}

export function fitRoute(map: MapboxMap, coordinates: LngLatEle[]): void {
  const [minLng, minLat, maxLng, maxLat] = activityBounds(coordinates);
  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      padding: { top: 120, bottom: 150, left: 72, right: 88 },
      duration: 1200,
      pitch: 58,
      bearing: 0,
      maxZoom: 14.4,
    },
  );
}

function setLayerVisible(map: MapboxMap, id: string, visible: boolean): void {
  if (!map.getLayer(id)) return;
  try {
    map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  } catch {
    // Layer may not support layout visibility yet.
  }
}

function setRouteMode(map: MapboxMap, mode: "single" | "path"): void {
  const path = mode === "path";
  setLayerVisible(map, GHOST_ROUTE_LAYER_ID, !path);
  setLayerVisible(map, ROUTE_CASING_LAYER_ID, !path);
  setLayerVisible(map, ROUTE_LAYER_ID, !path);
  setLayerVisible(map, PATH_NETWORK_LAYER_ID, path);
  setLayerVisible(map, PATH_TRAVELED_CASING_LAYER_ID, path);
  setLayerVisible(map, PATH_TRAVELED_LAYER_ID, path);
  setLayerVisible(map, PATH_CHAPTER_LAYER_ID, path);
}

function ensureGeoJsonSource(
  map: MapboxMap,
  id: string,
  data: GeoJSON.FeatureCollection | GeoJSON.Feature,
  lineMetrics = false,
): MapboxGeoJSONSource {
  const existing = map.getSource(id) as MapboxGeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return existing;
  }
  map.addSource(id, {
    type: "geojson",
    lineMetrics,
    data,
  });
  return map.getSource(id) as MapboxGeoJSONSource;
}

export function addPersistentPathLayers(
  map: MapboxMap,
  segments: Activity[],
  options: RouteLayerOptions = {},
): void {
  if (segments.length === 0) return;
  const slot = options.standardSlots ? "middle" : undefined;
  const markerSlot = options.standardSlots ? "top" : undefined;
  const palette = options.palette ?? ROUTE_PALETTES.ember;

  ensureGeoJsonSource(map, PATH_NETWORK_SOURCE_ID, pathRemainingCollection(segments, 0, 0));
  ensureGeoJsonSource(map, PATH_TRAVELED_SOURCE_ID, pathTraveledCollection(segments, 0, 0.001));
  ensureGeoJsonSource(map, MARKER_SOURCE_ID, pathMarkerCollection(segments));

  if (!map.getSource(POSITION_SOURCE_ID)) {
    map.addSource(POSITION_SOURCE_ID, {
      type: "geojson",
      data: positionCollection(null),
    });
  }

  if (!map.getLayer(PATH_NETWORK_LAYER_ID)) {
    addLayerSafe(map, {
      id: PATH_NETWORK_LAYER_ID,
      type: "line",
      source: PATH_NETWORK_SOURCE_ID,
      ...(slot ? { slot } : {}),
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": palette.ghost,
        "line-width": GHOST_WIDTH,
        "line-opacity": 0.55,
        "line-elevation-reference": "ground",
        "line-z-offset": 3,
      },
    });
  }

  if (!map.getLayer(PATH_TRAVELED_CASING_LAYER_ID)) {
    addLayerSafe(map, {
      id: PATH_TRAVELED_CASING_LAYER_ID,
      type: "line",
      source: PATH_TRAVELED_SOURCE_ID,
      ...(slot ? { slot } : {}),
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": palette.casing,
        "line-width": CASING_WIDTH,
        "line-opacity": 0.9,
        "line-elevation-reference": "ground",
        "line-z-offset": 4,
      },
    });
  }

  if (!map.getLayer(PATH_TRAVELED_LAYER_ID)) {
    addLayerSafe(map, {
      id: PATH_TRAVELED_LAYER_ID,
      type: "line",
      source: PATH_TRAVELED_SOURCE_ID,
      ...(slot ? { slot } : {}),
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": palette.line,
        "line-width": LINE_WIDTH,
        "line-opacity": 1,
        "line-elevation-reference": "ground",
        "line-z-offset": 5,
      },
    });
  }

  if (!map.getLayer(MARKER_LAYER_ID)) {
    addLayerSafe(map, {
      id: MARKER_LAYER_ID,
      type: "circle",
      source: MARKER_SOURCE_ID,
      ...(markerSlot ? { slot: markerSlot } : {}),
      paint: {
        "circle-radius": [
          "match",
          ["get", "kind"],
          "chapter",
          3.2,
          4.5,
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff8f0",
        "circle-color": [
          "match",
          ["get", "kind"],
          "start",
          palette.start,
          "end",
          palette.finish,
          "chapter",
          palette.ghost,
          "#ffffff",
        ],
        "circle-pitch-alignment": "viewport",
      },
    });
  } else {
    const source = map.getSource(MARKER_SOURCE_ID) as MapboxGeoJSONSource;
    source.setData(pathMarkerCollection(segments));
  }

  if (!map.getLayer(PATH_CHAPTER_LAYER_ID)) {
    addLayerSafe(map, {
      id: PATH_CHAPTER_LAYER_ID,
      type: "symbol",
      source: MARKER_SOURCE_ID,
      ...(markerSlot ? { slot: markerSlot } : {}),
      filter: ["==", ["get", "kind"], "chapter"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-offset": [0, 1.05],
        "text-anchor": "top",
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#fff8f0",
        "text-halo-color": "#1a120c",
        "text-halo-width": 1.2,
      },
    });
  }

  if (!map.getLayer(LABEL_LAYER_ID)) {
    addLayerSafe(map, {
      id: LABEL_LAYER_ID,
      type: "symbol",
      source: MARKER_SOURCE_ID,
      ...(markerSlot ? { slot: markerSlot } : {}),
      filter: ["any", ["==", ["get", "kind"], "start"], ["==", ["get", "kind"], "end"]],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 13,
        "text-offset": [0, 1.15],
        "text-anchor": "top",
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#fff8f0",
        "text-halo-color": "#1a120c",
        "text-halo-width": 1.4,
      },
    });
  } else {
    try {
      map.setFilter(LABEL_LAYER_ID, [
        "any",
        ["==", ["get", "kind"], "start"],
        ["==", ["get", "kind"], "end"],
      ]);
    } catch {
      // Filter syntax may be unsupported.
    }
  }

  if (!map.getLayer(POSITION_HALO_LAYER_ID)) {
    addLayerSafe(map, {
      id: POSITION_HALO_LAYER_ID,
      type: "circle",
      source: POSITION_SOURCE_ID,
      ...(markerSlot ? { slot: markerSlot } : {}),
      paint: {
        "circle-radius": 8,
        "circle-color": palette.line,
        "circle-opacity": 0.16,
        "circle-pitch-alignment": "viewport",
      },
    });
  }

  if (!map.getLayer(POSITION_LAYER_ID)) {
    addLayerSafe(map, {
      id: POSITION_LAYER_ID,
      type: "circle",
      source: POSITION_SOURCE_ID,
      ...(markerSlot ? { slot: markerSlot } : {}),
      paint: {
        "circle-radius": 4.6,
        "circle-color": "#ffffff",
        "circle-stroke-width": 2.2,
        "circle-stroke-color": palette.line,
        "circle-pitch-alignment": "viewport",
      },
    });
  }

  applyRouteTheme(map, palette);
  setRouteMode(map, "path");
}

export function setPersistentPathProgress(
  map: MapboxMap,
  segments: Activity[],
  chapterIndex: number,
  localProgress: number,
): void {
  const traveled = map.getSource(PATH_TRAVELED_SOURCE_ID) as MapboxGeoJSONSource | undefined;
  const remaining = map.getSource(PATH_NETWORK_SOURCE_ID) as MapboxGeoJSONSource | undefined;
  traveled?.setData(pathTraveledCollection(segments, chapterIndex, localProgress));
  remaining?.setData(pathRemainingCollection(segments, chapterIndex, localProgress));
}

export function fitPath(map: MapboxMap, segments: Activity[]): void {
  const coordinates = pathCoordinates(segments);
  if (coordinates.length >= 2) fitRoute(map, coordinates);
}

export function resetRouteLayers(map: MapboxMap): void {
  for (const id of [
    POSITION_LAYER_ID,
    POSITION_HALO_LAYER_ID,
    PATH_CHAPTER_LAYER_ID,
    LABEL_LAYER_ID,
    MARKER_LAYER_ID,
    PATH_TRAVELED_LAYER_ID,
    PATH_TRAVELED_CASING_LAYER_ID,
    PATH_NETWORK_LAYER_ID,
    ROUTE_LAYER_ID,
    ROUTE_CASING_LAYER_ID,
    GHOST_ROUTE_LAYER_ID,
  ]) {
    removeLayerIfPresent(map, id);
  }
}
