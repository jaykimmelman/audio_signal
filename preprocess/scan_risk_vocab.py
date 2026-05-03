"""Scan all cached transcripts for risk-implying vocabulary that's actually present.

Prints, per matched term, a count and 1–2 example sentences with [filename] context.
Use the output to suggest meaningful additions to data/keywords.txt.
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "preprocess" / "transcripts_cache"

# Curated candidate list, organized by risk category
CANDIDATES: dict[str, list[str]] = {
    "Corporal punishment / discipline": [
        "cane", "caning", "beat", "beating", "whip", "whipping", "slap", "spank",
        "smack", "hit", "punish", "punishment", "strike", "lash", "knock",
    ],
    "Violence / threats": [
        "kill", "killed", "killing", "fight", "fighting", "attack", "attacked",
        "blood", "weapon", "knife", "gun", "shoot", "stab", "burn",
        "destroy", "harm", "hurt", "threat", "threaten",
    ],
    "Child safety / fear": [
        "afraid", "scared", "fear", "abuse", "abused", "rape", "molest",
        "touch", "secret", "alone", "hide", "ran away",
    ],
    "Extremism / political-religious risk": [
        "jihad", "infidel", "caliphate", "sharia", "boko", "haram",
        "isis", "terrorist", "militant", "extremist", "holy war",
        "christian", "muslim", "tribe", "tribal",
    ],
    "Substance / inappropriate": [
        "drunk", "drink", "drinking", "alcohol", "beer", "drug", "drugs",
        "smoke", "smoking", "weed", "cigarette", "marijuana", "khat", "miraa",
        "sex", "sexual", "intimate", "kiss", "boyfriend", "girlfriend",
    ],
    "Authority / corruption": [
        "bribe", "money", "pay me", "gift", "favor", "secret",
    ],
    "Demeaning / abusive language": [
        "stupid", "idiot", "dumb", "useless", "worthless", "foolish",
        "lazy", "shut up", "shut your mouth", "nonsense",
    ],
    "Self-harm": [
        "suicide", "kill myself", "die", "death",
    ],
}

# Words extremely common in math/science lessons that we should NOT auto-suggest
# (high false-positive in this corpus). Caller can remove these themselves.
GENERIC_NOISE = {"hit", "money", "alone", "die"}  # 'die' = singular of dice


def main() -> None:
    transcripts = sorted(CACHE.glob("*.json"))
    print(f"Scanning {len(transcripts)} transcripts…\n")

    # term -> list of (filename, sentence)
    hits: dict[str, list[tuple[str, str]]] = defaultdict(list)

    for tj in transcripts:
        d = json.loads(tj.read_text())
        for seg in d.get("segments", []):
            text = seg.get("text", "")
            for category, terms in CANDIDATES.items():
                for term in terms:
                    pattern = re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)
                    if pattern.search(text):
                        hits[term].append((tj.stem, text.strip()))

    # Group output by category, only showing terms with hits
    for category, terms in CANDIDATES.items():
        category_hits = [(t, hits[t]) for t in terms if hits.get(t)]
        if not category_hits:
            continue
        print(f"\n## {category}")
        for term, examples in sorted(category_hits, key=lambda x: -len(x[1])):
            count = len(examples)
            noise = " (high false-positive)" if term in GENERIC_NOISE else ""
            print(f"\n  '{term}' — {count} hits{noise}")
            # Show up to 2 example sentences
            seen = set()
            shown = 0
            for fname, sentence in examples:
                short_fname = fname.split("_grade_")[0].replace("mpeg_", "")
                key = sentence[:60]
                if key in seen:
                    continue
                seen.add(key)
                # Truncate long sentences
                snippet = sentence if len(sentence) < 140 else sentence[:137] + "…"
                print(f"    [{short_fname}] {snippet}")
                shown += 1
                if shown >= 2:
                    break


if __name__ == "__main__":
    main()
