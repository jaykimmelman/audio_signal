import { useApp } from "../state";
import { useAnimatedNumber } from "../lib/useAnimatedNumber";

export function KPITiles() {
  const { signals, schoolsById } = useApp();

  const totalSignals = signals.length;
  const schoolsHit = new Set(signals.map((s) => s.school_id)).size;
  const lgasHit = new Set(
    signals.map((s) => schoolsById[s.school_id]?.lga).filter(Boolean),
  ).size;

  const byDay = new Map<string, number>();
  for (const s of signals) {
    const d = s.lesson_datetime.slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  const days = [...byDay.keys()].sort();
  const last = byDay.get(days.at(-1) ?? "") ?? 0;
  const prev = byDay.get(days.at(-2) ?? "") ?? 0;
  const change = prev === 0 ? 0 : ((last - prev) / prev) * 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Tile label="Total Signals" value={totalSignals} accent="alert" />
      <Tile
        label="Signal Daily Trend"
        value={last}
        sub={`${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs prior day`}
        subColor={change > 0 ? "text-alert" : "text-accent"}
      />
      <Tile label="Schools with Signals" value={schoolsHit} />
      <Tile label="LGAs with Signals" value={lgasHit} />
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  subColor,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  subColor?: string;
  accent?: "alert" | "accent";
}) {
  const animated = useAnimatedNumber(value);
  return (
    <div className="bg-panel border border-line rounded p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div
        className={`mt-1 text-4xl font-bold font-mono tabular-nums ${
          accent === "alert" ? "text-alert" : "text-text"
        }`}
      >
        {animated}
      </div>
      {sub && <div className={`mt-1 text-xs font-mono ${subColor ?? "text-muted"}`}>{sub}</div>}
    </div>
  );
}
