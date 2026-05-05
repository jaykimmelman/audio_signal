# Signal · Surveillance Console — Product Requirements Document

**Status:** Prototype (deployed)
**Document version:** 1.0
**Date:** 2026-05-05
**Owner:** Jay Kimmelman, NewGlobe
**Live URL:** https://jaykimmelman.github.io/audio_signal/
**Repository:** https://github.com/jaykimmelman/audio_signal

---

## 1. Executive summary

Signal is a web-based reporting console that ingests classroom audio recordings,
transcribes them, scans the transcripts for red-flag keywords (security risk,
extremism, child-safety, corporal punishment, inappropriate behavior), and
presents the resulting "signals" through a CIA-surveillance / *Enemy of the
State*-style dashboard. The intent is to give NewGlobe and partner government
education ministries a visceral, intelligence-grade UX over what is, at its
core, a content-moderation tool for teacher conduct.

The prototype is feature-complete for a small demonstration corpus (≤30 lessons)
and runs entirely on free infrastructure (GitHub Pages, GitHub Actions, OpenAI
Whisper API). The eventual production target is on the order of **100,000
lessons/day** — that is a fundamentally different system and is explicitly
out of scope for this PRD.

---

## 2. Background & motivation

NewGlobe operates education programs across multiple African countries. As part
of its lesson-delivery platform, every classroom session produces a roughly
30-minute audio recording, stored in S3 under a deterministic key:

```
production/{country}/{location}/{academic_year}/{term}/{class}/
  mpeg_{location}_{teacher}_grade_{N}_{subject}_{YYYY_MM_DD_HH_MM_SS}.mp3
```

These recordings are presently used for instructional QA — e.g., did the teacher
follow the script? — but the audio also represents an untapped surface for
**safety-and-security oversight**: surfacing teachers who use violent,
extremist, abusive, or otherwise inappropriate language in front of students.

Manual review at NewGlobe's scale is impossible. A dashboard that
algorithmically pre-flags suspicious content, then lets a human review only
the flags in cinematic context, is the proposed solution.

---

## 3. Users & personas

| Persona | Role | What they need |
|---------|------|----------------|
| **Government oversight official** (e.g., Kenya MoE, Nigeria Federal Ministry of Education) | Reviews flagged content for political/security concerns at country or regional level | High-level map view, geographic clustering, ability to drill into a specific school or LGA |
| **NewGlobe safeguarding analyst** | Triages flagged signals daily, escalates real concerns | Dense incident list, severity ranking, full transcript context, audio playback, AI judgment to filter false positives |
| **NewGlobe curriculum/training lead** | Tracks individual teacher performance over time | Teacher dossier with trend charts, lesson history |

The cinematic UX is intentional: the government persona's existing reference
dashboard (the *NewGlobe Security Signals* mock-up) leans dark/serious/
intelligence-aesthetic, and the product is meant to feel authoritative.

---

## 4. Goals

### 4.1 Goals (current prototype)

1. **Ingest** classroom audio uploads via a setup page or directly into a
   GitHub-managed inbox.
2. **Transcribe** each recording in both English and Kiswahili using OpenAI
   Whisper, then merge the two passes per-segment to produce code-switched
   transcripts that match the way Kenyan teachers actually speak.
3. **Flag** segments containing words from a configurable, severity-tiered
   watchlist.
4. **Generate** an LLM-written 1–2 sentence analyst note per flagged signal
   that judges whether the keyword hit is a real concern or benign in context.
5. **Visualize** signals on a dark, surveillance-themed dashboard with:
   - Geographic concentration on a satellite map
   - Severity-aware KPI tiles
   - Time-series and hotspots views
   - Cinematic camera movement when drilling into a specific incident
   - In-context transcript with keyword highlighting and audio playback (with
     filter variants for noise reduction)
6. **Profile** each teacher with a dossier page: lessons, signals, weekly
   trend, basic biographical metadata, AI-generated portrait.
7. **Update** the deployed dashboard automatically on each upload via GitHub
   Actions.

### 4.2 Non-goals (out of scope for the prototype)

- Real-time / streaming transcription
- Multi-tenant authentication or role-based access control
- Actual production scale (>50 lessons in the deployed bundle)
- Integration with NewGlobe's HR system for true teacher metadata
- Email/SMS/Slack alerting on new high-severity hits
- Mobile or offline support
- Anything resembling a content-moderation appeal/review workflow
- Compliance certification (GDPR, Kenya DPA, Nigeria NDPC, COPPA-equivalent)

