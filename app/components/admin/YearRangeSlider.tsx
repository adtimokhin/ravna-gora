const THUMB_CLASSES =
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto " +
  "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:bg-blue-2 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white " +
  "[&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer " +
  "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto " +
  "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full " +
  "[&::-moz-range-thumb]:bg-blue-2 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white " +
  "[&::-moz-range-thumb]:shadow [&::-moz-range-thumb]:cursor-pointer " +
  "[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent";

export function YearRangeSlider({
  from,
  to,
  min,
  max,
  onChange,
}: {
  from: number;
  to: number;
  min: number;
  max: number;
  onChange: (from: number, to: number) => void;
}) {
  const pctFrom = ((from - min) / (max - min)) * 100;
  const pctTo = ((to - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <div className="flex items-center justify-between">
        <p className="type-label text-gray-2 uppercase tracking-widest">Publication Years</p>
        <p className="type-caption text-black">
          {from} – {to}
        </p>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute left-0 right-0 h-1 bg-black/10 rounded-full" />
        <div
          className="absolute h-1 bg-blue-2 rounded-full"
          style={{ left: `${pctFrom}%`, right: `${100 - pctTo}%` }}
        />
        <input
          type="range"
          aria-label="From year"
          min={min}
          max={max}
          value={from}
          onChange={(e) => onChange(Math.min(Number(e.target.value), to), to)}
          className={`absolute w-full h-5 m-0 appearance-none bg-transparent pointer-events-none z-10 ${THUMB_CLASSES}`}
        />
        <input
          type="range"
          aria-label="To year"
          min={min}
          max={max}
          value={to}
          onChange={(e) => onChange(from, Math.max(Number(e.target.value), from))}
          className={`absolute w-full h-5 m-0 appearance-none bg-transparent pointer-events-none z-20 ${THUMB_CLASSES}`}
        />
      </div>
    </div>
  );
}
