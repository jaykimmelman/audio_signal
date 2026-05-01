import { useMemo } from "react";
import { useApp } from "../state";
import { Panel } from "./Panel";

export function HotspotsTable() {
  const { signals, schoolsById } = useApp();

  const rows = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    for (const s of signals) {
      const lga = schoolsById[s.school_id]?.lga ?? "Unknown";
      if (!counts.has(lga)) counts.set(lga, new Set());
      counts.get(lga)!.add(s.school_id);
    }
    return [...counts.entries()]
      .map(([lga, set]) => ({ lga, schools: set.size }))
      .sort((a, b) => b.schools - a.schools);
  }, [signals, schoolsById]);

  const max = Math.max(1, ...rows.map((r) => r.schools));

  return (
    <Panel title="Top Hotspots">
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-widest text-muted">
          <tr className="border-b border-line">
            <th className="text-left px-3 py-1.5">Local Government</th>
            <th className="text-right px-3 py-1.5">Schools</th>
          </tr>
        </thead>
        <tbody className="font-mono text-xs">
          {rows.map((r) => (
            <tr key={r.lga} className="border-b border-line/60">
              <td className="px-3 py-1.5 text-text">{r.lga}</td>
              <td className="px-3 py-1.5 text-right">
                <div className="inline-flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-panel2 rounded">
                    <div
                      className="h-full bg-alert rounded"
                      style={{ width: `${(r.schools / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-text w-6 text-right">{r.schools}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
