import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Lesson, School, Signal, Teacher } from "./types";

export interface Filters {
  lgas: string[];
  keywords: string[];
  schoolId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

const EMPTY_FILTERS: Filters = {
  lgas: [],
  keywords: [],
  schoolId: null,
  dateFrom: null,
  dateTo: null,
};

const STORAGE_KEY = "audio_signal:keywords";

interface RawData {
  teachers: Teacher[];
  schools: School[];
  lessons: Lesson[];
  defaultKeywords: string[];
  teachersById: Record<string, Teacher>;
  schoolsById: Record<string, School>;
  lessonsById: Record<string, Lesson>;
}

interface AppState {
  loaded: boolean;
  teachers: Teacher[];
  schools: School[];
  lessons: Lesson[];
  lessonsById: Record<string, Lesson>;
  teachersById: Record<string, Teacher>;
  schoolsById: Record<string, School>;
  signals: Signal[];        // filtered
  allSignals: Signal[];     // unfiltered (current keywords applied)
  /** Current effective watchlist — custom edit if any, else default. */
  keywords: string[];
  /** Default watchlist as shipped from server (read-only). */
  defaultKeywords: string[];
  /** True when user has overridden the default watchlist. */
  hasCustomKeywords: boolean;
  setCustomKeywords: (kws: string[]) => void;
  resetKeywords: () => void;
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

function loadStoredKeywords(): string[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stableSignalId(lessonId: string, segmentIndex: number): string {
  return `${lessonId}::${segmentIndex}`;
}

function deriveSignals(lessons: Lesson[], keywords: string[]): Signal[] {
  if (!keywords.length) return [];
  const patterns = keywords
    .map((kw) => kw.trim())
    .filter(Boolean)
    .map((kw) => ({ kw, re: new RegExp(`\\b${escapeRegex(kw)}\\b`, "i") }));
  if (!patterns.length) return [];

  const signals: Signal[] = [];
  for (const lesson of lessons) {
    for (let i = 0; i < lesson.segments.length; i++) {
      const text = lesson.segments[i].text;
      for (const { kw, re } of patterns) {
        if (re.test(text)) {
          signals.push({
            signal_id: stableSignalId(lesson.lesson_id, i),
            lesson_id: lesson.lesson_id,
            lesson_name: lesson.lesson_name,
            lesson_datetime: lesson.lesson_datetime,
            employee_id: lesson.employee_id,
            school_id: lesson.school_id,
            keyword: kw,
            snippet: text,
            segment_index: i,
            segment_start: lesson.segments[i].start,
            segment_end: lesson.segments[i].end,
            audio_url: lesson.audio_url,
          });
          break; // one signal per segment, first matching keyword wins
        }
      }
    }
  }
  return signals;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RawData | null>(null);
  const [customKeywords, setCustomKeywordsState] = useState<string[] | null>(loadStoredKeywords);
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadJSON<Teacher[]>("data/teachers.json"),
      loadJSON<School[]>("data/schools.json"),
      loadJSON<Lesson[]>("data/lessons.json"),
      loadJSON<string[]>("data/keywords.json"),
    ]).then(([teachers, schools, lessons, defaultKeywords]) => {
      if (cancelled) return;
      setData({
        teachers,
        schools,
        lessons,
        defaultKeywords,
        teachersById: Object.fromEntries(teachers.map((t) => [t.employee_id, t])),
        schoolsById: Object.fromEntries(schools.map((s) => [s.school_id, s])),
        lessonsById: Object.fromEntries(lessons.map((l) => [l.lesson_id, l])),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveKeywords = customKeywords ?? data?.defaultKeywords ?? [];

  const allSignals = useMemo(
    () => (data ? deriveSignals(data.lessons, effectiveKeywords) : []),
    [data, effectiveKeywords],
  );

  const filteredSignals = useMemo(() => {
    if (!data) return [];
    const { lgas, keywords: kwFilter, schoolId, dateFrom, dateTo } = filters;
    const lgaSet = new Set(lgas);
    const kwSet = new Set(kwFilter);
    return allSignals.filter((s) => {
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
  }, [data, allSignals, filters]);

  // If the selected signal disappears (e.g., user removed its keyword), drop selection.
  useEffect(() => {
    if (!selectedSignalId) return;
    if (!allSignals.some((s) => s.signal_id === selectedSignalId)) {
      setSelectedSignalId(null);
    }
  }, [allSignals, selectedSignalId]);

  function setCustomKeywords(kws: string[]) {
    const cleaned = Array.from(
      new Set(kws.map((k) => k.trim().toLowerCase()).filter(Boolean)),
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } catch { /* ignore quota / disabled storage */ }
    setCustomKeywordsState(cleaned);
  }

  function resetKeywords() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
    setCustomKeywordsState(null);
  }

  const value = useMemo<AppState>(() => {
    if (!data) {
      return {
        loaded: false,
        teachers: [],
        schools: [],
        lessons: [],
        lessonsById: {},
        teachersById: {},
        schoolsById: {},
        signals: [],
        allSignals: [],
        keywords: [],
        defaultKeywords: [],
        hasCustomKeywords: false,
        setCustomKeywords,
        resetKeywords,
        filters,
        setFilters: () => {},
        resetFilters: () => {},
        selectedSignalId,
        setSelectedSignalId,
      };
    }
    return {
      loaded: true,
      teachers: data.teachers,
      schools: data.schools,
      lessons: data.lessons,
      lessonsById: data.lessonsById,
      teachersById: data.teachersById,
      schoolsById: data.schoolsById,
      signals: filteredSignals,
      allSignals,
      keywords: effectiveKeywords,
      defaultKeywords: data.defaultKeywords,
      hasCustomKeywords: customKeywords !== null,
      setCustomKeywords,
      resetKeywords,
      filters,
      setFilters: (patch) => setFiltersState((prev) => ({ ...prev, ...patch })),
      resetFilters: () => setFiltersState(EMPTY_FILTERS),
      selectedSignalId,
      setSelectedSignalId,
    };
  }, [data, allSignals, filteredSignals, effectiveKeywords, customKeywords, filters, selectedSignalId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}
