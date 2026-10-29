"use client";

export const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;
export type PlaybackSpeed = (typeof SPEED_OPTIONS)[number];

type PlaybackControlsProps = {
  enabled: boolean;
  playing: boolean;
  speed: PlaybackSpeed;
  onToggle: () => void;
  onSpeed: (speed: PlaybackSpeed) => void;
};

export function PlaybackControls({
  enabled,
  playing,
  speed,
  onToggle,
  onSpeed,
}: PlaybackControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={!enabled}
        onClick={onToggle}
        className="rounded-lg bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40"
      >
        {playing ? "Pause" : "Play flyover"}
      </button>
      <div className="flex items-center gap-1">
        {SPEED_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            disabled={!enabled}
            onClick={() => onSpeed(option)}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              speed === option
                ? "bg-orange-500 text-zinc-950"
                : "bg-white/10 text-zinc-200"
            } disabled:opacity-40`}
          >
            {option}x
          </button>
        ))}
      </div>
    </div>
  );
}
