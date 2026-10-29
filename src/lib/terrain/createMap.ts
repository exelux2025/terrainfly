import { DEM_SOURCE_ID, getTerrainSourceUrl } from "./mapbox";
import type { MapboxMap } from "./types";

export function enableTerrain(map: MapboxMap): void {
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
    exaggeration: 1.4,
  });

  if (typeof map.setFog === "function") {
    map.setFog({
      range: [0.8, 8],
      color: "#c8d9ea",
      "horizon-blend": 0.08,
    });
  }
}
