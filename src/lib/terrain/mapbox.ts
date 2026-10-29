export type TerrainStyleId = "satellite" | "standard";

export function getMapboxToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
  if (!token.startsWith("pk.")) {
    throw new Error(
      "Missing Mapbox public token. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env",
    );
  }
  return token;
}

export function getStyleUrl(style: TerrainStyleId): string {
  if (style === "satellite") {
    return (
      process.env.NEXT_PUBLIC_MAPBOX_STYLE_SATELLITE ??
      "mapbox://styles/mapbox/standard-satellite"
    );
  }
  return (
    process.env.NEXT_PUBLIC_MAPBOX_STYLE_STANDARD ??
    "mapbox://styles/mapbox/outdoors-v12"
  );
}

export function getTerrainSourceUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MAPBOX_TERRAIN_SOURCE ??
    "mapbox://mapbox.mapbox-terrain-dem-v1"
  );
}

export const ROUTE_SOURCE_ID = "terrainfly-route";
export const ROUTE_LAYER_ID = "terrainfly-route-line";
export const ROUTE_CASING_LAYER_ID = "terrainfly-route-casing";
export const MARKER_SOURCE_ID = "terrainfly-markers";
export const MARKER_LAYER_ID = "terrainfly-markers-circles";
export const POSITION_SOURCE_ID = "terrainfly-position";
export const POSITION_LAYER_ID = "terrainfly-position-circle";
export const DEM_SOURCE_ID = "mapbox-dem";
