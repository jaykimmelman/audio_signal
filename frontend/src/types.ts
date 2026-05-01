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
}

export interface Signal {
  signal_id: string;
  lesson_id: string;
  lesson_name: string;
  lesson_datetime: string;
  employee_id: string;
  school_id: string;
  keyword: string;
  snippet: string;
  segment_start: number;
  segment_end: number;
  transcript_url: string;
  audio_url: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface Transcript {
  signal_id: string;
  lesson_id: string;
  segments: TranscriptSegment[];
  hit_segment_index: number;
  keyword: string;
}
