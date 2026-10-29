import {
  DEM_SOURCE_ID,
  HILLSHADE_LAYER_ID,
  HILLSHADE_SOURCE_ID,
  LABEL_LAYER_ID,
  SKY_LAYER_ID,
  getTerrainSourceUrl,
} from "./mapbox";
import {
  clamp,
  rasterBoost,
  scaledLights,
  type TerrainLook,
} from "./looks";
import type { MapboxMap } from "./types";

export type LookOverrides = {
  exaggeration: number;
  brightness: number;
  showMapLabels: boolean;
};

function addLayerSafe(map: MapboxMap, layer: Record<string, unknown>, beforeId?: string): void {
  try {
    if (beforeId && map.getLayer(beforeId)) {
      map.addLayer(layer as never, beforeId);
    } else {
      map.addLayer(layer as never);
    }
  } catch {
    try {
      const fallback = { ...layer };
      delete fallback.slot;
      map.addLayer(fallback as never);
    } catch {
      // Style may not support this layer type.
    }
  }
}

function firstSymbolId(map: MapboxMap): string | undefined {
  const layers = map.getStyle()?.layers ?? [];
  const symbol = layers.find((layer) => layer.type === "symbol");
  return symbol?.id;
}

function setPaint(map: MapboxMap, layerId: string, property: string, value: unknown): void {
  if (!map.getLayer(layerId)) return;
  try {
    map.setPaintProperty(layerId, property as never, value as never);
  } catch {
    // Property not supported on this layer.
  }
}

export function enableTerrain(map: MapboxMap, exaggeration = 2): void {
  if (!map.getSource(DEM_SOURCE_ID)) {
    map.addSource(DEM_SOURCE_ID, {
      type: "raster-dem",
      url: getTerrainSourceUrl(),
      tileSize: 512,
      maxzoom: 14,
    });
  }

  map.setTerrain({
    source: DEM_SOURCE_ID,
    exaggeration,
  });
}

function applyFog(map: MapboxMap, look: TerrainLook, brightness: number): void {
  if (typeof map.setFog !== "function") return;
  const b = clamp(brightness, 0, 1);
  const haze = look.fog.horizonBlend * (1.15 - b * 0.4);
  try {
    map.setFog({
      range: look.fog.range,
      color: look.fog.color,
      "high-color": look.fog.highColor,
      "space-color": look.fog.spaceColor,
      "horizon-blend": clamp(haze, 0.015, 0.12),
      "star-intensity": look.fog.starIntensity,
    });
  } catch {
    try {
      map.setFog({
        range: look.fog.range,
        color: look.fog.color,
        "horizon-blend": 0.04,
      });
    } catch {
      // Fog unsupported.
    }
  }
}

function applyLights(map: MapboxMap, look: TerrainLook, brightness: number): void {
  if (look.kind === "standard") return;
  const lights = scaledLights(look, brightness);
  if (typeof map.setLights === "function") {
    try {
      map.setLights([
        {
          id: "terrainfly-sun",
          type: "directional",
          properties: {
            color: lights.directional.color,
            intensity: lights.directional.intensity,
            direction: lights.directional.direction,
            "cast-shadows": true,
            "shadow-intensity": look.id === "night" ? 0.15 : look.id === "alpine" ? 0.42 : 0.28,
          },
        },
        {
          id: "terrainfly-ambient",
          type: "ambient",
          properties: {
            color: lights.ambient.color,
            intensity: lights.ambient.intensity,
          },
        },
      ]);
      return;
    } catch {
      // Fall through to legacy light.
    }
  }

  try {
    map.setLight({
      anchor: "map",
      color: lights.directional.color,
      intensity: lights.directional.intensity,
      position: [1.15, lights.directional.direction[0], lights.directional.direction[1]],
    });
  } catch {
    // Light unsupported.
  }
}

function basemapImportId(map: MapboxMap): string {
  const style = map.getStyle() as { imports?: Array<{ id?: string }> } | undefined;
  return style?.imports?.[0]?.id ?? "basemap";
}

