import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { School, Signal, Teacher } from "./types";

export interface Filters {
  lgas: string[];           // empty = all
  keywords: string[];       // empty = all
  schoolId: string | null;  // null = all
  dateFrom: string | null;  // YYYY-MM-DD
  dateTo: string | null;    // YYYY-MM-DD
}

const EMPTY_FILTERS: Filters = {
  lgas: [],
  keywords: [],
  schoolId: null,
  dateFrom: null,
  dateTo: null,
};

interface RawData {
  teachers: Teacher[];
  schools: School[];
  allSignals: Signal[];
  keywords: string[];
  teachersById: Record<string, Teacher>;
  schoolsById: Record<string, School>;
}

interface AppState extends Omit<RawData, "allSignals"> {
  loaded: boolean;
  signals: Signal[];        // filtered
  allSignals: Signal[];     // unfiltered (for watchlist counts etc.)
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  resetFilters: () => void;
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
  const [data, setData] = useState<RawData | null>(null);
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
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
        allSignals: signals,
        keywords,
        teachersById: Object.fromEntries(teachers.map((t) => [t.employee_id, t])),
        schoolsById: Object.fromEntries(schools.map((s) => [s.school_id, s])),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSignals = useMemo(() => {
    if (!data) return [];
    const { lgas, keywords, schoolId, dateFrom, dateTo } = filters;
    const lgaSet = new Set(lgas);
    const kwSet = new Set(keywords);
    return data.allSignals.filter((s) => {
      if (schoolId && s.school_id !== schoolId) return false;
      if (kwSet.size && !kwSet.has(s.keyword)) return false;
      if (lgaSet.size) {
        const lga = data.schoolsById[s.school_id]?.lga;
        if (!lga || !lgaSet.has(lga)) return false;
      }
      const day = s.lesson_datetime.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [data, filters]);

  const value = useMemo<AppState>(() => {
    if (!data) {
      return {
        teachers: [],
        schools: [],
        signals: [],
        allSignals: [],
        keywords: [],
        teachersById: {},
        schoolsById: {},
        loaded: false,
        filters,
        setFilters: () => {},
        resetFilters: () => {},
        selectedSignalId,
        setSelectedSignalId,
      };
    }
    return {
      teachers: data.teachers,
      schools: data.schools,
      keywords: data.keywords,
      teachersById: data.teachersById,
      schoolsById: data.schoolsById,
      signals: filteredSignals,
      allSignals: data.allSignals,
      loaded: true,
      filters,
      setFilters: (patch) => setFiltersState((prev) => ({ ...prev, ...patch })),
      resetFilters: () => setFiltersState(EMPTY_FILTERS),
      selectedSignalId,
      setSelectedSignalId,
    };
  }, [data, filters, filteredSignals, selectedSignalId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}
