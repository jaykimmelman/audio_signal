import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { School, Signal, Teacher } from "./types";

interface AppData {
  teachers: Teacher[];
  schools: School[];
  signals: Signal[];
  keywords: string[];
  teachersById: Record<string, Teacher>;
  schoolsById: Record<string, School>;
}

interface AppState extends AppData {
  loaded: boolean;
  selectedSignalId: string | null;
  setSelectedSignalId: (id: string | null) => void;
}

const Ctx = createContext<AppState | null>(null);

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

async function loadJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadJSON<Teacher[]>("data/teachers.json"),
      loadJSON<School[]>("data/schools.json"),
      loadJSON<Signal[]>("data/signals.json"),
      loadJSON<string[]>("data/keywords.json"),
    ]).then(([teachers, schools, signals, keywords]) => {
      if (cancelled) return;
      setData({
        teachers,
        schools,
        signals,
        keywords,
        teachersById: Object.fromEntries(teachers.map((t) => [t.employee_id, t])),
        schoolsById: Object.fromEntries(schools.map((s) => [s.school_id, s])),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AppState>(() => {
    if (!data) {
      return {
        teachers: [],
        schools: [],
        signals: [],
        keywords: [],
        teachersById: {},
        schoolsById: {},
        loaded: false,
        selectedSignalId,
        setSelectedSignalId,
      };
    }
    return { ...data, loaded: true, selectedSignalId, setSelectedSignalId };
  }, [data, selectedSignalId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}
