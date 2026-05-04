import { useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { KPITiles } from "./components/KPITiles";
import { SignalMap } from "./components/SignalMap";
import { TimeSeriesChart } from "./components/TimeSeriesChart";
import { HotspotsTable } from "./components/HotspotsTable";
import { DailySignalsTable } from "./components/DailySignalsTable";
import { IncidentsList } from "./components/IncidentsList";
import { TeacherProfile } from "./components/TeacherProfile";
import { TranscriptPane } from "./components/TranscriptPane";
import { StatusBar } from "./components/StatusBar";
import { useApp } from "./state";

export default function App() {
  const { loaded, selectedSignalId, setSelectedSignalId } = useApp();

  useEffect(() => {
    if (!selectedSignalId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedSignalId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedSignalId, setSelectedSignalId]);

  return (
    <div className="h-full w-full flex bg-ink text-text font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        {!loaded ? (
          <div className="flex-1 flex items-center justify-center text-muted font-mono text-xs tracking-widest">
            ESTABLISHING SECURE LINK…
          </div>
        ) : selectedSignalId ? (
          <DetailLayout />
        ) : (
          <OverviewLayout />
        )}
        <StatusBar />
      </div>
    </div>
  );
}

function OverviewLayout() {
  const { selectedDate, signals } = useApp();
  const dateSignals = selectedDate
    ? signals.filter((s) => s.lesson_datetime.slice(0, 10) === selectedDate)
    : null;

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4 scanline">
      <KPITiles />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 h-[420px]">
          <SignalMap />
        </div>
        <div className="col-span-12 lg:col-span-4 h-[420px]">
          <IncidentsList />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 h-[300px]">
          <TimeSeriesChart />
        </div>
        <div className="col-span-12 lg:col-span-4 h-[300px]">
          {dateSignals ? (
            <IncidentsList
              signals={dateSignals}
              title={`Incidents on ${selectedDate} · ${dateSignals.length}`}
              emptyMessage="no signals on this day"
            />
          ) : (
            <HotspotsTable />
          )}
        </div>
      </div>
      <div className="h-[280px]">
        <DailySignalsTable />
      </div>
    </div>
  );
}

function DetailLayout() {
  const { mapAnimating, setSelectedSignalId } = useApp();
  return (
    <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden scanline">
      <div className="col-span-12 lg:col-span-7 min-h-0 relative">
        <SignalMap />
        <button
          onClick={() => setSelectedSignalId(null)}
          title="Back to overview (Esc)"
          className="absolute top-3 right-3 z-30 bg-accent text-ink hover:brightness-110 font-bold text-xs px-3 py-2 rounded shadow-lg flex items-center gap-2 font-mono tracking-widest uppercase"
        >
          <span aria-hidden>◀</span>
          <span>Back</span>
          <kbd className="px-1 text-[9px] bg-ink/30 text-ink rounded border border-ink/30">ESC</kbd>
        </button>
        <div
          className={`absolute top-3 left-3 bottom-3 w-72 z-20 transition-all duration-500 ease-out ${
            mapAnimating
              ? "opacity-0 -translate-x-3 pointer-events-none"
              : "opacity-100 translate-x-0"
          }`}
        >
          <TeacherProfile />
        </div>
      </div>
      <div className="col-span-12 lg:col-span-5 min-h-0">
        <TranscriptPane />
      </div>
    </div>
  );
}
