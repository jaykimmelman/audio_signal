import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../state";
import { Panel } from "./Panel";
import { Waveform } from "./Waveform";

export function TranscriptPane() {
  const { selectedSignalId, allSignals, lessonsById } = useApp();
  const sig = allSignals.find((s) => s.signal_id === selectedSignalId);
  const lesson = sig ? lessonsById[sig.lesson_id] : null;

  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const hitRowRef = useRef<HTMLDivElement | null>(null);

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
        <div className="px-3 py-2 border-b border-line bg-panel2 shrink-0">
          <div className="flex items-center gap-3">
            <audio
              ref={setAudioEl}
              src={sig.audio_url}
              controls
              preload="metadata"
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
          <div className="mt-2">
            <Waveform audioElement={audioEl} markerSeconds={sig.segment_start} />
          </div>
        </div>
        <div className="flex-1 overflow-auto px-3 py-2 text-sm leading-relaxed font-mono">
          {lesson.segments.map((seg, i) => {
            const isHit = i === hitIndex;
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
                <span className="text-text">
                  {kwRegex
                    ? seg.text.split(kwRegex).map((part, j) =>
                        part.toLowerCase() === keyword.toLowerCase() ? (
                          <mark
                            key={j}
                            className="kw"
                            onClick={(e) => {
                              e.stopPropagation();
                              jumpToKeyword();
                            }}
                            title="Play 3s before the keyword"
                          >
                            {part}
                          </mark>
                        ) : (
                          <span key={j}>{part}</span>
                        ),
                      )
                    : seg.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
