import { useMemo } from "react";
import { useApp } from "../state";
import { Panel } from "./Panel";

export function DailySignalsTable() {
  const { signals } = useApp();

  const rows = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of signals) {
      const d = s.lesson_datetime.slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [signals]);

  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Panel title="Signals per Day">
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-widest text-muted sticky top-0 bg-panel">
          <tr className="border-b border-line">
            <th className="text-left px-3 py-1.5">Date</th>
            <th className="text-right px-3 py-1.5">Signals</th>
          </tr>
        </thead>
        <tbody className="font-mono text-xs">
          {rows.map((r) => (
            <tr key={r.date} className="border-b border-line/60">
              <td className="px-3 py-1.5 text-text">{r.date}</td>
              <td className="px-3 py-1.5 text-right">
                <div className="inline-flex items-center gap-2">
                  <div className="w-40 h-1.5 bg-panel2 rounded">
                    <div
                      className="h-full bg-warn rounded"
                      style={{ width: `${(r.count / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-text w-8 text-right">{r.count}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
