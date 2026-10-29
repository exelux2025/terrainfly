export const PATH_SLOTS = [
  "title",
  "distance",
  "duration",
  "elevation",
  "gain",
  "profile",
  "progress",
] as const;

export type PathSlot = (typeof PATH_SLOTS)[number];

/** One sampled instant of a flyover. Same shape every frame so a video capture stays stable. */
export type PathVideoFrame = {
  t: number;
  name: string;
  chapter?: string;
  traveledKm: number;
  totalKm: number;
  remainingKm: number;
  elapsedSec: number;
  durationSec: number;
  elevationM: number;
  gainToHereM: number;
  totalGainM: number;
  profile: number[];
  profileIndex: number;
};

export type PathPieceProps = {
  frame: PathVideoFrame;
  accent: string;
};
