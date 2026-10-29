type PathStatProps = {
  label: string;
  value: string;
};

export function PathStat({ label, value }: PathStatProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
        {label}
      </span>
      <span className="min-w-[4.5rem] text-right text-sm font-semibold tabular-nums text-white">
        {value}
      </span>
    </div>
  );
}