---

## 5. User journeys

### 5.1 Analyst triage (primary loop)

1. Analyst opens the dashboard. A pulsing red status dot, a live UTC ticker,
   and a status bar at the bottom signal that the system is online.
2. KPI tiles up top show **Total Signals**, **Critical Signals** (high-severity
   matches), **Schools with Signals**, **LGAs with Signals**.
3. The map shows a satellite view of Kenya with pulsing red bubbles over
   schools that have flagged content. Bubble color = max severity at that
   school; bubble size = signal count.
4. To the right, an **Incidents list** shows the most recent or
   highest-severity signals first, each with a colored severity dot.
5. Analyst clicks an incident. The map cinematically flies to the school
   (zoom 17, pitch 62°, bearing -25°). After the camera lands, a translucent
   **teacher profile overlay** slides in on the left side of the map with the
   teacher's headshot and metadata.
6. The right pane swaps to a **transcript pane** showing:
   - A green **Analyst Note** band with the AI-generated 1–2 sentence judgment
   - Audio player + waveform with the keyword segment marked in orange
   - A 4-button filter toggle: ORIGINAL / DENOISE / GATE / SPEECH+
   - The full transcript, with the keyword highlighted in yellow
   - Swahili segments tagged `[SW]` and shown with their English translations
     in italicized parens
7. The audio player has been pre-seeked to 3 seconds before the keyword.
   Analyst presses play and hears the relevant section immediately.
8. Analyst can click any transcript line to jump audio to that timestamp,
   or click the yellow keyword to jump to keyword + 3 s.
9. Analyst presses Esc (or the prominent **BACK TO OVERVIEW** button) to
   return to the dashboard.

### 5.2 Watchlist tuning

1. In the sidebar's **Keyword Watchlist** section, analyst clicks ✎ edit.
2. A textarea appears with the current keywords, each line in
   `keyword: severity` format. Analyst adds new terms or changes severities.
3. Save commits the new list to browser localStorage; signals across the
   entire dashboard recompute instantly (the keyword scan happens
   client-side against the lesson transcript bundle).
4. Reset to default reverts to the version shipped with the latest deploy.

### 5.3 Time-period drilldown

1. Analyst clicks a date on the time-series chart at the bottom of the
   overview. The right column of that row swaps from the *Top Hotspots*
   table to a date-filtered incidents list.
2. A reference line appears on the chart at the selected date.
3. Click the date again, or the ✕ button, to clear.

### 5.4 Teacher dossier

1. From the teacher profile overlay (in detail view), analyst clicks the
   teacher's name.
2. A full dossier page opens at `#teacher/<employee_id>`:
   - Hero card: large headshot, name, school, four big stats (Total
     Lessons, Total Signals, Critical, Risk Score)
   - Trend chart: signals per ISO week over time, with critical-signal
     line in red
   - Lessons list (chronological)
   - Signals list (sorted by severity, then date)
   - Profile metadata block (phone, hire date, last training, pupils, GPS)
3. Clicking a signal in the dossier returns to the dashboard with that
   signal opened.

### 5.5 New audio upload

1. Operator navigates to `#setup` from the SETUP button in the header.
2. First-time setup: paste a fine-grained GitHub PAT (Contents: Read & Write
   on the repo). The page verifies the token against the GitHub API.
3. Drag-and-drop or browse-select MP3/M4A files following the NewGlobe
   filename convention.
4. Click UPLOAD. Each file is committed to `audio_inbox/` via
   `PUT /repos/.../contents/...` with base64-encoded content.
5. The push triggers a GitHub Action that:
   - Installs ffmpeg + Python deps
   - Runs `transcribe.py --languages en,sw` on every audio file in the inbox
   - Runs `build_signals.py` to remux audio (faststart), generate denoise/
     gate/enhanced variants at 24 kbps, dedupe Whisper hallucinations,
     bilingual-merge segments, translate Swahili, and analyze signals
   - Auto-commits the new outputs with `[skip ci]`
   - Builds the frontend and deploys to Pages
6. The setup page polls the workflow API every 15 s and shows recent runs;
   when the deploy is green, the operator hard-refreshes the dashboard.

---

## 6. Functional requirements

### 6.1 Transcription