function applyStandardConfig(map: MapboxMap, look: TerrainLook, showMapLabels: boolean): void {
  if (look.kind !== "standard" || typeof map.setConfigProperty !== "function") return;
  const importId = basemapImportId(map);
  const config: Array<[string, unknown]> = [
    ["lightPreset", look.lightPreset],
    ["showPointOfInterestLabels", showMapLabels],
    ["showPlaceLabels", showMapLabels],
    ["showRoadLabels", showMapLabels],
    ["showTransitLabels", false],
    ["show3dObjects", true],
  ];
  for (const [key, value] of config) {
    try {
      map.setConfigProperty(importId, key, value);
    } catch {
      // Config key not present on this style.
    }
  }
}

function applySky(map: MapboxMap, look: TerrainLook): void {
  const slot = look.kind === "standard" ? "bottom" : undefined;
  if (!map.getLayer(SKY_LAYER_ID)) {
    addLayerSafe(map, {
      id: SKY_LAYER_ID,
      type: "sky",
      ...(slot ? { slot } : {}),
      paint: {
        "sky-type": "atmosphere",
        "sky-atmosphere-sun": look.sky.sun,
        "sky-atmosphere-sun-intensity": look.sky.sunIntensity,
        "sky-atmosphere-color": look.sky.atmosphere,
        "sky-atmosphere-halo-color": look.sky.halo,
      },
    });
    return;
  }
  setPaint(map, SKY_LAYER_ID, "sky-atmosphere-sun", look.sky.sun);
  setPaint(map, SKY_LAYER_ID, "sky-atmosphere-sun-intensity", look.sky.sunIntensity);
  setPaint(map, SKY_LAYER_ID, "sky-atmosphere-color", look.sky.atmosphere);
  setPaint(map, SKY_LAYER_ID, "sky-atmosphere-halo-color", look.sky.halo);
}

function ensureHillshadeSource(map: MapboxMap): boolean {
  if (map.getSource(HILLSHADE_SOURCE_ID)) return true;
  try {
    map.addSource(HILLSHADE_SOURCE_ID, {
      type: "raster-dem",
      url: getTerrainSourceUrl(),
      tileSize: 512,
      maxzoom: 14,
    });
    return true;
  } catch {
    return Boolean(map.getSource(DEM_SOURCE_ID));
  }
}

function applyHillshade(map: MapboxMap, look: TerrainLook, brightness: number): void {
  if (!ensureHillshadeSource(map)) return;
  const source = map.getSource(HILLSHADE_SOURCE_ID) ? HILLSHADE_SOURCE_ID : DEM_SOURCE_ID;
  const exaggeration = clamp(look.hillshade.exaggeration * (0.75 + brightness * 0.5), 0.18, 1.15);
  const slot = look.kind === "standard" ? "bottom" : undefined;
  const beforeId = look.kind === "classic" ? firstSymbolId(map) : undefined;
  if (!map.getLayer(HILLSHADE_LAYER_ID)) {
    addLayerSafe(
      map,
      {
        id: HILLSHADE_LAYER_ID,
        type: "hillshade",
        source,
        ...(slot ? { slot } : {}),
        paint: {
          "hillshade-exaggeration": exaggeration,
          "hillshade-illumination-direction": look.sun.direction[0],
          "hillshade-illumination-anchor": "map",
          "hillshade-highlight-color": look.hillshade.highlight,
          "hillshade-shadow-color": look.hillshade.shadow,
          "hillshade-accent-color": look.hillshade.accent,
        },
      },
      beforeId,
    );
    return;
  }
  setPaint(map, HILLSHADE_LAYER_ID, "hillshade-exaggeration", exaggeration);
  setPaint(map, HILLSHADE_LAYER_ID, "hillshade-illumination-direction", look.sun.direction[0]);
  setPaint(map, HILLSHADE_LAYER_ID, "hillshade-highlight-color", look.hillshade.highlight);
  setPaint(map, HILLSHADE_LAYER_ID, "hillshade-shadow-color", look.hillshade.shadow);
  setPaint(map, HILLSHADE_LAYER_ID, "hillshade-accent-color", look.hillshade.accent);
}

