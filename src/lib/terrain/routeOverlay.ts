import type { Activity, LngLatEle } from "@/types/activity";
import { activityBounds, toLineFeature } from "@/lib/gps/normalizeActivity";
import type { MapboxGeoJSONSource, MapboxMap } from "./types";
import {
  MARKER_LAYER_ID,
  MARKER_SOURCE_ID,
  POSITION_LAYER_ID,
  POSITION_SOURCE_ID,
  ROUTE_CASING_LAYER_ID,
  ROUTE_LAYER_ID,
  ROUTE_SOURCE_ID,
} from "./mapbox";

function markerCollection(activity: Activity) {
  const start = activity.coordinates[0];
  const end = activity.coordinates[activity.coordinates.length - 1];
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: { kind: "start" },
        geometry: { type: "Point" as const, coordinates: [start[0], start[1]] },
      },
      {
        type: "Feature" as const,
        properties: { kind: "end" },
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
    const fallback = { ...layer, paint };
    delete fallback.slot;
    map.addLayer(fallback as never);
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
              coordinates: [point[0], point[1]],
            },
          },
        ]
      : [],
  };
}

export function addRouteLayers(
  map: MapboxMap,
  activity: Activity,
  style: "satellite" | "standard" = "satellite",
): void {
  const slot = style === "satellite" ? "middle" : undefined;
  const markerSlot = style === "satellite" ? "top" : undefined;
  if (!map.getSource(ROUTE_SOURCE_ID)) {
    map.addSource(ROUTE_SOURCE_ID, {
      type: "geojson",
      data: toLineFeature(activity.coordinates),
    });
  } else {
    const source = map.getSource(ROUTE_SOURCE_ID) as MapboxGeoJSONSource;
    source.setData(toLineFeature(activity.coordinates));
  }

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
        "line-color": "#1a120c",
        "line-width": 8,
        "line-opacity": 0.85,
        "line-elevation-reference": "ground",
        "line-z-offset": 4,
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
        "line-color": "#ff5a2a",
        "line-width": 4,
        "line-opacity": 1,
        "line-elevation-reference": "ground",
        "line-z-offset": 6,
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
        "circle-radius": 7,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff8f0",
        "circle-color": [
          "match",
          ["get", "kind"],
          "start",
          "#2ee59d",
          "end",
          "#ff5a2a",
          "#ffffff",
        ],
        "circle-pitch-alignment": "map",
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
        "circle-radius": 8,
        "circle-color": "#fff4cc",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#1a120c",
        "circle-pitch-alignment": "map",
      },
    });
  }
}

export function updatePositionMarker(map: MapboxMap, point: LngLatEle | null): void {
  const source = map.getSource(POSITION_SOURCE_ID) as MapboxGeoJSONSource | undefined;
  source?.setData(positionCollection(point));
}

export function fitRoute(map: MapboxMap, coordinates: LngLatEle[]): void {
  const [minLng, minLat, maxLng, maxLat] = activityBounds(coordinates);
  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      padding: 96,
      duration: 1200,
      pitch: 58,
      bearing: 0,
      maxZoom: 14.6,
    },
  );
}
