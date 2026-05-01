import { useApp } from "../state";

export function Header() {
  const { signals, selectedSignalId, setSelectedSignalId } = useApp();
  const now = new Date().toLocaleString("en-GB", {
    hour12: false,
    timeZone: "Africa/Lagos",
  });

  return (
    <header className="h-12 shrink-0 border-b border-line bg-panel flex items-center justify-between px-4 font-mono text-xs uppercase tracking-widest">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-alert pulse" />
          <span className="text-text font-bold">SIGNAL · SURVEILLANCE CONSOLE</span>
        </div>
        <span className="text-muted">CLEARANCE: TS//SI//ORCON</span>
        <span className="text-muted">FEED: KWARA-LEARN</span>
      </div>
      <div className="flex items-center gap-4">
        {selectedSignalId && (
          <button
            onClick={() => setSelectedSignalId(null)}
            className="text-accent hover:text-text border border-line px-2 py-0.5 rounded"
          >
            ◀ BACK TO OVERVIEW
          </button>
        )}
        <span className="text-muted">SIGNALS · {signals.length}</span>
        <span className="text-text">{now} WAT</span>
      </div>
    </header>
  );
}