function landcoverColor(look: TerrainLook): unknown {
  const v = look.vegetation;
  if (!v) return null;
  return [
    "match",
    ["get", "class"],
    "wood",
    v.wood,
    "forest",
    v.wood,
    "grass",
    v.grass,
    "scrub",
    v.scrub,
    "crop",
    v.crop,
    "farmland",
    v.crop,
    "agriculture",
    v.crop,
    "snow",
    "#f3f6fa",
    "glacier",
    "#e7eef6",
    "sand",
    "#cbb889",
    v.land,
  ];
}

function applyVegetation(map: MapboxMap, look: TerrainLook): void {
  if (look.kind !== "classic" || !look.vegetation) return;
  const v = look.vegetation;
  const cover = landcoverColor(look);
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (layer.type !== "fill") continue;
    const id = layer.id;
    if (/water|building|road|tunnel|bridge|aeroway|ice|glacier/i.test(id) && !/landcover|park/i.test(id)) {
      continue;
    }
    if (/landcover/i.test(id)) {
      setPaint(map, id, "fill-color", cover);
      setPaint(map, id, "fill-opacity", 1);
      continue;
    }
    if (/national-park|(^|-)park($|-)|pitch/i.test(id)) {
      setPaint(map, id, "fill-color", v.park);
      continue;
    }
    if (look.id !== "alpine") continue;
    if (/^land$|landuse/i.test(id) && !/residential|commercial|industrial|hospital|school/i.test(id)) {
      setPaint(map, id, "fill-color", v.land);
    }
    if (/wood|forest/i.test(id)) setPaint(map, id, "fill-color", v.wood);
    if (/grass|scrub|crop/i.test(id)) setPaint(map, id, "fill-color", v.grass);
  }
}

function applyRasterBoost(map: MapboxMap, brightness: number): void {
  const layers = map.getStyle()?.layers ?? [];
  const boost = rasterBoost(brightness);
  for (const layer of layers) {
    if (layer.type !== "raster") continue;
    if (!/satellite|raster/i.test(layer.id)) continue;
    setPaint(map, layer.id, "raster-saturation", boost.saturation);
    setPaint(map, layer.id, "raster-contrast", boost.contrast);
    setPaint(map, layer.id, "raster-brightness-min", boost.brightnessMin);
    setPaint(map, layer.id, "raster-brightness-max", boost.brightnessMax);
  }
}

function applyBasemapLabels(map: MapboxMap, look: TerrainLook, showMapLabels: boolean): void {
  if (look.kind === "standard") return;
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (layer.type !== "symbol") continue;
    if (layer.id === LABEL_LAYER_ID) continue;
    if (!/label|place-|poi-|settlement/i.test(layer.id)) continue;
    try {
      map.setLayoutProperty(layer.id, "visibility", showMapLabels ? "visible" : "none");
    } catch {
      // Layout property may be data-driven.
    }
  }
}

export function applyLook(map: MapboxMap, look: TerrainLook, overrides: LookOverrides): void {
  const exaggeration = clamp(overrides.exaggeration, 1, 3.4);
  const brightness = clamp(overrides.brightness, 0, 1);

  try {
    map.setTerrain({
      source: DEM_SOURCE_ID,
      exaggeration,
    });
  } catch {
    enableTerrain(map, exaggeration);
  }

  applyFog(map, look, brightness);
  applyLights(map, look, brightness);
  applyStandardConfig(map, look, overrides.showMapLabels);
  applySky(map, look);
  applyHillshade(map, look, brightness);
  applyVegetation(map, look);
  applyRasterBoost(map, brightness);
  applyBasemapLabels(map, look, overrides.showMapLabels);
}