- F-1: Every audio file SHALL be transcribed in both English (`language=en`)
  and Kiswahili (`language=sw`) by OpenAI's `whisper-1` model.
- F-2: Each segment SHALL retain `start`, `end`, `text`, `avg_logprob`, and
  `no_speech_prob` fields.
- F-3: Transcripts SHALL be cached to `preprocess/transcripts_cache/` keyed by
  `<stem>.<lang>.json` so re-runs of the pipeline don't re-bill the API.

### 6.2 Bilingual merge

- F-4: For each English segment, the system SHALL search the Swahili pass for
  the segment with maximum temporal overlap (≥50% of the EN segment's
  duration).
- F-5: If the Swahili candidate's `avg_logprob` exceeds the English's by
  ≥ 0.10, the segment SHALL be replaced by the Swahili text *and* the
  Swahili pass's own `start`/`end` timestamps (so click-to-jump audio
  matches the displayed text).
- F-6: Each merged segment SHALL carry a `lang` field.

### 6.3 Hallucination dedup

- F-7: Both the English and Swahili segment streams SHALL be scanned before
  merging; if the same text appears 5 or more consecutive times, only the
  first 4 occurrences SHALL be retained. Genuine "repeat after me" drills
  (≤4 in a row) are preserved.

### 6.4 Translation

- F-8: Every unique Swahili segment in the merged transcript SHALL be
  translated to English using `gpt-4o-mini`, batched 20 at a time.
- F-9: Translations SHALL be cached to
  `preprocess/translations_cache.json` (keyed by raw SW text) so re-runs
  cost nothing.

### 6.5 Audio variants

- F-10: For every source MP3/M4A, the system SHALL emit:
  - `<stem>.m4a` — original, faststart-remuxed (so the moov atom is at
    the front, enabling streaming playback)
  - `<stem>.denoised.m4a` — high-pass 80 Hz, low-pass 7 kHz, FFT denoiser
    (afftdn), dynamic loudness norm (dynaudnorm)
  - `<stem>.gated.m4a` — high-pass + noise gate (-32 dB threshold) +
    dynaudnorm
  - `<stem>.enhanced.m4a` — speech-band EQ (100 Hz–6.5 kHz) + denoiser +
    compressor + dynaudnorm
- F-11: Variants SHALL be encoded to AAC at 24 kbps (matching speech-quality
  source) to keep total deployed audio volume under ~270 MB for 13 lessons.
- F-12: The browser audio player SHALL offer a 4-button toggle for
  switching variants without a page reload.

### 6.6 Filename parser

- F-13: The preprocessor SHALL extract from each filename:
  - Country / county / sub-county
  - Teacher name (snake-case → title-case)
  - Grade
  - Subject
  - Lesson date and time (YYYY_MM_DD_HH_MM_SS)
- F-14: Plus Code-derived GPS coordinates SHALL be looked up from a
  `LOCATION_COORDS` map. Unknown locations fall back to a Kenya-centroid
  default with a warning.

### 6.7 Keyword scanning

- F-15: The watchlist SHALL be tiered into HIGH / MEDIUM / LOW severity.
  Severity weight contributes to the per-school "max severity" used for
  map bubble color and to per-teacher Risk Score (sum over all signals,
  weight = `{high:10, medium:3, low:1}`).
- F-16: Matching SHALL be whole-word, case-insensitive, against both the
  raw segment text and (where present) its English translation.
- F-17: At most one signal SHALL be emitted per (lesson, segment); the
  first matching keyword wins.
- F-18: The default watchlist ships with the deployment but the analyst
  CAN override it in-browser (persisted in localStorage).

### 6.8 AI analyst notes

- F-19: For every derived signal, the preprocessor SHALL call
  `gpt-4o-mini` with the keyword, severity tier, lesson metadata, teacher
  + school context, and the 7 segments centered on the hit.
- F-20: The model SHALL respond with 1–2 sentences of plain-text judgment
  on whether the hit is a genuine concern or benign in context.
- F-21: Analyses SHALL be cached to `preprocess/analyses_cache.json`
  keyed by `signal_id` (= `lesson_id::segment_index`).
- F-22: The frontend SHALL render the analysis in a green band above the
  audio controls when the user opens a signal.

### 6.9 Map cinematic

- F-23: Clicking an incident or a school bubble SHALL trigger Mapbox
  `flyTo` with `zoom=17.2, pitch=62°, bearing=-25°, speed=0.55,
  curve=1.7`.
