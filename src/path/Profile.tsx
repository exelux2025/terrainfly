import type { PathPieceProps } from "./types";

export function PathProfile({ frame, accent }: PathPieceProps) {
  const width = 160;
  const height = 36;
  const last = Math.max(1, frame.profile.length - 1);
  const points = frame.profile
    .map((value, index) => {
      const x = (index / last) * width;
      const y = height - value * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const playX = (frame.profileIndex / last) * width;
  const playY =
    height - (frame.profile[frame.profileIndex] ?? 0) * (height - 4) - 2;

  return (
    <div data-path-slot="profile" className="pt-1">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
        Elevation
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-9 w-full overflow-visible"
        aria-hidden
      >
        <polyline
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.5"
          points={points}
        />
        <polyline
          fill="none"
          stroke={accent}
          strokeWidth="2"
          points={frame.profile
            .slice(0, frame.profileIndex + 1)
            .map((value, index) => {
              const x = (index / last) * width;
              const y = height - value * (height - 4) - 2;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ")}
        />
        <circle cx={playX} cy={playY} r="2.6" fill={accent} />
      </svg>
    </div>
  );
}
