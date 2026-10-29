import { formatElevation } from "@/lib/format/activity";
import { PathStat } from "./Stat";
import type { PathPieceProps } from "./types";

export function PathElevation({ frame }: PathPieceProps) {
  return (
    <div data-path-slot="elevation">
      <PathStat label="Elevation" value={formatElevation(frame.elevationM)} />
    </div>
  );
}