- F-24: The teacher profile overlay SHALL only appear AFTER the map fires
  `moveend`, with a 500 ms ease-out fade-in from -3 px translateX.
- F-25: An ISR-style corner-bracket reticle SHALL appear at the map
  center while a signal is selected, and disappear in wide view.

### 6.10 Audio playback

- F-26: When a signal is opened, the audio element SHALL pre-seek to
  `max(0, segment_start - 3)` as soon as `loadedmetadata` fires, so
  pressing play lands on the keyword in context.
- F-27: Clicking any transcript line SHALL set `audio.currentTime` to
  that segment's start and play.
- F-28: Clicking a yellow-highlighted keyword SHALL behave the same as
  the JUMP TO KEYWORD button: seek to `segment_start - 3` and play.
- F-29: A WaveSurfer.js waveform under the player SHALL render the
  audio's amplitude envelope, with an orange marker at the keyword
  segment, and SHALL track playback progress live (driven by
  `timeupdate` events on the audio element).

### 6.11 Setup page

- F-30: The setup page at `#setup` SHALL accept a GitHub PAT, store it
  in `localStorage`, and verify it via a GET to `/repos/{owner}/{repo}`.
- F-31: It SHALL accept drag-and-drop of `.mp3` / `.m4a` files,
  warn (but not block) on filenames that don't match the expected
  pattern, and upload sequentially via
  `PUT /repos/{owner}/{repo}/contents/audio_inbox/{filename}` with
  base64 content.
- F-32: It SHALL display the 8 most recent GitHub Actions runs with
  status, conclusion, and a link to the workflow page.

---

## 7. Non-functional requirements

| # | Requirement | Current state |
|---|-------------|---------------|
| NFR-1 | Cost per lesson processed ≤ $1.00 | ~$0.35 (Whisper EN+SW + translation + analyses) |
| NFR-2 | Time per lesson end-to-end ≤ 5 minutes | ~2–3 minutes for a 30-min lesson |
| NFR-3 | Site responsive on a modern laptop browser | Yes (tested Chrome / Safari) |
| NFR-4 | Static-site deploy with zero server ops | Yes (GitHub Pages) |
| NFR-5 | Total deployed audio size ≤ 1 GB | ~270 MB at 13 lessons; bursts at ~30 lessons |
| NFR-6 | All cached intermediate outputs (transcripts, translations, analyses) re-usable across runs | Yes — file-based caches |
| NFR-7 | Repository public and reproducible from clean clone | Yes, with one-time PAT + OpenAI key setup |

---

## 8. System architecture

### 8.1 Components

```
┌────────────────────┐
│   Setup page UI    │ ──┐
└────────────────────┘   │  PUT /repos/.../contents
                         ▼
                ┌──────────────────────┐
                │  GitHub repository   │
                │  (audio_inbox/)      │
                └──────────────────────┘
                         │ on push
                         ▼
                ┌──────────────────────┐
                │  GitHub Actions      │
                │   - apt-get ffmpeg   │
                │   - python venv      │
                │   - transcribe.py    │
                │   - build_signals.py │
                │   - auto-commit      │
                │   - vite build       │
                │   - deploy to Pages  │
                └──────────────────────┘
                         │
              ┌──────────┴───────────┐
              ▼                      ▼
        ┌──────────┐           ┌──────────┐
        │ OpenAI   │           │ OpenAI   │
        │ Whisper  │           │ gpt-4o-  │
        │  EN + SW │           │  mini    │
        │          │           │ (xlate + │
        │          │           │ analyze) │
        └──────────┘           └──────────┘
                         │
                         ▼
                 ┌──────────────┐
                 │ GitHub Pages │ ◀── browser fetches
                 │   (static)   │     lessons.json,
                 └──────────────┘     audio/*, etc.
```

### 8.2 Frontend stack

- **React 18** + **Vite** + **TypeScript** + **Tailwind CSS**
- **Mapbox GL JS 3** for satellite imagery + cinematic flyTo
- **Recharts** for the time-series and trend charts
- **WaveSurfer.js v7** for the audio waveform
- **Hash routing** (custom 30-line hook, no router library) for
  `#setup` and `#teacher/<id>` routes
- **All state in React Context** — keyword scanning, filtering, signal
  derivation runs in the browser against a single in-memory `lessons.json`

