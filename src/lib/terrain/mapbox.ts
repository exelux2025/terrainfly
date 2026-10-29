export type { TerrainLookId, TerrainStyleId } from "./looks";
export { getStyleUrl } from "./looks";

export function getMapboxToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
  if (!token.startsWith("pk.")) {
    throw new Error(
      "Missing Mapbox public token. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env",
    );
  }
  return token;
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
export const GHOST_ROUTE_LAYER_ID = "terrainfly-route-ghost";
export const PATH_NETWORK_SOURCE_ID = "terrainfly-path-network";
export const PATH_TRAVELED_SOURCE_ID = "terrainfly-path-traveled";
export const PATH_NETWORK_LAYER_ID = "terrainfly-path-network-line";
export const PATH_TRAVELED_CASING_LAYER_ID = "terrainfly-path-traveled-casing";
export const PATH_TRAVELED_LAYER_ID = "terrainfly-path-traveled-line";
export const PATH_CHAPTER_LAYER_ID = "terrainfly-path-chapter-dots";
export const MARKER_SOURCE_ID = "terrainfly-markers";
export const MARKER_LAYER_ID = "terrainfly-markers-circles";
export const LABEL_LAYER_ID = "terrainfly-endpoint-labels";
export const POSITION_SOURCE_ID = "terrainfly-position";
export const POSITION_LAYER_ID = "terrainfly-position-circle";
export const POSITION_HALO_LAYER_ID = "terrainfly-position-halo";
export const DEM_SOURCE_ID = "mapbox-dem";
export const HILLSHADE_SOURCE_ID = "mapbox-dem-hillshade";
export const HILLSHADE_LAYER_ID = "terrainfly-hillshade";
export const SKY_LAYER_ID = "terrainfly-sky";
