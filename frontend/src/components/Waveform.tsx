import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface Props {
  audioUrl: string | null;
  markerSeconds: number;
}

/**
 * Thin spectral waveform shown below the audio player. WaveSurfer fetches the
 * audio independently (decorative) so it cannot interfere with the native
 * <audio> element's playback. The orange vertical line marks the keyword.
 */
export function Waveform({ audioUrl, markerSeconds }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    let ws: WaveSurfer | null = null;
    try {
      ws = WaveSurfer.create({
        container: containerRef.current,
        url: audioUrl,
        waveColor: "#1f2a44",
        progressColor: "#1f2a44",
        cursorColor: "transparent",
        height: 36,
        barWidth: 2,
        barGap: 1,
        barRadius: 1,
        normalize: true,
        interact: false,
      });
      ws.on("ready", () => {
        if (ws) setDuration(ws.getDuration());
      });
    } catch (err) {
      console.warn("Waveform init failed:", err);
    }

    return () => {
      try {
        ws?.destroy();
      } catch { /* ignore */ }
    };
  }, [audioUrl]);

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