### 8.3 Preprocessor stack

- **Python 3.12** in a `.venv` under `preprocess/`
- **OpenAI Python SDK** for Whisper + chat completions
- **ffmpeg** (system binary) for audio remux + filter chains
- **openlocationcode** for Plus Code → lat/lon
- **dotenv** for OPENAI_API_KEY

### 8.4 Data contract (browser ↔ static JSON)

| File | Contents |
|------|----------|
| `data/teachers.json` | Array of teacher records (id, name, school_id, grade, phone, hire_date, last_training_date, pupils, headshot_url) |
| `data/schools.json` | Array of school records (id, name, town, lga, lat, lon) |
| `data/lessons.json` | Array of lesson records — each contains the full segment list with `start`, `end`, `text`, optional `text_en`, optional `lang`, plus the `audio_variants` map |
| `data/keywords.json` | Default watchlist as `[{keyword, severity}]` |
| `data/analyses.json` | Map `signal_id` → 1–2 sentence analyst note text |
| `data/audio/<stem>.m4a` (+ `.denoised.m4a`, `.gated.m4a`, `.enhanced.m4a`) | Faststart-remuxed audio |

Signals are *not* shipped as a precomputed file. They are derived in the
browser from `lessons.json × current keywords`, which is what makes the
in-browser watchlist editor instant.

### 8.5 Source filename schema

NewGlobe's S3 audio key encodes most of the metadata we need:

```
mpeg_{county}_{sub_county}_{teacher_name_snake}_grade_{N}_{subject}_{YYYY_MM_DD_HH_MM_SS}.mp3
```

The "mp3" extension is misleading — the bytes are MP4 audio (AAC-LC inside
ISO Media). The pipeline rewrites the served extension to `.m4a` so
browsers receive the correct `Content-Type: audio/mp4`, and remuxes with
`-movflags +faststart` because the Android-recorded source places the
moov atom at the END of the file (which makes `preload="metadata"`
useless until the entire file downloads).

---

## 9. Data model & severity scoring

### 9.1 Severity weights

| Severity | Weight | Default keywords (excerpt) |
|----------|--------|----------------------------|
| HIGH | 10 | jihad, weapon, bomb, attack, kill, extremist, caliphate, infidel, militant, sharia, boko, holy war |
| MEDIUM | 3 | recruit, threaten, fight, beat, cane, slap, whip, bribe, kiss, blood |
| LOW | 1 | decimal, fraction, number, money |

A teacher's **Risk Score** = `sum(severity_weight for signal in their_signals)`.
A school's map bubble color = max severity over all signals at that school.

### 9.2 Filter machinery

Two independent layers:

1. **Watchlist** (which keywords *generate* signals): editable in the
   sidebar; persists in localStorage; no commit needed.
2. **Filters** (which signals *display*): time period, LGA, school, keyword
   subset; ephemeral, reset on page reload; stored in React state.

---

## 10. UX & visual design notes

The cinematic surveillance feel is built from inexpensive pieces — none
of which are "feature flags" or third-party design systems:

- **Dark palette** (ink `#05080d`, panel `#0b1220`, line `#1f2a44`) with
  three accent colors: alert red, warn orange, accent green
- **Mono typography** (JetBrains Mono) for everything that wants to feel
  technical — timestamps, telemetry, status labels — and Inter for body
- **Scanline overlay** behind every layout, faint enough to be felt
  without being distracting
- **Pulsing red status dot** in the header (CSS-only `@keyframes`)
- **Live UTC ticker** updating every second in `DD MMM YYYY HH:MM:SSZ`
  format
