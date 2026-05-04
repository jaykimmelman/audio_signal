"""Build teachers/schools/lessons JSON from transcribed MP3s.

The browser does the keyword scan now (so users can edit the watchlist live
without re-running this script). This preprocessor just emits the structural
data: one lesson record per cached transcript, with the full segment list
embedded.

Input:
  - preprocess/transcripts_cache/<filename>.json (from transcribe.py)
  - data/keywords.txt (default watchlist, shipped to the browser)

Output (frontend/public/data/):
  - teachers.json
  - schools.json
  - lessons.json   ← full segments inline
  - keywords.json  ← default watchlist
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KEYWORDS_FILE = ROOT / "data" / "keywords.txt"
TRANSCRIPT_CACHE = ROOT / "preprocess" / "transcripts_cache"
AUDIO_INBOX = ROOT / "audio_inbox"
PUB = ROOT / "frontend" / "public" / "data"
PUB_AUDIO = PUB / "audio"
AUDIO_SEARCH_DIRS = [AUDIO_INBOX, ROOT]  # also accept MP3s at project root

LOCATION_COORDS: dict[str, tuple[str, str, float, float]] = {
    "lamu_lau":            ("Lau",         "Lamu",       -2.270, 40.890),
    "lamu_mpeketoni":      ("Mpeketoni",   "Lamu",       -2.270, 40.700),
    "lamu_witu":           ("Witu",        "Lamu",       -2.380, 40.450),
    "gachie_kbu":          ("Gachie",      "Kiambu",     -1.213, 36.785),
    "kilifi_malindi":      ("Malindi",     "Kilifi",     -3.220, 40.117),
    "kwale_msambweni":     ("Msambweni",   "Kwale",      -4.470, 39.485),
    "mombasa_nyali":       ("Nyali",       "Mombasa",    -4.030, 39.700),
    "tana_river_garsen":   ("Garsen",      "Tana River", -2.270, 40.117),
    "garissa_garissa":     ("Garissa",     "Garissa",    -0.453, 39.658),
    "isiolo_isiolo":       ("Isiolo",      "Isiolo",      0.353, 37.583),
}
DEFAULT_KENYA_CENTER = (-1.292, 36.821)


def parse_filename(stem: str) -> dict:
    parts = stem.split("_")
    if parts and parts[0] == "mpeg":
        parts = parts[1:]
    if len(parts) < 9:
        raise ValueError(f"Filename too short to parse: {stem!r}")

    dt_tokens = parts[-6:]
    body = parts[:-6]
    dt = datetime.strptime("_".join(dt_tokens), "%Y_%m_%d_%H_%M_%S")

    grade_idx = None
    for i, tok in enumerate(body):
        if tok == "grade" and i + 1 < len(body) and body[i + 1].isdigit():
            grade_idx = i
            break
    if grade_idx is None:
        raise ValueError(f"No 'grade_N' marker in {stem!r}")

    grade = f"Grade {body[grade_idx + 1]}"
    subject = "_".join(body[grade_idx + 2:]).replace("_", " ").title() or "Unknown"

    if grade_idx >= 4:
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
        "lesson_datetime": dt.isoformat() + "+03:00",
    }


def stable_id(prefix: str, *parts: str) -> str:
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
    lessons: list[dict] = []

    for tjson in transcript_jsons:
        meta = parse_filename(tjson.stem)
        transcript = json.loads(tjson.read_text())
        segments = [
            {"start": float(s["start"]), "end": float(s["end"]), "text": s["text"]}
            for s in transcript.get("segments", [])
        ]

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
                # Placeholder cartoon portrait, deterministic per teacher.
                # CC-BY 4.0 (Personas by Draftbit). Replace with real photos
                # by overwriting headshot_url in the data pipeline.
                "headshot_url": (
                    "https://api.dicebear.com/9.x/personas/svg"
                    f"?seed={teacher_id}"
                    "&skinColor=5A3920,6F4E3D,8D5524,4B3328,A8633F"
                    "&backgroundColor=0b1220"
                ),
            }

        source_audio = transcript.get("source_audio", tjson.stem + ".mp3")
        # NewGlobe S3 files are named .mp3 but are actually MP4 audio (ISO Media).
        # Rewrite the served extension to .m4a so GitHub Pages sends the right
        # content-type (audio/mp4) and browsers will decode it.
        dest_filename = Path(source_audio).stem + ".m4a"
        audio_filename = dest_filename  # used in audio_url below
        dest = PUB_AUDIO / dest_filename
        if not dest.exists():
            for src_dir in AUDIO_SEARCH_DIRS:
                src = src_dir / source_audio
                if src.exists():
                    PUB_AUDIO.mkdir(parents=True, exist_ok=True)
                    # NewGlobe MP4s have the moov atom at end-of-file — browsers
                    # can't read metadata until the whole file downloads. Remux
                    # with faststart to move moov to the front.
                    try:
                        subprocess.run(
                            [
                                "ffmpeg", "-loglevel", "error", "-y",
                                "-i", str(src),
                                "-c", "copy",
                                "-movflags", "+faststart",
                                str(dest),
                            ],
                            check=True,
                        )
                        print(f"    audio → {dest.relative_to(ROOT)} (faststart)")
                    except (FileNotFoundError, subprocess.CalledProcessError):
                        # Fallback: plain copy. Audio may not play in browsers.
                        shutil.copy2(src, dest)
                        print(f"    audio → {dest.relative_to(ROOT)} "
                              "(plain copy — install ffmpeg for faststart)")
                    break
            else:
                print(f"    ⚠ no source audio found for {source_audio}; player will 404")
        lessons.append({
            "lesson_id": tjson.stem,
            "lesson_name": f"{meta['grade']} {meta['subject']}",
            "lesson_datetime": meta["lesson_datetime"],
            "employee_id": teacher_id,
            "school_id": school_id,
            "audio_url": f"data/audio/{audio_filename}",
            "language": transcript.get("language"),
            "duration": transcript.get("duration"),
            "segments": segments,
        })
        print(f"  ✓ {tjson.stem}: {len(segments)} segments")

    PUB.mkdir(parents=True, exist_ok=True)
    (PUB / "keywords.json").write_text(json.dumps(keywords, indent=2))
    (PUB / "teachers.json").write_text(json.dumps(list(teachers.values()), indent=2))
    (PUB / "schools.json").write_text(json.dumps(list(schools.values()), indent=2))
    (PUB / "lessons.json").write_text(json.dumps(lessons, indent=2, ensure_ascii=False))

    # Clean up old artifacts from the previous architecture
    for stale in [PUB / "signals.json"]:
        if stale.exists():
            stale.unlink()
    old_transcripts = PUB / "transcripts"
    if old_transcripts.exists():
        shutil.rmtree(old_transcripts)

    print(f"\nWrote {len(teachers)} teachers, {len(schools)} schools, "
          f"{len(lessons)} lesson(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
