/**
 * Standardized path overlay for a continuous flyover video.
 *
 * Each file in this folder is one on-screen piece of a track (title, distance,
 * time, elevation, gain, profile, progress). PathStack places them in the
 * right corner. Call samplePathFrame(activity, t) every tick — do not merge
 * GPS files to get a continuous video.
 */
export { samplePathFrame, samplePathFrameFromSequence } from "./frame";
export { PathStack } from "./Stack";
export { PathTitle } from "./Title";
export { PathDistance } from "./Distance";
export { PathDuration } from "./Duration";
export { PathElevation } from "./Elevation";
export { PathGain } from "./Gain";
export { PathProfile } from "./Profile";
export { PathProgress } from "./Progress";
export { PATH_SLOTS } from "./types";
export type { PathPieceProps, PathSlot, PathVideoFrame } from "./types";
export type { PathStackProps } from "./Stack";