- **Bottom status bar** with green-dot engine indicators ("AUDIO FILE
  UPLOAD LINK · WORKING", "TRANSCRIPTION ENGINE · WORKING", etc.) +
  live signal/lesson counts
- **Animated KPI counters** that ease between values (~220 ms cubic
  ease-out) when filters change
- **ISR corner-bracket crosshair** centered on the map only when zoomed
  to a target
- **Keyword highlighting** in transcripts with click-to-jump audio
  behavior

What was deliberately *avoided* to stay on the right side of cheesy:
sound effects, glitch text, big CLASSIFIED rubber-stamp graphics,
DECRYPTING… loading screens, three-letter agency seals.

---

## 11. Limitations & known issues

1. **Storage cap.** GitHub Pages limits the deployed site to 1 GB.
   At ~25 MB per lesson (1 original + 3 variants), we bust at ~40
   lessons. **Hard ceiling on prototype scale.**
2. **In-browser keyword scan** runs against the full `lessons.json` —
   ~580 KB at 13 lessons, scales linearly. Will become noticeable around
   ~500 lessons and unacceptable above ~5,000.
3. **No auth.** Anyone with the URL sees everything. The demo dataset is
   intentionally synthetic-adjacent (real audio, real teacher names from
   recordings, but no live HR data).
4. **GitHub PAT in browser localStorage.** Adequate for a single
   trusted operator; not adequate for a multi-user product. A PAT with
   `Contents: Read & Write` on the repo is reasonably scoped, but it
   does grant full file write access to that one repo.
5. **All audio committed to git.** Repo size will grow steadily.
   Eventually requires a migration to object storage (Cloudflare R2 / S3).
6. **Whisper hallucinations.** The dedup pass at threshold 5 catches the
   common "same phrase 50 times" failure mode but doesn't catch
   subtler hallucination (paraphrased loops, fabricated content in
   silence). Critical to remember when reviewing.
7. **Mock teacher metadata.** Phone, hire date, last training, pupils
   are all `—` placeholders. No HR-system integration.
8. **AI-generated headshots.** Used DiceBear "notionists" (line-drawing
   placeholders). Real photos require either a stock-photo CDN or a
   photo upload pipeline that doesn't exist yet.
9. **Plus Code coverage.** Only `lamu_lau` and `gachie_kbu` have real
   coordinates. Other location keys fall back to a Nairobi-area centroid.
10. **Severity matching is keyword-only.** No semantic understanding —
    the analyst note layer (gpt-4o-mini) gives some semantic judgment
    *after* the fact, but a keyword like "money" still generates a
    signal even when the AI decides it's benign.

---

## 12. Future work / scaling roadmap

### 12.1 Near-term (next 30 lessons → ~1,000)

- Move audio + audio variants out of the git repository to **Cloudflare
  R2** (or AWS S3). Frontend fetches direct from object storage; only
  JSON metadata stays in the repo. Removes the 1 GB ceiling.
- Generate only one audio variant per source (most-used: DENOISE) to
  cut storage by 67%.
- VAD-based silence stripping before Whisper to reduce per-lesson cost
  by ~30%.

### 12.2 Mid-term (1,000 → 10,000 lessons)

- Replace `lessons.json` with a real backend. Lightweight options:
  - **Render** + **Postgres** + a small FastAPI layer for queries
  - **Cloudflare Workers** + **D1** for serverless
- Move keyword scanning from the browser to a server-side index
  (Postgres full-text or Meilisearch).
- Introduce auth: GitHub OAuth as a starting point, scoped to
  NewGlobe org members.

### 12.3 Long-term (10K+ lessons or multi-country rollout)

- Self-host Whisper on cloud GPUs (`faster-whisper-large` on RunPod
  spot at ~$0.20/hr saves ~85% vs OpenAI API).
- Replace severity-keyword model with a hybrid scoring model:
  embedding similarity to known concerning content, optionally a
  fine-tuned classifier on labeled NewGlobe data.
- Real teacher metadata via a one-way feed from HRIS.
- Compliance review (Kenya DPA, Nigeria NDPC); data retention policies;
  audit logging.
- Real-time alerting layer for HIGH-severity hits.
- Network-graph view of teachers (cohorts, schools, training
  relationships) — surveillance staple.

### 12.4 Production scale (target: 100,000 lessons/day)

This is a fundamentally different system and will require a
purpose-built multi-month engineering effort. See the cost framework
discussion on file (rough estimate: $45–115K/month in cloud costs,
3–4 months of focused engineering with one or two senior engineers).

---

## 13. Success metrics

### 13.1 Prototype (demo phase)

- Stakeholder review (NewGlobe leadership): does the dashboard feel
  *meaningfully better* than the existing NewGlobe Security Signals
  Superset dashboard?
- Demo run: can a non-technical reviewer click through a flagged
  signal end-to-end (map zoom → profile → transcript → audio playback)
  in under 10 seconds?

### 13.2 Production (later)

- **Recall**: of all genuinely concerning lessons in a labeled holdout
  set, what fraction are flagged?
- **Precision**: of flagged lessons, what fraction are actually
  concerning per analyst review?
- **Time-to-triage**: median seconds an analyst spends on a single
  flagged signal before resolving it.
- **False-positive reduction**: percent of low-severity hits that
  the AI analyst note correctly tags as benign.

---

## 14. Decisions log (prototype-level architecture choices)

| Decision | Choice | Why |
|----------|--------|-----|
| Hosting | GitHub Pages | Zero-cost; analyst-shareable URL; clean GitHub-Action redeploy |
| Backend | None (static) | Acceptable at prototype scale; defers backend complexity |
| Frontend | React + Vite + TS + Tailwind | Familiar; fast iteration; small bundle |
| Map | Mapbox GL JS | Cinematic flyTo with pitch/bearing is a Mapbox specialty |
| Transcription | OpenAI Whisper API | Cheapest path to "it works"; multilingual; segment timestamps |
| Bilingual handling | Dual-pass + per-segment confidence merge | Matches Kenyan classroom code-switching reality |
| Analyst notes | gpt-4o-mini | Cheap, fast, sufficient quality at this scale |
| Translation | gpt-4o-mini | Same |
| Keyword scan | Browser-side regex | Instant editor feedback; doesn't scale past a few thousand lessons |
| Audio variants | ffmpeg with dynaudnorm (not loudnorm) | 3× faster encoding, single-pass |
| Audio container | .m4a, faststart-remuxed | Source files are MP4-in-disguise + Android moov-at-end |
| Avatar style | DiceBear "notionists" | Less silly than "personas"; line-drawing matches dossier aesthetic; CC-BY |
| Routing | Hash-based, no router | One file, 30 lines |
| Setup auth | Browser-side fine-grained PAT | Prototype-grade; not OK at scale |

---

## 15. Open questions

1. **Plus Code coverage** — when we ingest the full Kenya dataset, where
   does the master mapping (location_key → lat/lon) live? Static file in
   the repo, or fetched from an internal NewGlobe API?
2. **Real teacher metadata** — what's the source of truth (HR system,
   Salesforce, internal Postgres)? What's the read interface?
