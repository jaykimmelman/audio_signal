import { useApp } from "../state";
import { Panel } from "./Panel";

export function IncidentsList() {
  const { signals, teachersById, schoolsById, setSelectedSignalId, selectedSignalId } = useApp();

  const sorted = [...signals].sort((a, b) =>
    a.lesson_datetime < b.lesson_datetime ? 1 : -1,
  );

  return (
    <Panel title={`Incidents · ${signals.length}`} right={<span className="text-accent">LIVE</span>}>
      <ul className="divide-y divide-line">
        {sorted.map((s) => {
          const teacher = teachersById[s.employee_id];
          const school = schoolsById[s.school_id];
          const active = selectedSignalId === s.signal_id;
          return (
            <li key={s.signal_id}>
              <button
                onClick={() => setSelectedSignalId(s.signal_id)}
                className={`w-full text-left px-3 py-2 hover:bg-panel2 transition ${active ? "bg-panel2" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-alert">
                    {s.keyword.toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] text-muted">
                    {new Date(s.lesson_datetime).toLocaleString("en-GB", {
                      hour12: false,
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-sm text-text truncate">{teacher?.name ?? "Unknown"}</div>
                <div className="text-xs text-muted truncate">
                  {school?.name} · {school?.lga}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
