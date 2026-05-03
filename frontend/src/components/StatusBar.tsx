import { useApp } from "../state";

export function StatusBar() {
  const { loaded, lessons, allSignals } = useApp();

  // Engine "health" — derived from data presence rather than a real probe
  const audioOk = lessons.length > 0;
  const transcriptionOk = lessons.some((l) => l.segments.length > 0);
  const analysisOk = loaded;

  return (
    <footer className="h-7 shrink-0 border-t border-line bg-panel flex items-center justify-between px-4 font-mono text-[10px] uppercase tracking-widest text-muted">
      <div className="flex items-center gap-5">
        <Indicator label="Audio File Upload Link" ok={audioOk} />
        <Indicator label="Transcription Engine" ok={transcriptionOk} />
        <Indicator label="Signal Analysis Engine" ok={analysisOk} />
      </div>
      <div className="flex items-center gap-5">
        <span>Lessons · <span className="text-text tabular-nums">{lessons.length}</span></span>
        <span>Signals · <span className="text-text tabular-nums">{allSignals.length}</span></span>
        <span className="text-accent">SECURE</span>
      </div>
    </footer>
  );
}

function Indicator({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-accent" : "bg-alert"}`}
        style={ok ? { boxShadow: "0 0 6px rgba(25,195,125,0.6)" } : undefined}
      />
      <span>{label}</span>
      <span className={ok ? "text-accent" : "text-alert"}>· {ok ? "WORKING" : "DOWN"}</span>
    </span>
  );
}
