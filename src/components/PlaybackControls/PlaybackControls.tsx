"use client";

import { formatDistance } from "@/lib/format/activity";

export const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;
export type PlaybackSpeed = (typeof SPEED_OPTIONS)[number];

type PlaybackControlsProps = {
  enabled: boolean;
  playing: boolean;
  speed: PlaybackSpeed;
  progress: number;
  distanceKm: number;
  accent?: string;
  variant?: "full" | "mini";
  customizeOpen?: boolean;
  onToggle: () => void;
  onSpeed: (speed: PlaybackSpeed) => void;
  onSeek: (progress: number) => void;
  onCustomize?: () => void;
};

export function PlaybackControls({
  enabled,
  playing,
  speed,
  progress,
  distanceKm,
  accent = "#ff5a2a",
  variant = "full",
  customizeOpen = false,
  onToggle,
  onSpeed,
  onSeek,
  onCustomize,
}: PlaybackControlsProps) {
  const traveled = progress * distanceKm;
  const mini = variant === "mini";

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={!enabled}
          onClick={onToggle}
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-zinc-950 shadow-lg disabled:opacity-40"
          style={{ background: enabled ? accent : "#d4d4d8" }}
          aria-label={playing ? "Pause" : "Play flyover"}
        >
          {playing ? (
            <span className="flex gap-0.5">
              <span className="h-3.5 w-1 rounded-sm bg-zinc-950" />
              <span className="h-3.5 w-1 rounded-sm bg-zinc-950" />
            </span>
          ) : (
            <span className="ml-0.5 border-y-[7px] border-l-[11px] border-y-transparent border-l-zinc-950" />
          )}
        </button>

        {!mini ? (
          <div className="flex items-center gap-1">
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                disabled={!enabled}
                onClick={() => onSpeed(option)}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  speed === option ? "text-zinc-950" : "bg-white/10 text-zinc-200"
                } disabled:opacity-40`}
                style={speed === option ? { background: accent } : undefined}
              >
                {option}x
              </button>
            ))}
          </div>
        ) : null}

        <p className="ml-auto text-xs tabular-nums text-zinc-300">
          {enabled ? `${formatDistance(traveled)} / ${formatDistance(distanceKm)}` : "—"}
        </p>

        {!mini && onCustomize ? (
          <button
            type="button"
            disabled={!enabled}
            onClick={onCustomize}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
              customizeOpen ? "bg-white text-zinc-950" : "bg-white/10 text-zinc-100"
            } disabled:opacity-40`}
          >
            Camera
          </button>
        ) : null}
      </div>

      <label className="block">
        <span className="sr-only">Flyover timeline</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={Number.isFinite(progress) ? progress : 0}
          disabled={!enabled}
          onChange={(event) => onSeek(Number(event.target.value))}
          className="tf-slider"
          style={{ accentColor: accent }}
        />
      </label>
    </div>
  );
}
