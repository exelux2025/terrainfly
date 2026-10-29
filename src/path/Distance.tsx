import { formatDistance } from "@/lib/format/activity";
import { PathStat } from "./Stat";
import type { PathPieceProps } from "./types";

export function PathDistance({ frame }: PathPieceProps) {
  return (
    <div data-path-slot="distance">
      <PathStat
        label="Distance"
        value={`${formatDistance(frame.traveledKm)} / ${formatDistance(frame.totalKm)}`}
      />
    </div>
  );
}
