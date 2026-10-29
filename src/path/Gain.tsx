import { formatGain } from "@/lib/format/activity";
import { PathStat } from "./Stat";
import type { PathPieceProps } from "./types";

export function PathGain({ frame }: PathPieceProps) {
  return (
    <div data-path-slot="gain">
      <PathStat
        label="Gain"
        value={`${formatGain(frame.gainToHereM)} / ${formatGain(frame.totalGainM)}`}
      />
    </div>
  );
}
