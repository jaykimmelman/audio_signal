import { useApp } from "../state";
import { useAnimatedNumber } from "../lib/useAnimatedNumber";

export function KPITiles() {
  const { signals, schoolsById } = useApp();

  const totalSignals = signals.length;
  const criticalSignals = signals.filter((s) => s.severity === "high").length;
  const schoolsHit = new Set(signals.map((s) => s.school_id)).size;
  const lgasHit = new Set(
    signals.map((s) => schoolsById[s.school_id]?.lga).filter(Boolean),
  ).size;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Tile label="Total Signals" value={totalSignals} />
      <Tile
        label="Critical Signals"
        value={criticalSignals}
        accent="alert"
        sub={criticalSignals > 0 ? "high-severity keywords matched" : "none"}
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
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
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
      {sub && <div className="mt-1 text-xs font-mono text-muted">{sub}</div>}
    </div>
  );
}
