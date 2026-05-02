"""Build teachers/schools/signals JSON from transcribed MP3s.

Input:
  - preprocess/transcripts_cache/<filename>.json (from transcribe.py)
  - data/keywords.txt
  - frontend/public/data/audio/<filename>.mp3 (browser-fetchable copy)

Output:
  - frontend/public/data/teachers.json
  - frontend/public/data/schools.json
  - frontend/public/data/signals.json
  - frontend/public/data/keywords.json
  - frontend/public/data/transcripts/<signal_id>.json (rewritten in dashboard format)

Filename schema (NewGlobe Kenya audio):
    mpeg_<location_a>_<location_b>_<teacher_name_snake>_grade_<N>_<subject>_<YYYY_MM_DD_HH_MM_SS>.mp3
    e.g. mpeg_lamu_lau_abaye_omar_ayub_grade_6_mathematics_2026_03_25_12_37_04.mp3

Heuristic parser: assumes "grade_N" splits the teacher portion from the subject portion,
and the trailing _YYYY_MM_DD_HH_MM_SS is always exactly 6 numeric tokens.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KEYWORDS_FILE = ROOT / "data" / "keywords.txt"
TRANSCRIPT_CACHE = ROOT / "preprocess" / "transcripts_cache"
PUB = ROOT / "frontend" / "public" / "data"
PUB_TRANSCRIPTS = PUB / "transcripts"
AUDIO_DIR = PUB / "audio"

# Rough centroid coords per Kenya county we expect to see. Add as needed.
LOCATION_COORDS: dict[str, tuple[str, str, float, float]] = {
    # location_key       : (display_name,  lga,        lat,    lon)
    "lamu_lau":            ("Lau",         "Lamu",     -2.270, 40.890),
    "lamu_mpeketoni":      ("Mpeketoni",   "Lamu",     -2.270, 40.700),
    "lamu_witu":           ("Witu",        "Lamu",     -2.380, 40.450),
    "kilifi_malindi":      ("Malindi",     "Kilifi",   -3.220,  40.117),
    "kwale_msambweni":     ("Msambweni",   "Kwale",    -4.470,  39.485),
    "mombasa_nyali":       ("Nyali",       "Mombasa",  -4.030,  39.700),
    "tana_river_garsen":   ("Garsen",      "Tana River", -2.270, 40.117),
    "garissa_garissa":     ("Garissa",     "Garissa",  -0.453,  39.658),
    "isiolo_isiolo":       ("Isiolo",      "Isiolo",    0.353,  37.583),
}
DEFAULT_KENYA_CENTER = (-1.292, 36.821)  # Nairobi-ish fallback


def parse_filename(stem: str) -> dict:
    """Pull metadata out of the snake-case S3 filename.

    Returns dict with: location_key, location_name, lga, lat, lon,
    teacher_name, grade, subject, lesson_datetime (ISO).
    """
    parts = stem.split("_")
    # Expect prefix "mpeg" + final 6 datetime tokens
    if parts and parts[0] == "mpeg":
        parts = parts[1:]
    if len(parts) < 9:
        raise ValueError(f"Filename too short to parse: {stem!r}")

    # Trailing 6 are YYYY MM DD HH MM SS
    dt_tokens = parts[-6:]
    body = parts[:-6]
    try:
        dt = datetime.strptime("_".join(dt_tokens), "%Y_%m_%d_%H_%M_%S")
    except ValueError as e:
        raise ValueError(f"Bad datetime tail in {stem!r}: {e}")

    # Find the "grade_N" anchor
    grade_idx = None
    for i, tok in enumerate(body):
        if tok == "grade" and i + 1 < len(body) and body[i + 1].isdigit():
            grade_idx = i
            break
    if grade_idx is None:
        raise ValueError(f"No 'grade_N' marker in {stem!r}")

    grade = f"Grade {body[grade_idx + 1]}"
    subject = "_".join(body[grade_idx + 2:]).replace("_", " ").title() or "Unknown"

    # Location is the first 1–2 tokens; teacher name is whatever's between.
    # We assume location is always 2 tokens (county_subcounty). If only 1, fall back.
    if grade_idx >= 4:
        # ≥2 location tokens + ≥2 name tokens
        location_tokens = body[:2]
        teacher_tokens = body[2:grade_idx]
    elif grade_idx >= 3:
        location_tokens = body[:1]
        teacher_tokens = body[1:grade_idx]
    else:
        location_tokens = []
        teacher_tokens = body[:grade_idx]

    location_key = "_".join(location_tokens)
    teacher_name = " ".join(t.title() for t in teacher_tokens)

    if location_key in LOCATION_COORDS:
        loc_name, lga, lat, lon = LOCATION_COORDS[location_key]
    else:
        loc_name = " ".join(t.title() for t in location_tokens) or "Unknown"
        lga = location_tokens[0].title() if location_tokens else "Unknown"
        lat, lon = DEFAULT_KENYA_CENTER

    return {
        "location_key": location_key,
        "location_name": loc_name,
        "lga": lga,
        "lat": lat,
        "lon": lon,
        "teacher_name": teacher_name,
        "grade": grade,
        "subject": subject.strip(),
        "lesson_datetime": dt.isoformat() + "+03:00",  # Kenya is UTC+3
    }


def keyword_hits(segments: list[dict], keywords: list[str]) -> list[tuple[int, str]]:
    """Return list of (segment_index, matched_keyword) for every keyword hit."""
    hits = []
    patterns = [(kw, re.compile(rf"\b{re.escape(kw)}\b", re.IGNORECASE)) for kw in keywords]
    for i, seg in enumerate(segments):
        text = seg.get("text", "")
        for kw, pat in patterns:
            if pat.search(text):
                hits.append((i, kw))
    return hits


def stable_id(prefix: str, *parts: str) -> str:
    """Short stable id from a tuple of strings — used for teacher/school/signal IDs."""
    import hashlib
    h = hashlib.sha1("|".join(parts).encode()).hexdigest()[:8].upper()
    return f"{prefix}{h}"


def main() -> int:
    if not KEYWORDS_FILE.exists():
        print(f"ERROR: missing {KEYWORDS_FILE}", file=sys.stderr)
        return 1
    keywords = [k.strip() for k in KEYWORDS_FILE.read_text().splitlines() if k.strip()]

    transcript_jsons = sorted(TRANSCRIPT_CACHE.glob("*.json"))
    if not transcript_jsons:
        print(f"ERROR: no transcripts in {TRANSCRIPT_CACHE}. Run transcribe.py first.",
              file=sys.stderr)
        return 1

    teachers: dict[str, dict] = {}
    schools: dict[str, dict] = {}
    signals: list[dict] = []

    PUB_TRANSCRIPTS.mkdir(parents=True, exist_ok=True)

    for tjson in transcript_jsons:
        meta = parse_filename(tjson.stem)
        transcript = json.loads(tjson.read_text())
        segments = transcript.get("segments", [])

        # School + teacher (synthesized from filename for now)
        school_id = stable_id("SCH", meta["location_key"])
        teacher_id = stable_id("T", meta["location_key"], meta["teacher_name"], meta["grade"])

        if school_id not in schools:
            schools[school_id] = {
                "school_id": school_id,
                "name": f"{meta['location_name']} Primary School",
                "town": meta["location_name"],
                "lga": meta["lga"],
                "lat": meta["lat"],
                "lon": meta["lon"],
            }

        if teacher_id not in teachers:
            teachers[teacher_id] = {
                "employee_id": teacher_id,
                "name": meta["teacher_name"],
                "school_id": school_id,
                "grade": meta["grade"],
                "phone": "—",
                "hire_date": "—",
                "last_training_date": "—",
                "pupils": 0,
            }

        hits = keyword_hits(segments, keywords)
        if not hits:
            print(f"  ○ no signals: {tjson.stem}")
            continue

        # One signal per hit segment (collapse multi-keyword same-segment into one)
        seen_segments: set[int] = set()
        for seg_idx, kw in hits:
            if seg_idx in seen_segments:
                continue
            seen_segments.add(seg_idx)
            seg = segments[seg_idx]
            signal_id = stable_id("SIG", tjson.stem, str(seg_idx), kw)
            audio_filename = transcript.get("source_audio", tjson.stem + ".mp3")
            signals.append({
                "signal_id": signal_id,
                "lesson_id": tjson.stem,
                "lesson_name": f"{meta['grade']} {meta['subject']}",
                "lesson_datetime": meta["lesson_datetime"],
                "employee_id": teacher_id,
                "school_id": school_id,
                "keyword": kw,
                "snippet": seg["text"],
                "segment_start": seg["start"],
                "segment_end": seg["end"],
                "transcript_url": f"data/transcripts/{signal_id}.json",
                "audio_url": f"data/audio/{audio_filename}",
            })

            # Write per-signal transcript with hit_segment_index marker
            (PUB_TRANSCRIPTS / f"{signal_id}.json").write_text(json.dumps({
                "signal_id": signal_id,
                "lesson_id": tjson.stem,
                "segments": segments,
                "hit_segment_index": seg_idx,
                "keyword": kw,
                "language": transcript.get("language"),
            }, indent=2, ensure_ascii=False))

        print(f"  ✓ {tjson.stem}: {len(seen_segments)} signal(s)")

    PUB.mkdir(parents=True, exist_ok=True)
    (PUB / "keywords.json").write_text(json.dumps(keywords, indent=2))
    (PUB / "teachers.json").write_text(json.dumps(list(teachers.values()), indent=2))
    (PUB / "schools.json").write_text(json.dumps(list(schools.values()), indent=2))
    (PUB / "signals.json").write_text(json.dumps(signals, indent=2))

    print(f"\nWrote {len(teachers)} teachers, {len(schools)} schools, "
          f"{len(signals)} signals from {len(transcript_jsons)} transcript(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
