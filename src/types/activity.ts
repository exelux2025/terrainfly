export type LngLatEle = [number, number, number];

export type ActivityFormat = "fit" | "gpx" | "tcx";

export type ActivityStats = {
  distanceKm: number;
  durationSec: number;
  elevationGainM: number;
  pointCount: number;
};

export type Activity = {
  name: string;
  sourceFormat: ActivityFormat;
  coordinates: LngLatEle[];
  timestamps: Array<number | null>;
  stats: ActivityStats;
};
