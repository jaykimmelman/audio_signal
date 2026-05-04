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
      translucent
    >
      <div className="p-3 flex flex-col items-center gap-3">
        <Avatar src={teacher.headshot_url} alt={teacher.name} />
        <div className="text-center">
          <div className="text-text font-semibold leading-tight">{teacher.name}</div>
          <div className="font-mono text-[10px] text-muted tracking-widest mt-0.5">
            {teacher.employee_id} · {teacher.grade}
          </div>
        </div>
        <div className="w-full grid grid-cols-1 gap-y-2 text-sm pt-1 border-t border-line">
          <Field label="School"        value={school.name} />
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
        className="w-24 h-24 rounded-full object-cover border-2 border-line"
      />
    );
  }
  return (
    <div
      className="w-24 h-24 rounded-full bg-panel2 border-2 border-line flex items-center justify-center text-muted"
      title={`No headshot on file for ${alt}`}
    >
      <svg viewBox="0 0 24 24" className="w-16 h-16" fill="currentColor" aria-hidden="true">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`text-text ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</div>
    </div>
  );
}
