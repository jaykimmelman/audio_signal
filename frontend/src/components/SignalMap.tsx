import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useApp } from "../state";
import { Panel } from "./Panel";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
if (TOKEN) mapboxgl.accessToken = TOKEN;

const KWARA_CENTER: [number, number] = [4.7, 8.5];

export function SignalMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const {
    signals,
    schoolsById,
    teachersById,
    selectedSignalId,
    setSelectedSignalId,
  } = useApp();

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !TOKEN) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: KWARA_CENTER,
      zoom: 6.5,
      pitch: 0,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render bubbles whenever signals change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Aggregate signals per school
    const counts = new Map<string, number>();
    for (const s of signals) counts.set(s.school_id, (counts.get(s.school_id) ?? 0) + 1);

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    counts.forEach((count, schoolId) => {
      const school = schoolsById[schoolId];
      if (!school) return;
      const size = Math.min(40, 14 + count * 3);
      const el = document.createElement("div");
      el.className = "pulse";
      el.style.cssText = `
        width: ${size}px; height: ${size}px;
        background: rgba(239, 68, 68, 0.55);
        border: 2px solid #ef4444;
        border-radius: 9999px;
        cursor: pointer;
      `;
      el.title = `${school.name} — ${count} signal${count > 1 ? "s" : ""}`;
      el.onclick = () => {
        // Click bubble → pick the most recent signal at this school
        const here = signals
          .filter((s) => s.school_id === schoolId)
          .sort((a, b) => (a.lesson_datetime < b.lesson_datetime ? 1 : -1));
        if (here[0]) setSelectedSignalId(here[0].signal_id);
      };
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([school.lon, school.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [signals, schoolsById, setSelectedSignalId]);

  // Cinematic flyTo when a signal is selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selectedSignalId) {
      map.flyTo({
        center: KWARA_CENTER,
        zoom: 6.5,
        pitch: 0,
        bearing: 0,
        speed: 0.9,
        curve: 1.6,
        essential: true,
      });
      return;
    }
    const sig = signals.find((s) => s.signal_id === selectedSignalId);
    if (!sig) return;
    const school = schoolsById[sig.school_id];
    if (!school) return;

    map.flyTo({
      center: [school.lon, school.lat],
      zoom: 17.2,
      pitch: 62,
      bearing: -25,
      speed: 0.55,
      curve: 1.7,
      essential: true,
    });
  }, [selectedSignalId, signals, schoolsById]);

  const sig = selectedSignalId ? signals.find((s) => s.signal_id === selectedSignalId) : null;
  const teacher = sig ? teachersById[sig.employee_id] : null;
  const school = sig ? schoolsById[sig.school_id] : null;

  return (
    <Panel
      title={
        sig && school
          ? `Target · ${school.name} · ${school.lga}`
          : `Signals per Community · ${signals.length}`
      }
      right={
        <span className="font-mono text-[10px] text-accent">
          {sig ? "ZOOM LOCKED" : "WIDE FIELD"}
        </span>
      }
    >
      <div className="relative h-full w-full">
        {!TOKEN && <NoTokenOverlay />}
        <div ref={containerRef} className="absolute inset-0" />
        {sig && <Crosshair />}
        {sig && teacher && school && (
          <div className="absolute right-2 bottom-2 bg-panel/90 backdrop-blur border border-line rounded p-2 font-mono text-[11px] leading-tight max-w-[280px]">
            <div className="text-alert">▲ TARGET ACQUIRED</div>
            <div className="text-text">{teacher.name} · {teacher.grade}</div>
            <div className="text-muted">{school.lat.toFixed(5)}°N, {school.lon.toFixed(5)}°E</div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function Crosshair() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div className="relative w-40 h-40">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0  w-5 h-5 border-l-2 border-t-2 border-warn/80" />
        <div className="absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2 border-warn/80" />
        <div className="absolute bottom-0 left-0  w-5 h-5 border-l-2 border-b-2 border-warn/80" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-r-2 border-b-2 border-warn/80" />
        {/* Center crosshair lines */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-px bg-warn/80" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-px bg-warn/80" />
        {/* Center dot gap */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-warn" />
      </div>
    </div>
  );
}

function NoTokenOverlay() {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-panel2/95 text-center p-6 font-mono text-xs">
      <div>
        <div className="text-warn text-sm mb-2">▲ MAPBOX TOKEN REQUIRED</div>
        <div className="text-muted">
          Set <code className="text-text">VITE_MAPBOX_TOKEN</code> in <code className="text-text">.env</code> to enable the satellite map.
        </div>
        <div className="text-muted mt-1">
          The rest of the dashboard works without it.
        </div>
      </div>
    </div>
  );
}
