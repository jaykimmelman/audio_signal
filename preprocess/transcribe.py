"""Transcribe one or more MP3/M4A files via OpenAI Whisper API.

For each (audio, language) pair, saves <name>.<lang>.json with shape:
    { "segments": [{ "start": float, "end": float, "text": str,
                     "avg_logprob": float, "no_speech_prob": float }, ...],
      "language": "en"|"sw"|...,
      "duration": float,
      "source_audio": "<filename.mp3>" }

Re-runs are cheap: if the .json already exists for a given (file, lang),
it's skipped unless --force is passed.

Usage:
    python3 transcribe.py path/to/file.mp3 [more.mp3 ...]
        # default: transcribes in English AND Swahili
    python3 transcribe.py --languages en path/to/file.mp3
    python3 transcribe.py --languages en,sw,fr file.mp3
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")


def transcribe_one(
    client: OpenAI,
    mp3: Path,
    out_dir: Path,
    force: bool,
    language: str,
) -> Path:
    out_path = out_dir / f"{mp3.stem}.{language}.json"
    if out_path.exists() and not force:
        print(f"  ↳ cached: {out_path.name}")
        return out_path

    print(f"  ↳ uploading {mp3.name} ({mp3.stat().st_size / 1_000_000:.1f} MB) lang={language}…")
    with mp3.open("rb") as f:
        resp = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language=language,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    data = resp.model_dump() if hasattr(resp, "model_dump") else dict(resp)

    segments = []
    for s in data.get("segments", []):
        segments.append({
            "start": float(s["start"]),
            "end": float(s["end"]),
            "text": s["text"].strip(),
            "avg_logprob": s.get("avg_logprob"),
            "no_speech_prob": s.get("no_speech_prob"),
        })

    payload = {
        "source_audio": mp3.name,
        "language": data.get("language"),
        "duration": data.get("duration"),
        "segments": segments,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"  ↳ wrote {out_path.name} · {len(segments)} segments")
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio", nargs="+", help="MP3/M4A file(s) to transcribe")
    ap.add_argument(
        "--out-dir",
        default=str(ROOT / "preprocess" / "transcripts_cache"),
        help="Directory to write transcript JSONs (default: preprocess/transcripts_cache/)",
    )
    ap.add_argument("--force", action="store_true", help="Re-transcribe even if cached")
    ap.add_argument(
        "--languages",
        default="en,sw",
        help="Comma-separated ISO-639-1 hints. Default 'en,sw' for Kenyan classrooms.",
    )
    args = ap.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not set. Add it to audio_signal/.env", file=sys.stderr)
        return 1

    client = OpenAI(api_key=api_key)
    out_dir = Path(args.out_dir)
    languages = [lang.strip() for lang in args.languages.split(",") if lang.strip()]

    for path_str in args.audio:
        mp3 = Path(path_str)
        if not mp3.exists():
            print(f"  ✗ missing: {mp3}", file=sys.stderr)
            continue
        print(f"\n→ {mp3.name}")
        for lang in languages:
            transcribe_one(client, mp3, out_dir, args.force, lang)

    return 0


if __name__ == "__main__":
    sys.exit(main())
