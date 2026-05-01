"""Generate mock teachers/schools/signals/transcripts into frontend/public/data/.

Replace this with the real preprocessor once `data/lessons_manifest.csv`
arrives. The real one will read each transcript URL from S3, run the
keyword scan against segment text, and write the same shape of JSON.
"""

from __future__ import annotations

import json
import random
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

random.seed(42)

ROOT = Path(__file__).resolve().parent.parent
KEYWORDS_FILE = ROOT / "data" / "keywords.txt"
OUT = ROOT / "frontend" / "public" / "data"
OUT_TRANSCRIPTS = OUT / "transcripts"
SAMPLE_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"

KWARA_LGAS = [
    "Asa", "Baruten", "Edu", "Ekiti", "Ifelodun",
    "Ilorin East", "Ilorin South", "Ilorin West", "Irepodun", "Isin",
    "Kaiama", "Moro", "Offa", "Oke Ero", "Oyun", "Patigi",
]

# (LGA, town, lat, lon) — rough but plausible Kwara state coordinates
TOWNS = [
    ("Ilorin West", "Ilorin",        8.4799, 4.5418),
    ("Ilorin East", "Oke Oyi",       8.5630, 4.6890),
    ("Ilorin South", "Fufu",         8.4150, 4.5800),
    ("Asa",         "Afon",          8.4600, 4.3300),
    ("Moro",        "Bode Saadu",    8.9050, 4.7833),
    ("Offa",        "Offa",          8.1500, 4.7167),
    ("Oyun",        "Ilemona",       8.1700, 4.6500),
    ("Irepodun",    "Omu-Aran",      8.1389, 5.1014),
    ("Ifelodun",    "Share",         8.7833, 4.5667),
    ("Ekiti",       "Araromi-Opin",  8.0000, 5.3000),
    ("Isin",        "Owu-Isin",      8.1167, 5.0167),
    ("Oke Ero",     "Iloffa",        8.0667, 5.1500),
    ("Edu",         "Lafiagi",       8.8667, 5.4167),
    ("Patigi",      "Patigi",        8.7333, 5.7500),
    ("Kaiama",      "Kaiama",        9.6033, 3.9417),
    ("Baruten",     "Kosubosu",      9.7833, 3.6167),
]

FIRST_NAMES = [
    "Aisha", "Abdullahi", "Bukola", "Chinwe", "Damola", "Emeka",
    "Fatima", "Grace", "Hassan", "Ibrahim", "Joy", "Kabir", "Lola",
    "Musa", "Ngozi", "Olamide", "Patience", "Quadri", "Rasheed",
    "Sade", "Tunde", "Usman", "Victoria", "Wasiu", "Yetunde", "Zainab",
]
LAST_NAMES = [
    "Adebayo", "Bello", "Chukwu", "Danjuma", "Eze", "Fashola", "Gbadamosi",
    "Hassan", "Ibrahim", "Jalo", "Kareem", "Lawal", "Mohammed", "Nwosu",
    "Okeke", "Popoola", "Quadri", "Raheem", "Sanni", "Tijani", "Umar",
    "Yusuf", "Zubairu",
]

GRADES = ["P1", "P2", "P3", "P4", "P5", "P6", "JSS1", "JSS2", "JSS3"]

# Sentences that the keyword can drop into. Each has a {} placeholder.
TEMPLATES = [
    "Today we are going to talk about how the {} can affect our community.",
    "Some people use the word {} to describe a struggle, but in this lesson we explore its true meaning.",
    "The teacher asked the class what {} means in modern Nigerian society.",
    "Children, please remember that the path of {} is not the path of peace.",
    "An older student raised his hand and said the word {} during the discussion.",
    "Yesterday's news mentioned a group that wanted to recruit youth into {}.",
    "We must learn the difference between courage and {} in our daily lives.",
]

FILLER = [
    "Good morning class, please open your textbooks to page seventeen.",
    "Today's lesson is about civics and the responsibilities of every citizen.",
    "Can anyone tell me what we discussed last Friday during the assembly?",
    "Mary, please read the next paragraph aloud for the rest of the class.",
    "Remember that homework is due on Thursday before the morning bell.",
    "Let us pause here and review the three points I wrote on the board.",
    "Now turn to your neighbour and discuss the example for two minutes.",
    "Pay attention because this part will appear on next week's test.",
    "Quiet at the back, please. We have a lot to cover before lunch.",
    "Excellent answer, James. Does anyone want to add to that thought?",
]


