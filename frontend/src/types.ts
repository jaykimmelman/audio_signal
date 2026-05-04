export interface School {
  school_id: string;
  name: string;
  town: string;
  lga: string;
  lat: number;
  lon: number;
}

export interface Teacher {
  employee_id: string;
  name: string;
  school_id: string;
  grade: string;
  phone: string;
  hire_date: string;
  last_training_date: string;
  pupils: number;
  headshot_url?: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  /** ISO-639-1 language code Whisper used for this segment ("en" / "sw" / ...). */
  lang?: string;
  /** English translation when `lang` is non-English (e.g. "sw"). */
  text_en?: string;
}

export type AudioVariantKey = "original" | "denoised" | "gated" | "enhanced";

export type AudioVariants = Partial<Record<AudioVariantKey, string>> & {
  original: string;
};

export interface Lesson {
  lesson_id: string;
  lesson_name: string;
  lesson_datetime: string;
  employee_id: string;
  school_id: string;
  audio_url: string;
  audio_variants: AudioVariants;
  language: string | null;
  duration: number | null;
  segments: TranscriptSegment[];
}

export type Severity = "high" | "medium" | "low";

export interface KeywordMeta {
  keyword: string;
  severity: Severity;
}

export interface Signal {
  signal_id: string;
  lesson_id: string;
  lesson_name: string;
  lesson_datetime: string;
  employee_id: string;
  school_id: string;
  keyword: string;
  severity: Severity;
  snippet: string;
  segment_index: number;
  segment_start: number;
  segment_end: number;
  audio_url: string;
  audio_variants: AudioVariants;
  /** Server-side analyst summary (populated from analyses.json). */
  analysis?: string;
}

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  high: 10,
  medium: 3,
  low: 1,
};
