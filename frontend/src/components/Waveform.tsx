import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface Props {
  audioUrl: string | null;
  markerSeconds: number;
  /** Live audio element — used to drive the progress cursor in real-time. */
  audioElement: HTMLAudioElement | null;
}

/**
 * Spectral waveform under the audio player. WaveSurfer fetches the audio
 * independently to render bars (no interference with the native player).
 * Playback progress is driven by listening to the audio element's
 * `timeupdate` events and calling `ws.setTime()`.
 */
export function Waveform({ audioUrl, markerSeconds, audioElement }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [duration, setDuration] = useState(0);

  // Initialize wavesurfer once per audioUrl
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    let ws: WaveSurfer | null = null;
    try {
      ws = WaveSurfer.create({
        container: containerRef.current,
        url: audioUrl,
        waveColor: "#7a8aa6",
        progressColor: "#19c37d",
        cursorColor: "#f5a524",
        cursorWidth: 1,
        height: 40,
        barWidth: 2,
        barGap: 2,
        barRadius: 1,
        normalize: true,
        interact: false,
      });
      wsRef.current = ws;
      ws.on("ready", () => {
        if (ws) setDuration(ws.getDuration());
      });
      ws.on("error", (err) => console.warn("waveform error:", err));
    } catch (err) {
      console.warn("Waveform init failed:", err);
    }

    return () => {
      try { ws?.destroy(); } catch { /* ignore */ }
      wsRef.current = null;
      setDuration(0);
    };
  }, [audioUrl]);

  // Drive the progress cursor from the audio element's playback time
  useEffect(() => {
    if (!audioElement) return;
    const onTimeUpdate = () => {
      const ws = wsRef.current;
      if (!ws) return;
      try {
        if (ws.getDuration() > 0) ws.setTime(audioElement.currentTime);
      } catch { /* setTime may throw before ready */ }
    };
    audioElement.addEventListener("timeupdate", onTimeUpdate);
    audioElement.addEventListener("seeked", onTimeUpdate);
    return () => {
      audioElement.removeEventListener("timeupdate", onTimeUpdate);
      audioElement.removeEventListener("seeked", onTimeUpdate);
    };
  }, [audioElement]);

  const markerLeftPct =
    duration > 0 && markerSeconds > 0
      ? Math.min(100, (markerSeconds / duration) * 100)
      : null;

  return (
    <div className="relative w-full bg-ink/40 rounded">
      <div ref={containerRef} className="w-full" style={{ minHeight: 40 }} />
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
