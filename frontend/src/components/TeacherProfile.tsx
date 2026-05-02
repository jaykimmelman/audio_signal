import { useApp } from "../state";
import { Panel } from "./Panel";

export function TeacherProfile() {
  const { selectedSignalId, allSignals, teachersById, schoolsById } = useApp();
  const sig = allSignals.find((s) => s.signal_id === selectedSignalId);
  const teacher = sig ? teachersById[sig.employee_id] : null;
  const school = sig ? schoolsById[sig.school_id] : null;

  if (!sig || !teacher || !school) return null;

  return (
    <Panel
      title={`Subject · ${teacher.employee_id}`}
      right={<span className="font-mono text-[10px] text-alert">CLASSIFIED</span>}
    >
      <div className="p-3 flex gap-4 h-full">
        <div className="shrink-0 flex flex-col items-center">
          <Avatar src={teacher.headshot_url} alt={teacher.name} />
          <div className="mt-2 font-mono text-[10px] text-muted tracking-widest">SUBJECT</div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm flex-1 min-w-0">
          <Field label="Name"          value={teacher.name} />
          <Field label="Employee ID"   value={teacher.employee_id} />
          <Field label="School"        value={school.name} />
          <Field label="Grade / Class" value={teacher.grade} />
          <Field label="Town · LGA"    value={`${school.town} · ${school.lga}`} />
          <Field label="GPS"           value={`${school.lat.toFixed(5)}°N, ${school.lon.toFixed(5)}°E`} mono />
          <Field label="Phone"         value={teacher.phone} mono />
          <Field label="Hire Date"     value={teacher.hire_date} mono />
          <Field label="Last Training" value={teacher.last_training_date} mono />
          <Field label="Pupils"        value={String(teacher.pupils)} mono />
        </div>
      </div>
    </Panel>
  );
}

function Avatar({ src, alt }: { src?: string; alt: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className="w-32 h-32 rounded-full object-cover border-2 border-line"
      />
    );
  }
  return (
    <div
      className="w-32 h-32 rounded-full bg-panel2 border-2 border-line flex items-center justify-center text-muted"
      title={`No headshot on file for ${alt}`}
    >
      <svg viewBox="0 0 24 24" className="w-20 h-20" fill="currentColor" aria-hidden="true">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`text-text ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
