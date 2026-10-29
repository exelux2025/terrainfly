import { formatDuration } from "@/lib/format/activity";
import { PathStat } from "./Stat";
import type { PathPieceProps } from "./types";

export function PathDuration({ frame }: PathPieceProps) {
  return (
    <div data-path-slot="duration">
      <PathStat
        label="Time"
        value={`${formatDuration(frame.elapsedSec)} / ${formatDuration(frame.durationSec)}`}
      />
    </div>
  );
}
