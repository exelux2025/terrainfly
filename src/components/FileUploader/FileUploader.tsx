"use client";

type FileUploaderProps = {
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onSample: () => void;
};

export function FileUploader({ busy, error, onFile, onSample }: FileUploaderProps) {
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
        <span className="text-sm font-medium text-zinc-100">
          Drop a Garmin FIT, GPX, or TCX file
        </span>
        <span className="mt-1 text-xs text-zinc-400">or click to browse</span>
      </label>
      <button
        type="button"
        onClick={onSample}
        disabled={busy}
        className="w-full rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-orange-400 disabled:opacity-50"
      >
        {busy ? "Loading…" : "Load local sample"}
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