3. **Headshots** — are real teacher photos available, and is using them
   in a "surveillance dossier" UI acceptable to NewGlobe Legal?
4. **Severity tier ownership** — who owns the keyword watchlist? Is
   each country's MoE allowed to override it, or is it centrally
   maintained?
5. **Retention** — once a lesson is ingested and analyzed, how long do
   we keep the raw audio? Transcripts?
6. **Escalation workflow** — what happens after an analyst flags a real
   concern? Is there an existing ticketing system to integrate with?

---

## 16. Appendix — file map

```
audio_signal/
├── README.md
├── docs/
│   └── PRD.md                        ← this document
├── data/
│   └── keywords.txt                  default severity-tiered watchlist
├── audio_inbox/                      drop new MP3s here (gitignored .bak files)
├── preprocess/
│   ├── transcribe.py                 Whisper EN+SW
│   ├── build_signals.py              parse + dedup + merge + variants + translate + analyze
│   ├── scan_risk_vocab.py            ad-hoc transcript scanner
│   ├── transcripts_cache/            <stem>.<lang>.json (cache)
│   ├── translations_cache.json       Swahili → English (cache)
│   ├── analyses_cache.json           signal_id → analyst note (cache)
│   └── requirements.txt
├── frontend/
│   ├── public/data/                  generated outputs (json + audio variants)
│   ├── src/
│   │   ├── App.tsx                   layout + routing
│   │   ├── state.tsx                 React Context with derived signals
│   │   ├── types.ts
│   │   ├── lib/
│   │   │   ├── route.ts              hash router hook
│   │   │   └── useAnimatedNumber.ts  ease-out cubic counter tween
│   │   └── components/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       ├── KPITiles.tsx
│   │       ├── SignalMap.tsx
│   │       ├── TimeSeriesChart.tsx
│   │       ├── HotspotsTable.tsx
│   │       ├── DailySignalsTable.tsx
│   │       ├── IncidentsList.tsx
│   │       ├── TeacherProfile.tsx
│   │       ├── TranscriptPane.tsx
│   │       ├── Waveform.tsx
│   │       ├── StatusBar.tsx
│   │       ├── SetupPage.tsx
│   │       ├── TeacherDetailPage.tsx
│   │       └── Panel.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
└── .github/workflows/deploy.yml      preprocess + build + deploy on every push
```
