import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../state";
import { Panel } from "./Panel";
import { Transcript } from "../types";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export function TranscriptPane() {
  const { selectedSignalId, signals } = useApp();
  const sig = signals.find((s) => s.signal_id === selectedSignalId);

  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hitRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sig) {
      setTranscript(null);
      return;
    }
    let cancelled = false;
    fetch(`${BASE}/${sig.transcript_url}`)
      .then((r) => r.json())
      .then((data: Transcript) => {
        if (!cancelled) setTranscript(data);
      });
    return () => {
      cancelled = true;
    };
  }, [sig?.signal_id]);

  // Scroll the hit segment into view when transcript loads
  useEffect(() => {
    if (transcript && hitRowRef.current) {
      hitRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [transcript]);

  const segments = transcript?.segments ?? [];
  const hitIndex = transcript?.hit_segment_index ?? -1;
  const keyword = transcript?.keyword ?? sig?.keyword ?? "";

  // Build a regex for the keyword (case-insensitive, word boundary-ish)
  const kwRegex = useMemo(() => {
    if (!keyword) return null;
    const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(${esc})`, "ig");
  }, [keyword]);

  function jumpToKeyword() {
    const audio = audioRef.current;
    if (!audio || !sig) return;
    const target = Math.max(0, sig.segment_start - 3);
    audio.currentTime = target;
    audio.play().catch(() => {/* user gesture required, but click is one */});
  }

  if (!sig) return null;

  return (
    <Panel
      title={`Transcript · ${sig.lesson_name}`}
      right={
        <span className="font-mono text-[10px] text-warn">
          ▲ KEYWORD: {sig.keyword.toUpperCase()}
        </span>
      }
    >
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-line bg-panel2 flex items-center gap-3 shrink-0">
          <audio
            ref={audioRef}
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
        <div className="flex-1 overflow-auto px-3 py-2 text-sm leading-relaxed font-mono">
          {segments.map((seg, i) => {
            const isHit = i === hitIndex;
            return (
              <div
                key={i}
                ref={isHit ? hitRowRef : undefined}
                className={`py-1 px-2 -mx-2 rounded ${
                  isHit ? "bg-warn/10 border-l-2 border-warn" : ""
                }`}
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
                            onClick={jumpToKeyword}
                            title="Play audio from here"
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