def make_teachers_and_schools():
    schools = []
    for i, (lga, town, lat, lon) in enumerate(TOWNS, start=1):
        # 1–2 schools per town
        for k in range(random.randint(1, 2)):
            sid = f"SCH{i:03d}{k}"
            schools.append({
                "school_id": sid,
                "name": f"{town} {'Primary' if k == 0 else 'Community'} School",
                "town": town,
                "lga": lga,
                "lat": lat + random.uniform(-0.02, 0.02),
                "lon": lon + random.uniform(-0.02, 0.02),
            })

    teachers = []
    for n in range(60):
        sch = random.choice(schools)
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        hire_year = random.randint(2014, 2024)
        last_train = date(2026, 1, 1) - timedelta(days=random.randint(15, 540))
        teachers.append({
            "employee_id": f"T{n + 1001}",
            "name": f"{first} {last}",
            "school_id": sch["school_id"],
            "grade": random.choice(GRADES),
            "phone": f"+234 {random.randint(700, 909)} {random.randint(100, 999)} {random.randint(1000, 9999)}",
            "hire_date": f"{hire_year}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}",
            "last_training_date": last_train.isoformat(),
            "pupils": random.randint(28, 64),
        })
    return teachers, schools


def synth_segments(keyword: str) -> tuple[list[dict], int]:
    """Return (segments, hit_segment_index). Each segment has start/end/text."""
    n_before = random.randint(8, 18)
    n_after = random.randint(6, 14)
    segments = []
    t = 0.0
    for _ in range(n_before):
        text = random.choice(FILLER)
        dur = max(2.5, len(text) / 14.0)
        segments.append({"start": round(t, 2), "end": round(t + dur, 2), "text": text})
        t += dur

    hit_text = random.choice(TEMPLATES).format(keyword)
    hit_dur = max(3.0, len(hit_text) / 14.0)
    hit_index = len(segments)
    segments.append({"start": round(t, 2), "end": round(t + hit_dur, 2), "text": hit_text})
    t += hit_dur

    for _ in range(n_after):
        text = random.choice(FILLER)
        dur = max(2.5, len(text) / 14.0)
        segments.append({"start": round(t, 2), "end": round(t + dur, 2), "text": text})
        t += dur

    return segments, hit_index


def make_signals(teachers, keywords):
    signals = []
    base = datetime(2026, 4, 1, tzinfo=timezone.utc)
    for i in range(85):
        teacher = random.choice(teachers)
        keyword = random.choice(keywords)
        segments, hit_index = synth_segments(keyword)
        hit_seg = segments[hit_index]

        lesson_dt = base + timedelta(
            days=random.randint(0, 28),
            hours=random.randint(7, 14),
            minutes=random.choice([0, 15, 30, 45]),
        )
        signal_id = f"SIG{i + 1:04d}"
        lesson_id = f"L{random.randint(10000, 99999)}"

        signals.append({
            "signal_id": signal_id,
            "lesson_id": lesson_id,
            "lesson_name": f"{teacher['grade']} Civics — Module {random.randint(1, 24)}",
            "lesson_datetime": lesson_dt.isoformat(),
            "employee_id": teacher["employee_id"],
            "school_id": teacher["school_id"],
            "keyword": keyword,
            "snippet": hit_seg["text"],
            "segment_start": hit_seg["start"],
            "segment_end": hit_seg["end"],
            "transcript_url": f"data/transcripts/{signal_id}.json",
            "audio_url": SAMPLE_AUDIO,
        })

        # Write the transcript file
        OUT_TRANSCRIPTS.mkdir(parents=True, exist_ok=True)
        (OUT_TRANSCRIPTS / f"{signal_id}.json").write_text(json.dumps({
            "signal_id": signal_id,
            "lesson_id": lesson_id,
            "segments": segments,
            "hit_segment_index": hit_index,
            "keyword": keyword,
        }, indent=2))
    return signals


def main():
    keywords = [
        line.strip().lower()
        for line in KEYWORDS_FILE.read_text().splitlines()
        if line.strip()
    ]
    teachers, schools = make_teachers_and_schools()
    OUT.mkdir(parents=True, exist_ok=True)
    signals = make_signals(teachers, keywords)

    (OUT / "keywords.json").write_text(json.dumps(keywords, indent=2))
    (OUT / "teachers.json").write_text(json.dumps(teachers, indent=2))
    (OUT / "schools.json").write_text(json.dumps(schools, indent=2))
    (OUT / "signals.json").write_text(json.dumps(signals, indent=2))

    print(f"Wrote {len(teachers)} teachers, {len(schools)} schools, "
          f"{len(signals)} signals, {len(signals)} transcripts to {OUT}")


if __name__ == "__main__":
    main()
