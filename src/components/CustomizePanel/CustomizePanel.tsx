"use client";

import { MAX_PITCH, MAX_ZOOM, MIN_PITCH, MIN_ZOOM } from "@/lib/animation/followRoute";
import {
  LOOKS,
  LOOK_IDS,
  MAX_BRIGHTNESS,
  MAX_EXAGGERATION,
  MIN_BRIGHTNESS,
  MIN_EXAGGERATION,
  ROUTE_COLOR_IDS,
  ROUTE_PALETTES,
  type RouteColorId,
  type TerrainLookId,
} from "@/lib/terrain/looks";

type CustomizePanelProps = {
  lookId: TerrainLookId;
  exaggeration: number;
  brightness: number;
  routeColor: RouteColorId;
  showMapLabels: boolean;
  zoom: number;
  pitch: number;
  onExaggeration: (value: number) => void;
  onBrightness: (value: number) => void;
  onRouteColor: (value: RouteColorId) => void;
  onShowMapLabels: (value: boolean) => void;
  onZoom: (value: number) => void;
  onPitch: (value: number) => void;
  onLookChange: (id: TerrainLookId) => void;
  onReset: () => void;
  onClose: () => void;
};

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-zinc-400">
        {label}
        <span className="tabular-nums text-zinc-200">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="tf-slider"
      />
    </label>
  );
}

export function CustomizePanel({
  lookId,
  exaggeration,
  brightness,
  routeColor,
  showMapLabels,
  zoom,
  pitch,
  onExaggeration,
  onBrightness,
  onRouteColor,
  onShowMapLabels,
  onZoom,
  onPitch,
  onLookChange,
  onReset,
  onClose,
}: CustomizePanelProps) {
  const look = LOOKS[lookId];

  return (
    <div className="w-[min(100%,20rem)] rounded-2xl border border-white/10 bg-zinc-950/88 p-4 text-zinc-100 shadow-2xl backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-orange-300">
            Customize
          </p>
          <p className="text-sm font-semibold">{look.label} look</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
        >
          Close
        </button>
      </div>

      <div className="space-y-3">
        <SliderRow
          label="Relief"
          value={exaggeration}
          display={`${exaggeration.toFixed(1)}×`}
          min={MIN_EXAGGERATION}
          max={MAX_EXAGGERATION}
          step={0.05}
          onChange={onExaggeration}
        />
        <SliderRow
          label="Brightness"
          value={brightness}
          display={`${Math.round(brightness * 100)}%`}
          min={MIN_BRIGHTNESS}
          max={MAX_BRIGHTNESS}
          step={0.01}
          onChange={onBrightness}
        />
        <SliderRow
          label="Zoom"
          value={zoom}
          display={zoom.toFixed(1)}
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.1}
          onChange={onZoom}
        />
        <SliderRow
          label="Tilt"
          value={pitch}
          display={`${Math.round(pitch)}°`}
          min={MIN_PITCH}
          max={MAX_PITCH}
          step={1}
          onChange={onPitch}
        />
      </div>

      <p className="mt-4 mb-2 text-[10px] uppercase tracking-wide text-zinc-400">Look</p>
      <div className="mb-3 flex gap-1.5">
        {LOOK_IDS.map((id) => {
          const option = LOOKS[id];
          const selected = lookId === id;
          return (
            <button
              key={id}
              type="button"
              title={option.label}
              aria-label={option.label}
              onClick={() => onLookChange(id)}
              className={`h-7 w-7 rounded-lg border-2 ${
                selected ? "border-white" : "border-white/20 hover:border-white/50"
              }`}
              style={{ background: option.swatch }}
            />
          );
        })}
      </div>

      <p className="mt-4 mb-2 text-[10px] uppercase tracking-wide text-zinc-400">Route color</p>
      <div className="flex gap-2">
        {ROUTE_COLOR_IDS.map((id) => {
          const palette = ROUTE_PALETTES[id];
          const selected = routeColor === id;
          return (
            <button
              key={id}
              type="button"
              title={palette.label}
              aria-label={palette.label}
              onClick={() => onRouteColor(id)}
              className={`h-7 w-7 rounded-full border-2 transition ${
                selected ? "border-white scale-110" : "border-white/20 hover:border-white/50"
              }`}
              style={{ background: palette.line }}
            />
          );
        })}
      </div>

      <label className="mt-4 flex items-center justify-between gap-3 text-xs text-zinc-200">
        Map labels
        <input
          type="checkbox"
          checked={showMapLabels}
          onChange={(event) => onShowMapLabels(event.target.checked)}
          className="h-4 w-4 accent-orange-500"
        />
      </label>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 w-full rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/15"
      >
        Reset {look.label} defaults
      </button>
    </div>
  );
}
