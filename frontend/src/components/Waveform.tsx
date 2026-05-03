import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface Props {
  audioElement: HTMLAudioElement | null;
  markerSeconds: number;
}

/**
 * Thin spectral waveform under the audio player. Shares the same <audio> element
 * (no double-download for playback). The orange vertical line marks the
 * keyword segment.
 */
export function Waveform({ audioElement, markerSeconds }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !audioElement) return;

    let ws: WaveSurfer | null = null;
    try {
      ws = WaveSurfer.create({
        container: containerRef.current,
        media: audioElement,
        waveColor: "#1f2a44",
        progressColor: "#ef4444",
        cursorColor: "#f5a524",
        cursorWidth: 1,
        height: 36,
        barWidth: 2,
        barGap: 1,
        barRadius: 1,
        normalize: true,
        interact: true,
      });
      ws.on("ready", () => {
        if (ws) setDuration(ws.getDuration());
      });
    } catch (err) {
      // wavesurfer init can throw on some browsers / odd MP3 headers;
      // fail silently and the audio controls still work.
      console.warn("Waveform init failed:", err);
    }

    return () => {
      try {
        ws?.destroy();
      } catch { /* ignore */ }
    };
  }, [audioElement]);

  const markerLeftPct =
    duration > 0 && markerSeconds > 0
      ? Math.min(100, (markerSeconds / duration) * 100)
      : null;

  return (
    <div className="relative w-full">
      <div ref={containerRef} className="w-full" />
      {markerLeftPct !== null && (
        <div
          className="absolute top-0 bottom-0 w-px bg-warn pointer-events-none"
          style={{
            left: `${markerLeftPct}%`,
            boxShadow: "0 0 4px rgba(245,165,36,0.9)",
          }}
        />
      )}
    </div>
  );
}
