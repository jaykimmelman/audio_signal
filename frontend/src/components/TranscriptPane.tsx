import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../state";
import { Panel } from "./Panel";
import { Waveform } from "./Waveform";
import { AudioVariantKey } from "../types";

const VARIANTS: { key: AudioVariantKey; label: string; hint: string }[] = [
  { key: "original", label: "ORIGINAL", hint: "Raw audio, no processing" },
  { key: "denoised", label: "DENOISE",  hint: "FFT noise reduction + bandpass" },
  { key: "gated",    label: "GATE",     hint: "Noise gate · attenuates below -32 dB" },
  { key: "enhanced", label: "SPEECH+",  hint: "Aggressive: EQ + denoise + compressor" },
];

export function TranscriptPane() {
  const { selectedSignalId, allSignals, lessonsById } = useApp();
  const sig = allSignals.find((s) => s.signal_id === selectedSignalId);
  const lesson = sig ? lessonsById[sig.lesson_id] : null;

  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [variant, setVariant] = useState<AudioVariantKey>("original");
  const hitRowRef = useRef<HTMLDivElement | null>(null);

  // Reset variant whenever a new signal is selected
  useEffect(() => {
    setVariant("original");
  }, [selectedSignalId]);

  useEffect(() => {
    if (hitRowRef.current) {
      hitRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedSignalId]);

  const kwRegex = useMemo(() => {
    if (!sig) return null;
    const esc = sig.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(${esc})`, "ig");
  }, [sig?.keyword]);

  function jumpToKeyword() {
    if (!audioEl || !sig) return;
    audioEl.currentTime = Math.max(0, sig.segment_start - 3);
    audioEl.play().catch((err) => console.warn("audio.play failed:", err));
  }

  function jumpTo(seconds: number) {
    if (!audioEl) return;
    audioEl.currentTime = Math.max(0, seconds);
    audioEl.play().catch((err) => console.warn("audio.play failed:", err));
  }

  if (!sig || !lesson) return null;

  const keyword = sig.keyword;
  const hitIndex = sig.segment_index;
  const audioUrl = sig.audio_variants[variant] ?? sig.audio_url;

  return (
    <Panel
      title={`Transcript · ${sig.lesson_name}`}
      right={
        <span className="font-mono text-[10px] text-warn">
          ▲ KEYWORD: {keyword.toUpperCase()}
        </span>
      }
    >
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-line bg-panel2 shrink-0 space-y-2">
          <FilterBar
            current={variant}
            onChange={setVariant}
            availability={sig.audio_variants}
          />
          <div className="flex items-center gap-3">
            <audio
              key={`${sig.signal_id}-${variant}`}
              ref={setAudioEl}
              src={audioUrl}
              controls
              preload="metadata"
              onError={(e) => console.warn("audio error:", (e.currentTarget as HTMLAudioElement).error)}
              className="flex-1"
            />
            <button
              onClick={jumpToKeyword}
              className="bg-warn text-ink font-bold text-xs px-3 py-1.5 rounded hover:brightness-110 whitespace-nowrap"
              title="Play 3 seconds before the keyword"
            >
              ▶ JUMP TO KEYWORD
            </button>
          </div>
          <Waveform
            audioUrl={audioUrl}
            markerSeconds={sig.segment_start}
            audioElement={audioEl}
          />
        </div>
        <div className="flex-1 overflow-auto px-3 py-2 text-sm leading-relaxed font-mono">
          {lesson.segments.map((seg, i) => {
            const isHit = i === hitIndex;
            const isSwahili = seg.lang === "sw";
            return (
              <div
                key={i}
                ref={isHit ? hitRowRef : undefined}
                onClick={() => jumpTo(seg.start)}
                className={`py-1 px-2 -mx-2 rounded cursor-pointer transition-colors ${
                  isHit
                    ? "bg-warn/10 border-l-2 border-warn hover:bg-warn/20"
                    : "hover:bg-line/40"
                }`}
                title={`Play from ${fmt(seg.start)}`}
              >
                <span className="text-muted text-[10px] mr-2 select-none">
                  {fmt(seg.start)}
                </span>
                {isSwahili && (
                  <span
                    className="text-[9px] font-bold tracking-widest mr-2 px-1 py-0.5 rounded bg-accent/20 text-accent border border-accent/40 select-none"
                    title="Whisper transcribed this segment as Kiswahili"
                  >
                    SW
                  </span>
                )}
                <span className="text-text">
                  {renderTextWithHighlight(seg.text, kwRegex, keyword, jumpToKeyword)}
                </span>
                {isSwahili && seg.text_en && (
                  <span className="text-muted italic ml-1">
                    ({renderTextWithHighlight(seg.text_en, kwRegex, keyword, jumpToKeyword)})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function FilterBar({
  current,
  onChange,
  availability,
}: {
  current: AudioVariantKey;
  onChange: (v: AudioVariantKey) => void;
  availability: Record<string, string | undefined>;
}) {
  return (
    <div className="flex border border-line rounded overflow-hidden font-mono text-[10px] tracking-widest">
      {VARIANTS.map((v) => {
        const enabled = !!availability[v.key];
        const active = current === v.key;
        return (
          <button
            key={v.key}
            onClick={() => enabled && onChange(v.key)}
            disabled={!enabled}
            title={enabled ? v.hint : `${v.hint} (not generated for this lesson)`}
            className={`flex-1 px-2 py-1 transition-colors ${
              active
                ? "bg-accent text-ink font-bold"
                : enabled
                  ? "text-muted hover:text-text hover:bg-line/50"
                  : "text-muted/40 cursor-not-allowed"
            }`}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function renderTextWithHighlight(
  text: string,
  kwRegex: RegExp | null,
  keyword: string,
  onMarkClick: () => void,
): React.ReactNode {
  if (!kwRegex) return text;
  return text.split(kwRegex).map((part, j) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark
        key={j}
        className="kw"
        onClick={(e) => {
          e.stopPropagation();
          onMarkClick();
        }}
        title="Play 3s before the keyword"
      >
        {part}
      </mark>
    ) : (
      <span key={j}>{part}</span>
    ),
  );
}
