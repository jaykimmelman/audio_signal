import { useApp } from "../state";
import { Panel } from "./Panel";

export function TeacherProfile() {
  const { selectedSignalId, signals, teachersById, schoolsById } = useApp();
  const sig = signals.find((s) => s.signal_id === selectedSignalId);
  const teacher = sig ? teachersById[sig.employee_id] : null;
  const school = sig ? schoolsById[sig.school_id] : null;

  if (!sig || !teacher || !school) return null;

  return (
    <Panel
      title={`Subject · ${teacher.employee_id}`}
      right={<span className="font-mono text-[10px] text-alert">CLASSIFIED</span>}
    >
      <div className="p-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <Field label="Name"            value={teacher.name} />
        <Field label="Employee ID"     value={teacher.employee_id} />
        <Field label="School"          value={school.name} />
        <Field label="Grade / Class"   value={teacher.grade} />
        <Field label="Town · LGA"      value={`${school.town} · ${school.lga}`} />
        <Field label="GPS"             value={`${school.lat.toFixed(5)}°N, ${school.lon.toFixed(5)}°E`} mono />
        <Field label="Phone"           value={teacher.phone} mono />
        <Field label="Hire Date"       value={teacher.hire_date} mono />
        <Field label="Last Training"   value={teacher.last_training_date} mono />
        <Field label="Pupils"          value={String(teacher.pupils)} mono />
      </div>
    </Panel>
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
