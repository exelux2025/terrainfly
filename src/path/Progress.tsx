import type { PathPieceProps } from "./types";

export function PathProgress({ frame, accent }: PathPieceProps) {
  const pct = Math.round(frame.t * 100);

  return (
    <div data-path-slot="progress" className="pt-1">
      <div className="mb-1 flex items-baseline justify-between text-[10px] uppercase tracking-[0.14em] text-white/50">
        <span>Progress</span>
        <span className="tabular-nums text-white/80">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
    </div>
  );
}
