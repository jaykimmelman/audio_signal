"""Build teachers/schools/lessons JSON from transcribed MP3s.

The browser does the keyword scan now (so users can edit the watchlist live
without re-running this script). This preprocessor just emits the structural
data: one lesson record per cached transcript, with the full segment list
embedded.

Input:
  - preprocess/transcripts_cache/<stem>.<lang>.json (from transcribe.py)
    Multiple languages per audio file are merged: for each EN segment we
    pick the SW alternative if its avg_logprob is meaningfully higher,
    capturing code-switched Kiswahili phrases. Falls back to <stem>.json
    (legacy single-language transcripts) if no per-lang files exist.
  - data/keywords.txt (default watchlist, shipped to the browser)

Output (frontend/public/data/):
  - teachers.json
  - schools.json
  - lessons.json   ← full segments inline, each tagged with `lang`
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

# ffmpeg audio-filter presets. Each maps a variant key → (filename suffix, -af string).
# All variants preserve duration so the segment timestamps stay aligned with the audio.
AUDIO_VARIANTS: dict[str, tuple[str, str]] = {
    "denoised": (
        "denoised",
        "highpass=f=80,lowpass=f=7000,afftdn=nr=12:nf=-25,loudnorm=I=-16:LRA=11:TP=-1.5",
    ),
    "gated": (
        # noise gate: attenuates anything below ~ -32 dB. Keeps duration intact.
        "gated",
        "highpass=f=80,agate=threshold=-32dB:ratio=8:attack=10:release=200,loudnorm=I=-16:LRA=11:TP=-1.5",
    ),
    "enhanced": (
        # speech-band EQ + denoise + compression + loudnorm. Most aggressive.
        "enhanced",
        "highpass=f=100,lowpass=f=6500,afftdn=nr=20:nf=-20,"
        "acompressor=threshold=-25dB:ratio=4:attack=5:release=50,"
        "loudnorm=I=-14:LRA=11:TP=-1.5",
    ),
}


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


def load_lang_transcripts(stem: str) -> dict[str, dict]:
    """Find <stem>.<lang>.json files for one audio. Returns {lang: payload}.

    Also accepts <stem>.json as legacy English (used before the dual-language
    refactor). The legacy file is treated as `en` only if no <stem>.en.json
    is also present.
    """
    transcripts: dict[str, dict] = {}
    for path in TRANSCRIPT_CACHE.glob(f"{stem}.*.json"):
        suffix = path.name[len(stem) + 1:-len(".json")]
        if not suffix or "." in suffix:
            continue
        transcripts[suffix] = json.loads(path.read_text())
    legacy = TRANSCRIPT_CACHE / f"{stem}.json"
    if legacy.exists() and "en" not in transcripts:
        transcripts["en"] = json.loads(legacy.read_text())
    return transcripts


def merge_bilingual_segments(
    primary: list[dict],
    alt: list[dict],
    primary_lang: str = "en",
    alt_lang: str = "sw",
    min_overlap_frac: float = 0.5,
    confidence_margin: float = 0.10,
) -> list[dict]:
    """Walk primary segments; for each, see if the alt-language pass has a
    higher-confidence transcription of the same time window. Swap in the alt
    text when its avg_logprob exceeds primary's by `confidence_margin`.

    Keeps primary's segmentation (start/end timestamps) so per-segment indexing
    stays stable and aligned with the audio file.
    """
    merged: list[dict] = []
    for p in primary:
        p_start, p_end = p["start"], p["end"]
        p_dur = max(0.001, p_end - p_start)
        # Find alt segment with greatest temporal overlap
        best_alt = None
        best_overlap = 0.0
        for a in alt:
            ov = max(0.0, min(p_end, a["end"]) - max(p_start, a["start"]))
            if ov > best_overlap:
                best_overlap = ov
                best_alt = a
        # Skip alt if it doesn't cover most of the primary segment
        if best_alt is None or best_overlap / p_dur < min_overlap_frac:
            merged.append({**p, "lang": primary_lang})
            continue

        p_score = p.get("avg_logprob") or -10.0
        a_score = best_alt.get("avg_logprob") or -10.0

        if a_score > p_score + confidence_margin:
            merged.append({
                "start": p_start,
                "end": p_end,
                "text": best_alt["text"].strip(),
                "lang": alt_lang,
                "avg_logprob": a_score,
                "no_speech_prob": best_alt.get("no_speech_prob"),
            })
        else:
            merged.append({**p, "lang": primary_lang})
    return merged


def main() -> int:
    if not KEYWORDS_FILE.exists():
        print(f"ERROR: missing {KEYWORDS_FILE}", file=sys.stderr)
        return 1
    keywords = [k.strip() for k in KEYWORDS_FILE.read_text().splitlines() if k.strip()]

    # Identify unique lesson stems by stripping the trailing .<lang> suffix
    # off any per-language transcript files. Also match legacy <stem>.json.
    stems: set[str] = set()
    for path in TRANSCRIPT_CACHE.glob("*.json"):
        name = path.stem  # without .json
        # If second suffix is a 2-letter ISO code, drop it
        if "." in name and len(name.rsplit(".", 1)[1]) == 2:
            stems.add(name.rsplit(".", 1)[0])
        else:
            stems.add(name)

    if not stems:
        print(f"ERROR: no transcripts in {TRANSCRIPT_CACHE}. Run transcribe.py first.",
              file=sys.stderr)
        return 1

    teachers: dict[str, dict] = {}
    schools: dict[str, dict] = {}
    lessons: list[dict] = []

    for stem in sorted(stems):
        meta = parse_filename(stem)
        lang_transcripts = load_lang_transcripts(stem)
        if not lang_transcripts:
            print(f"  ⚠ skipping {stem}: no transcripts found")
            continue

        # Decide segments. If we have both EN and SW, merge per-segment by confidence.
        en = lang_transcripts.get("en")
        sw = lang_transcripts.get("sw")
        if en and sw:
            segments = merge_bilingual_segments(
                en.get("segments", []), sw.get("segments", []),
                primary_lang="en", alt_lang="sw",
            )
            sw_count = sum(1 for s in segments if s.get("lang") == "sw")
            print(f"  ⤿ merged en+sw: {len(segments)} segs ({sw_count} swahili)")
            transcript = en  # use EN payload for source_audio / duration metadata
        else:
            primary = next(iter(lang_transcripts.values()))
            segments = [
                {**s, "lang": next(iter(lang_transcripts.keys()))}
                for s in primary.get("segments", [])
            ]
            transcript = primary

        # Strip avg_logprob/no_speech_prob from segments before shipping —
        # they're only useful for the merge step, not for the dashboard.
        segments = [
            {"start": float(s["start"]), "end": float(s["end"]),
             "text": s["text"], "lang": s.get("lang", "en")}
            for s in segments
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
                # Clean monochrome line-drawing portrait (Notion-style). Less
                # cartoony than personas; reads like a dossier sketch.
                "headshot_url": (
                    "https://api.dicebear.com/9.x/notionists/svg"
                    f"?seed={teacher_id}"
                    "&backgroundColor=0b1220"
                ),
            }

        source_audio = transcript.get("source_audio", stem + ".mp3")
        # NewGlobe S3 files are named .mp3 but are actually MP4 audio (ISO Media).
        # Rewrite the served extension to .m4a so GitHub Pages sends the right
        # content-type (audio/mp4) and browsers will decode it.
        audio_stem = Path(source_audio).stem
        dest_filename = audio_stem + ".m4a"
        audio_filename = dest_filename
        dest = PUB_AUDIO / dest_filename
        src_path: Path | None = None
        for src_dir in AUDIO_SEARCH_DIRS:
            candidate = src_dir / source_audio
            if candidate.exists():
                src_path = candidate
                break

        if src_path is None:
            print(f"    ⚠ no source audio found for {source_audio}; player will 404")

        if src_path is not None and not dest.exists():
            PUB_AUDIO.mkdir(parents=True, exist_ok=True)
            # 1) ORIGINAL — remux with faststart so moov atom is at the front.
            try:
                subprocess.run(
                    [
                        "ffmpeg", "-loglevel", "error", "-y",
                        "-i", str(src_path),
                        "-c", "copy",
                        "-movflags", "+faststart",
                        str(dest),
                    ],
                    check=True,
                )
                print(f"    audio → {dest.relative_to(ROOT)} (faststart)")
            except (FileNotFoundError, subprocess.CalledProcessError):
                shutil.copy2(src_path, dest)
                print(f"    audio → {dest.relative_to(ROOT)} "
                      "(plain copy — install ffmpeg for faststart)")

        # 2) FILTER VARIANTS — generate denoised/gated/enhanced if the source exists
        #    and the variant file isn't already cached.
        variants_built: dict[str, str] = {"original": f"data/audio/{audio_filename}"}
        if src_path is not None:
            for variant_key, (suffix, filter_chain) in AUDIO_VARIANTS.items():
                variant_filename = f"{audio_stem}.{suffix}.m4a"
                variant_dest = PUB_AUDIO / variant_filename
                if not variant_dest.exists():
                    try:
                        subprocess.run(
                            [
                                "ffmpeg", "-loglevel", "error", "-y",
                                "-i", str(src_path),
                                "-af", filter_chain,
                                "-c:a", "aac", "-b:a", "64k",
                                "-movflags", "+faststart",
                                str(variant_dest),
                            ],
                            check=True,
                            timeout=300,
                        )
                        print(f"    audio → {variant_dest.relative_to(ROOT)} ({variant_key})")
                    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
                        print(f"    ⚠ {variant_key} variant skipped: {e}")
                        continue
                if variant_dest.exists():
                    variants_built[variant_key] = f"data/audio/{variant_filename}"
        lessons.append({
            "lesson_id": stem,
            "lesson_name": f"{meta['grade']} {meta['subject']}",
            "lesson_datetime": meta["lesson_datetime"],
            "employee_id": teacher_id,
            "school_id": school_id,
            "audio_url": f"data/audio/{audio_filename}",
            "audio_variants": variants_built,
            "language": transcript.get("language"),
            "duration": transcript.get("duration"),
            "segments": segments,
        })
        print(f"  ✓ {stem}: {len(segments)} segments")

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
