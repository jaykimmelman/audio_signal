"""Transcribe one or more MP3 files via OpenAI Whisper API.

Saves <name>.json next to the MP3 (or to --out-dir) with the shape:
    { "segments": [{ "start": float, "end": float, "text": str }, ...],
      "language": "en"|"sw"|...,
      "duration": float,
      "source_audio": "<filename.mp3>" }

Re-runs are cheap: if the .json already exists for a given .mp3, it's skipped
unless --force is passed.

Usage:
    python3 transcribe.py path/to/file.mp3 [more.mp3 ...]
    python3 transcribe.py --out-dir ../frontend/public/data/transcripts/ *.mp3
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


def transcribe_one(client: OpenAI, mp3: Path, out_dir: Path, force: bool,
                   language: str | None = None) -> Path:
    out_path = out_dir / f"{mp3.stem}.json"
    if out_path.exists() and not force:
        print(f"  ↳ cached: {out_path.name}")
        return out_path

    print(f"  ↳ uploading {mp3.name} ({mp3.stat().st_size / 1_000_000:.1f} MB)"
          f"{' lang=' + language if language else ''}…")
    kwargs = dict(
        model="whisper-1",
        response_format="verbose_json",
        timestamp_granularities=["segment"],
    )
    if language:
        kwargs["language"] = language
    with mp3.open("rb") as f:
        resp = client.audio.transcriptions.create(file=f, **kwargs)

    # `resp` is a pydantic model in v1.x — `.model_dump()` gives us a clean dict
    data = resp.model_dump() if hasattr(resp, "model_dump") else dict(resp)

    segments = [
        {"start": float(s["start"]), "end": float(s["end"]), "text": s["text"].strip()}
        for s in data.get("segments", [])
    ]
    payload = {
        "source_audio": mp3.name,
        "language": data.get("language"),
        "duration": data.get("duration"),
        "segments": segments,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"  ↳ wrote {out_path.name} · {len(segments)} segments · {payload['language']}")
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio", nargs="+", help="MP3 file(s) to transcribe")
    ap.add_argument(
        "--out-dir",
        default=str(ROOT / "preprocess" / "transcripts_cache"),
        help="Directory to write transcript JSONs (default: preprocess/transcripts_cache/)",
    )
    ap.add_argument("--force", action="store_true", help="Re-transcribe even if cached")
    ap.add_argument("--language", default=None,
                    help="ISO-639-1 language hint (e.g. en, sw). Without this, Whisper auto-detects "
                         "and sometimes hallucinates — recommended for Kenya audio.")
    args = ap.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not set. Add it to audio_signal/.env", file=sys.stderr)
        return 1

    client = OpenAI(api_key=api_key)
    out_dir = Path(args.out_dir)

    for path_str in args.audio:
        mp3 = Path(path_str)
        if not mp3.exists():
            print(f"  ✗ missing: {mp3}", file=sys.stderr)
            continue
        print(f"\n→ {mp3.name}")
        transcribe_one(client, mp3, out_dir, args.force, args.language)

    return 0


if __name__ == "__main__":
    sys.exit(main())
