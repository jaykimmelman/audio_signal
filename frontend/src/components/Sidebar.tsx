import { useApp } from "../state";

const SECTIONS: { label: string; values: string[] }[] = [
  { label: "Time Period",     values: ["Last 30 days"] },
  { label: "Programme",       values: ["KwaraLEARN"] },
  { label: "Local Government", values: ["All (16)"] },
  { label: "Academic Year",   values: ["2025-2026"] },
  { label: "Term",            values: ["1", "2", "3"] },
  { label: "Signal Source",   values: ["Master Signal"] },
];

export function Sidebar() {
  const { keywords } = useApp();

  return (
    <aside className="w-64 shrink-0 border-r border-line bg-panel flex flex-col">
      <div className="h-12 border-b border-line flex items-center px-4 font-mono text-xs tracking-widest text-muted">
        FILTERS · APPLIED (4)
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3 text-sm">
        {SECTIONS.map((s) => (
          <div key={s.label}>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-1">
              {s.label}
            </div>
            <div className="bg-panel2 border border-line rounded px-2 py-1.5 text-text font-mono text-xs">
              {s.values.join(", ")}
            </div>
          </div>
        ))}

        <div className="pt-3 border-t border-line">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-1">
            Keyword Watchlist · {keywords.length}
          </div>
          <div className="flex flex-wrap gap-1">
            {keywords.map((k) => (
              <span
                key={k}
                className="bg-alert/15 border border-alert/40 text-alert font-mono text-[11px] px-1.5 py-0.5 rounded"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="p-3 border-t border-line flex gap-2">
        <button className="flex-1 bg-accent text-ink font-bold text-xs py-1.5 rounded hover:brightness-110">
          APPLY
        </button>
        <button className="flex-1 border border-line text-muted text-xs py-1.5 rounded hover:text-text">
          CLEAR
        </button>
      </div>
    </aside>
  );
}
