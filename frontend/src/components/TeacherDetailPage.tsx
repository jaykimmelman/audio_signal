import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "../state";
import { Severity, SEVERITY_WEIGHT } from "../types";

const SEVERITY_DOT: Record<Severity, string> = {
  high: "bg-alert",
  medium: "bg-warn",
  low: "bg-muted",
};

export function TeacherDetailPage({ teacherId }: { teacherId: string }) {
  const { teachersById, schoolsById, lessons, allSignals, setSelectedSignalId } = useApp();
  const teacher = teachersById[teacherId];
  const school = teacher ? schoolsById[teacher.school_id] : null;

  const teacherLessons = useMemo(
    () => lessons.filter((l) => l.employee_id === teacherId)
      .sort((a, b) => (a.lesson_datetime < b.lesson_datetime ? 1 : -1)),
    [lessons, teacherId],
  );

  const teacherSignals = useMemo(
    () => allSignals.filter((s) => s.employee_id === teacherId)
      .sort((a, b) => {
        const wd = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
        if (wd !== 0) return wd;
        return a.lesson_datetime < b.lesson_datetime ? 1 : -1;
      }),
    [allSignals, teacherId],
  );

  // Trend: signals per ISO week
  const trend = useMemo(() => {
    const byWeek = new Map<string, { date: string; count: number; high: number }>();
    for (const s of teacherSignals) {
      const d = new Date(s.lesson_datetime);
      const yyyy = d.getUTCFullYear();
      const week = isoWeek(d);
      const key = `${yyyy}-W${String(week).padStart(2, "0")}`;
      const prev = byWeek.get(key) ?? { date: key, count: 0, high: 0 };
      prev.count += 1;
      if (s.severity === "high") prev.high += 1;
      byWeek.set(key, prev);
    }
    return [...byWeek.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [teacherSignals]);

  const totalRisk = teacherSignals.reduce((sum, s) => sum + SEVERITY_WEIGHT[s.severity], 0);
  const critCount = teacherSignals.filter((s) => s.severity === "high").length;

  if (!teacher) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-muted font-mono text-sm">
        Teacher <span className="font-mono text-text mx-1">{teacherId}</span> not found.{" "}
        <a href="#" className="text-accent ml-2 underline">back</a>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6 scanline">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header card */}
        <div className="bg-panel border border-line rounded p-6 flex gap-6 items-start">
          <Avatar src={teacher.headshot_url} alt={teacher.name} />
          <div className="flex-1 space-y-3">
            <div>
              <div className="font-mono text-[10px] tracking-widest text-muted">SUBJECT DOSSIER</div>
              <h1 className="text-3xl font-bold text-text">{teacher.name}</h1>
              <div className="font-mono text-xs text-muted mt-1">
                {teacher.employee_id} · {teacher.grade} · {school?.name}, {school?.lga}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <Stat label="Total Lessons" value={teacherLessons.length} />
              <Stat label="Total Signals" value={teacherSignals.length} />
              <Stat label="Critical" value={critCount} accent={critCount > 0 ? "alert" : undefined} />
              <Stat label="Risk Score" value={totalRisk} />
            </div>
          </div>
        </div>

        {/* Trend chart */}
        <div className="bg-panel border border-line rounded">
          <div className="border-b border-line px-4 py-2 font-mono text-[11px] tracking-widest uppercase text-muted">
            Signal trend · per ISO week
          </div>
          <div className="h-48 p-2">
            {trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted italic">no signals to plot</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid stroke="#1f2a44" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#7a8aa6" fontSize={11} />
                  <YAxis stroke="#7a8aa6" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#0b1220", border: "1px solid #1f2a44", fontSize: 12 }}
                    labelStyle={{ color: "#d6e1f2" }}
                  />
                  <Line type="monotone" dataKey="count" name="all" stroke="#7a8aa6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="high" name="critical" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lessons list */}
        <div className="bg-panel border border-line rounded">
          <div className="border-b border-line px-4 py-2 font-mono text-[11px] tracking-widest uppercase text-muted">
            Lessons · {teacherLessons.length}
          </div>
          <div className="divide-y divide-line">
            {teacherLessons.map((l) => {
              const lessonSignals = teacherSignals.filter((s) => s.lesson_id === l.lesson_id);
              return (
                <div key={l.lesson_id} className="px-4 py-2 flex items-center justify-between hover:bg-panel2">
                  <div className="min-w-0">
                    <div className="text-sm text-text truncate">{l.lesson_name}</div>
                    <div className="font-mono text-[10px] text-muted">
                      {new Date(l.lesson_datetime).toLocaleString("en-GB", { hour12: false })}
                      {" · "}{l.segments.length} segments
                      {" · "}{l.duration ? `${Math.round(l.duration / 60)} min` : ""}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-alert tabular-nums">
                    {lessonSignals.length} signal{lessonSignals.length === 1 ? "" : "s"}
                  </div>
                </div>
              );
            })}
            {teacherLessons.length === 0 && (
              <div className="p-6 text-center text-muted italic text-sm">no lessons recorded for this teacher</div>
            )}
          </div>
        </div>

        {/* Signals list */}
        <div className="bg-panel border border-line rounded">
          <div className="border-b border-line px-4 py-2 font-mono text-[11px] tracking-widest uppercase text-muted">
            Signals · {teacherSignals.length}
          </div>
          <div className="divide-y divide-line max-h-[480px] overflow-auto">
            {teacherSignals.map((s) => (
              <button
                key={s.signal_id}
                onClick={() => {
                  setSelectedSignalId(s.signal_id);
                  window.location.hash = "";
                }}
                className="w-full text-left px-4 py-2 hover:bg-panel2"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[s.severity]}`} />
                    <span className="font-mono text-[11px] uppercase text-alert">{s.keyword}</span>
                    <span className="font-mono text-[9px] uppercase text-muted">{s.severity}</span>
                  </span>
                  <span className="font-mono text-[10px] text-muted">
                    {new Date(s.lesson_datetime).toLocaleString("en-GB", { hour12: false })}
                  </span>
                </div>
                <div className="text-sm text-text mt-1 truncate">{s.snippet}</div>
                {s.analysis && (
                  <div className="text-xs text-muted mt-1 italic line-clamp-2">▸ {s.analysis}</div>
                )}
              </button>
            ))}
            {teacherSignals.length === 0 && (
              <div className="p-6 text-center text-muted italic text-sm">no signals for this teacher under the current watchlist</div>
            )}
          </div>
        </div>

        {/* Profile metadata */}
        <div className="bg-panel2 border border-line rounded p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Field label="Phone" value={teacher.phone} mono />
          <Field label="Hire Date" value={teacher.hire_date} mono />
          <Field label="Last Training" value={teacher.last_training_date} mono />
          <Field label="Pupils" value={String(teacher.pupils)} mono />
          <Field label="Town · LGA" value={`${school?.town ?? ""} · ${school?.lga ?? ""}`} />
          <Field label="GPS" value={school ? `${school.lat.toFixed(5)}°N, ${school.lon.toFixed(5)}°E` : "—"} mono />
        </div>
      </div>
    </div>
  );
}

function Avatar({ src, alt }: { src?: string; alt: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className="w-32 h-32 rounded-full object-cover border-2 border-line shrink-0"
      />
    );
  }
  return (
    <div className="w-32 h-32 rounded-full bg-panel2 border-2 border-line flex items-center justify-center text-muted shrink-0">
      <svg viewBox="0 0 24 24" className="w-20 h-20" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: { label: string; value: number; accent?: "alert" }) {
  return (
    <div className="bg-panel2 border border-line rounded px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`text-2xl font-bold font-mono tabular-nums ${accent === "alert" ? "text-alert" : "text-text"}`}>
        {value}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`text-text ${mono ? "font-mono text-xs" : "text-sm"}`}>{value || "—"}</div>
    </div>
  );
}

function isoWeek(d: Date): number {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
