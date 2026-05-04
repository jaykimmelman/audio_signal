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
  const { loaded, selectedSignalId } = useApp();

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
  return (
    <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden scanline">
      <div className="col-span-12 lg:col-span-7 min-h-0 relative">
        <SignalMap />
        <div className="absolute top-3 left-3 bottom-3 w-72 z-20">
          <TeacherProfile />
        </div>
      </div>
      <div className="col-span-12 lg:col-span-5 min-h-0">
        <TranscriptPane />
      </div>
    </div>
  );
}
