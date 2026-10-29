"use client";

import { LOOKS, LOOK_IDS, type TerrainLookId } from "@/lib/terrain/looks";

type LookPickerProps = {
  value: TerrainLookId;
  onChange: (id: TerrainLookId) => void;
};

export function LookPicker({ value, onChange }: LookPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">
        Looks
      </p>
      <div className="flex flex-col gap-1.5">
        {LOOK_IDS.map((id) => {
          const look = LOOKS[id];
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`flex items-center gap-2.5 rounded-xl border px-2 py-1.5 text-left transition ${
                selected
                  ? "border-white/40 bg-white/15 shadow-lg"
                  : "border-white/10 bg-black/25 hover:border-white/25 hover:bg-black/40"
              }`}
            >
              <span
                className="h-8 w-8 shrink-0 rounded-lg border border-white/20 shadow-inner"
                style={{ background: look.swatch }}
              />
              <span>
                <span className="block text-xs font-semibold text-white">{look.label}</span>
                <span className="block text-[10px] text-white/55">{look.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
