import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { KeywordMeta, Lesson, School, Severity, Signal, Teacher } from "./types";

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
  defaultKeywords: KeywordMeta[];
  analyses: Record<string, string>;
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
  keywords: KeywordMeta[];
  defaultKeywords: KeywordMeta[];
  hasCustomKeywords: boolean;
  setCustomKeywords: (kws: KeywordMeta[]) => void;
  resetKeywords: () => void;
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  resetFilters: () => void;
  selectedSignalId: string | null;
  setSelectedSignalId: (id: string | null) => void;
  selectedDate: string | null;
  setSelectedDate: (d: string | null) => void;
  mapAnimating: boolean;
  setMapAnimating: (v: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

async function loadJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

function loadStoredKeywords(): KeywordMeta[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    // Migrate old string-array format to new {keyword, severity} format
    if (arr.length === 0) return [];
    if (typeof arr[0] === "string") {
      return arr.map((k: string) => ({ keyword: k, severity: "medium" as Severity }));
    }
    return arr.filter((x) => x && typeof x.keyword === "string");
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

function deriveSignals(
  lessons: Lesson[],
  keywords: KeywordMeta[],
  analyses: Record<string, string>,
): Signal[] {
  if (!keywords.length) return [];
  const patterns = keywords
    .filter((k) => k.keyword?.trim())
    .map((k) => ({
      kw: k.keyword.trim(),
      severity: k.severity,
      re: new RegExp(`\\b${escapeRegex(k.keyword.trim())}\\b`, "i"),
    }));
  if (!patterns.length) return [];

  const signals: Signal[] = [];
  for (const lesson of lessons) {
    for (let i = 0; i < lesson.segments.length; i++) {
      const seg = lesson.segments[i];
      const haystack = `${seg.text} ${seg.text_en ?? ""}`;
      for (const { kw, severity, re } of patterns) {
        if (re.test(haystack)) {
          const signalId = stableSignalId(lesson.lesson_id, i);
          signals.push({
            signal_id: signalId,
            lesson_id: lesson.lesson_id,
            lesson_name: lesson.lesson_name,
            lesson_datetime: lesson.lesson_datetime,
            employee_id: lesson.employee_id,
            school_id: lesson.school_id,
            keyword: kw,
            severity,
            snippet: seg.text,
            segment_index: i,
            segment_start: seg.start,
            segment_end: seg.end,
            audio_url: lesson.audio_url,
            audio_variants: lesson.audio_variants ?? { original: lesson.audio_url },
            analysis: analyses[signalId],
          });
          break;
        }
      }
    }
  }
  return signals;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RawData | null>(null);
  const [customKeywords, setCustomKeywordsState] = useState<KeywordMeta[] | null>(loadStoredKeywords);
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mapAnimating, setMapAnimating] = useState(false);

  useEffect(() => {
    if (selectedSignalId) setMapAnimating(true);
  }, [selectedSignalId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadJSON<Teacher[]>("data/teachers.json"),
      loadJSON<School[]>("data/schools.json"),
      loadJSON<Lesson[]>("data/lessons.json"),
      loadJSON<unknown>("data/keywords.json"),
      loadJSON<Record<string, string>>("data/analyses.json").catch(() => ({})),
    ]).then(([teachers, schools, lessons, kwRaw, analyses]) => {
      if (cancelled) return;
      // keywords.json may be either old (string[]) or new ({keyword, severity}[])
      let defaultKeywords: KeywordMeta[];
      if (Array.isArray(kwRaw) && kwRaw.length === 0) {
        defaultKeywords = [];
      } else if (Array.isArray(kwRaw) && typeof kwRaw[0] === "string") {
        defaultKeywords = (kwRaw as string[]).map((k) => ({ keyword: k, severity: "medium" as Severity }));
      } else {
        defaultKeywords = kwRaw as KeywordMeta[];
      }
      setData({
        teachers,
        schools,
        lessons,
        defaultKeywords,
        analyses,
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
    () => (data ? deriveSignals(data.lessons, effectiveKeywords, data.analyses) : []),
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

  useEffect(() => {
    if (!selectedSignalId) return;
    if (!allSignals.some((s) => s.signal_id === selectedSignalId)) {
      setSelectedSignalId(null);
    }
  }, [allSignals, selectedSignalId]);

  function setCustomKeywords(kws: KeywordMeta[]) {
    const seen = new Set<string>();
    const cleaned: KeywordMeta[] = [];
    for (const k of kws) {
      const w = (k.keyword || "").trim().toLowerCase();
      if (!w || seen.has(w)) continue;
      seen.add(w);
      cleaned.push({ keyword: w, severity: k.severity || "medium" });
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } catch { /* ignore */ }
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
        selectedDate,
        setSelectedDate,
        mapAnimating,
        setMapAnimating,
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
      selectedDate,
      setSelectedDate,
      mapAnimating,
      setMapAnimating,
    };
  }, [data, allSignals, filteredSignals, effectiveKeywords, customKeywords, filters, selectedSignalId, selectedDate, mapAnimating]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}
