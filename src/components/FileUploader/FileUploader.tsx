"use client";

type FileUploaderProps = {
  busy: boolean;
  error: string | null;
  compact?: boolean;
  onFile: (file: File) => void;
  onSample: () => void;
  onPath: () => void;
};

export function FileUploader({
  busy,
  error,
  compact = false,
  onFile,
  onSample,
  onPath,
}: FileUploaderProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-100 hover:bg-white/15">
          Replace track
          <input
            type="file"
            accept=".gpx,.fit,.tcx,application/gpx+xml"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={onSample}
          disabled={busy}
          className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-100 hover:bg-white/15 disabled:opacity-50"
        >
          Sample
        </button>
        <button
          type="button"
          onClick={onPath}
          disabled={busy}
          className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-100 hover:bg-white/15 disabled:opacity-50"
        >
          Path
        </button>
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/25 px-4 py-5 text-center transition hover:border-orange-400/70 hover:bg-black/35"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) onFile(file);
        }}
      >
        <input
          type="file"
          accept=".gpx,.fit,.tcx,application/gpx+xml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
        <span className="text-sm font-medium text-zinc-100">Drop a Garmin FIT, GPX, or TCX</span>
        <span className="mt-1 text-xs text-zinc-400">or click to browse</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onSample}
          disabled={busy}
          className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-orange-400 disabled:opacity-50"
        >
          {busy ? "Loading…" : "Load local sample"}
        </button>
        <button
          type="button"
          onClick={onPath}
          disabled={busy}
          className="rounded-lg bg-white/12 px-3 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/18 disabled:opacity-50"
        >
          {busy ? "Loading…" : "Load local path"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
