import type { PathPieceProps } from "./types";

export function PathTitle({ frame }: PathPieceProps) {
  return (
    <div data-path-slot="title">
      {frame.chapter ? (
        <p className="mb-0.5 text-[10px] font-medium tracking-[0.16em] text-white/50 uppercase">
          {frame.chapter}
        </p>
      ) : null}
      <p className="truncate text-[11px] font-semibold tracking-[0.14em] text-white uppercase">
        {frame.name}
      </p>
    </div>
  );
}
