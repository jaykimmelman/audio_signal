import { useEffect, useState } from "react";
import { useApp } from "../state";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatUTC(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mon = MONTHS[d.getUTCMonth()];
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${dd} ${mon} ${yyyy} ${hh}:${mm}:${ss}Z`;
}

export function Header() {
  const { signals, selectedSignalId, setSelectedSignalId } = useApp();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-12 shrink-0 border-b border-line bg-panel flex items-center justify-between px-4 font-mono text-xs uppercase tracking-widest">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-alert pulse" />
        <span className="text-text font-bold">SIGNAL · CONSOLE</span>
        <span className="text-muted">|</span>
        <span className="text-muted">SOURCE FEED: KENYA CLASSROOM DELIVERY AUDIO UPLOADS</span>
      </div>
      <div className="flex items-center gap-4">
        {selectedSignalId && (
          <button
            onClick={() => setSelectedSignalId(null)}
            title="Back to overview (Esc)"
            className="bg-accent text-ink hover:brightness-110 font-bold px-3 py-1 rounded shadow-sm flex items-center gap-1.5"
          >
            <span aria-hidden>◀</span>
            <span>BACK TO OVERVIEW</span>
            <kbd className="ml-1 px-1 text-[9px] bg-ink/30 text-ink rounded border border-ink/30">ESC</kbd>
          </button>
        )}
        <span className="text-muted">SIGNALS · {signals.length}</span>
        <span className="text-text tabular-nums">{formatUTC(now)}</span>
      </div>
    </header>
  );
}
