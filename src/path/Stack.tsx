"use client";

import { PathDistance } from "./Distance";
import { PathDuration } from "./Duration";
import { PathElevation } from "./Elevation";
import { PathGain } from "./Gain";
import { PathProfile } from "./Profile";
import { PathProgress } from "./Progress";
import { PathTitle } from "./Title";
import { PATH_SLOTS, type PathSlot, type PathVideoFrame } from "./types";

const PIECES: Record<PathSlot, typeof PathTitle> = {
  title: PathTitle,
  distance: PathDistance,
  duration: PathDuration,
  elevation: PathElevation,
  gain: PathGain,
  profile: PathProfile,
  progress: PathProgress,
};

export type PathStackProps = {
  frame: PathVideoFrame;
  accent: string;
  slots?: PathSlot[];
};

/** Right-corner video overlay. Slot order is the continuous layout — files are not merged. */
export function PathStack({
  frame,
  accent,
  slots = [...PATH_SLOTS],
}: PathStackProps) {
  return (
    <aside
      data-path-video="stack"
      className="pointer-events-none absolute top-4 right-4 z-10 w-[15.75rem] rounded-2xl border border-white/10 bg-zinc-950/55 px-3.5 py-3 text-white shadow-2xl backdrop-blur-md"
    >
      <div className="space-y-2">
        {slots.map((slot) => {
          const Piece = PIECES[slot];
          return <Piece key={slot} frame={frame} accent={accent} />;
        })}
      </div>
    </aside>
  );
}
