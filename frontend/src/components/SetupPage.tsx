import { useCallback, useEffect, useRef, useState } from "react";

const REPO_OWNER = "jaykimmelman";
const REPO_NAME = "audio_signal";
const PAT_KEY = "audio_signal:gh_pat";

interface WorkflowRun {
  id: number;
  name: string;
  display_title: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  head_branch: string;
}

const FILENAME_RE = /^mpeg_[a-z0-9]+_[a-z0-9]+(_[a-z0-9]+)+_grade_\d+_[a-z0-9_&]+_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}\.(mp3|m4a)$/i;

export function SetupPage() {
  const [pat, setPat] = useState<string>(() => localStorage.getItem(PAT_KEY) ?? "");
  const [patInput, setPatInput] = useState<string>(pat);
  const [verified, setVerified] = useState<"unknown" | "ok" | "bad">(pat ? "unknown" : "unknown");
  const [verifying, setVerifying] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Verify PAT on load + fetch workflow runs
  useEffect(() => {
    if (!pat) return;
    let cancelled = false;
    setVerifying(true);
    fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
      headers: { Authorization: `token ${pat}`, Accept: "application/vnd.github+json" },
    })
      .then((r) => {
        if (cancelled) return;
        setVerified(r.ok ? "ok" : "bad");
      })
      .finally(() => !cancelled && setVerifying(false));
    return () => {
      cancelled = true;
    };
  }, [pat]);

  const fetchRuns = useCallback(() => {
    if (!pat) return;
    fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=8`, {
      headers: { Authorization: `token ${pat}`, Accept: "application/vnd.github+json" },
    })
      .then((r) => r.json())
      .then((d) => setRuns(d.workflow_runs ?? []))
      .catch(() => {});
  }, [pat]);

  useEffect(() => {
    fetchRuns();
    const id = setInterval(fetchRuns, 15_000);
    return () => clearInterval(id);
  }, [fetchRuns]);

  function savePat() {
    localStorage.setItem(PAT_KEY, patInput);
    setPat(patInput);
    pushStatus(patInput ? "Token saved." : "Token cleared.");
  }

  function pushStatus(line: string) {
    setStatusLines((prev) => [...prev, `[${new Date().toLocaleTimeString("en-GB", { hour12: false })}] ${line}`]);
  }

  function onPickFiles(picked: FileList | null) {
    if (!picked) return;
    const arr = Array.from(picked).filter((f) =>
      /\.(mp3|m4a)$/i.test(f.name),
    );
    setFiles(arr);
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function uploadAll() {
    if (!pat || files.length === 0) return;
    setUploading(true);
    pushStatus(`Uploading ${files.length} file(s) to audio_inbox/…`);
    for (const f of files) {
      try {
        const base64 = await fileToBase64(f);
        pushStatus(`PUT audio_inbox/${f.name} (${(f.size / 1_000_000).toFixed(1)} MB)…`);
        const res = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/audio_inbox/${encodeURIComponent(f.name)}`,
          {
            method: "PUT",
            headers: {
              Authorization: `token ${pat}`,
              "Content-Type": "application/json",
              Accept: "application/vnd.github+json",
            },
            body: JSON.stringify({
              message: `Upload audio: ${f.name}`,
              content: base64,
              branch: "main",
            }),
          },
        );
        if (!res.ok) {
          const err = await res.text();
          pushStatus(`✗ ${f.name}: ${res.status} ${err.slice(0, 200)}`);
          continue;
        }
        pushStatus(`✓ ${f.name} committed.`);
      } catch (e) {
        pushStatus(`✗ ${f.name}: ${(e as Error).message}`);
      }
    }
    pushStatus("All uploads complete. Workflow will start within a few seconds.");
    setUploading(false);
    setFiles([]);
    setTimeout(fetchRuns, 4000);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    onPickFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6 scanline">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-muted">SETUP · INGEST</div>
          <h1 className="text-2xl font-bold text-text">Audio upload &amp; pipeline</h1>
          <p className="text-sm text-muted mt-1">
            Drop new lesson recordings into the inbox. Each upload commits the file
            to GitHub, which triggers the preprocessor (Whisper EN+SW transcription,
            keyword scan, audio variant generation) and redeploys the dashboard.
          </p>
        </div>

        {/* GitHub PAT */}
        <section className="bg-panel border border-line rounded">
          <div className="border-b border-line px-4 py-2 font-mono text-[11px] tracking-widest uppercase text-muted flex justify-between">
            <span>1 · GitHub Personal Access Token</span>
            <span className={
              verified === "ok" ? "text-accent"
                : verified === "bad" ? "text-alert"
                : "text-muted"
            }>
              {verifying ? "VERIFYING…" : verified === "ok" ? "✓ VERIFIED" : verified === "bad" ? "✗ INVALID" : "—"}
            </span>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <p className="text-muted">
              Create a token at{" "}
              <a className="text-accent underline" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                github.com/settings/personal-access-tokens/new
              </a>{" "}
              with <span className="font-mono text-text">Contents: Read &amp; Write</span> on this repo only. Stored
              in your browser localStorage.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={patInput}
                onChange={(e) => setPatInput(e.target.value)}
                placeholder="github_pat_..."
                className="flex-1 bg-panel2 border border-line rounded px-3 py-2 font-mono text-xs text-text"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={savePat}
                className="bg-accent text-ink font-bold text-xs px-4 py-2 rounded hover:brightness-110"
              >
                SAVE
              </button>
            </div>
          </div>
        </section>

        {/* Upload */}
        <section className="bg-panel border border-line rounded">
          <div className="border-b border-line px-4 py-2 font-mono text-[11px] tracking-widest uppercase text-muted">
            2 · Upload audio files
          </div>
          <div className="p-4 space-y-3 text-sm">
            <p className="text-muted text-xs leading-relaxed">
              Filenames must follow the NewGlobe convention:{" "}
              <span className="font-mono text-text">
                mpeg_&lt;county&gt;_&lt;sub&gt;_&lt;teacher&gt;_grade_&lt;N&gt;_&lt;subject&gt;_&lt;YYYY_MM_DD_HH_MM_SS&gt;.mp3
              </span>
            </p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors ${
                dragOver ? "border-accent bg-accent/5" : "border-line hover:border-muted"
              }`}
            >
              <div className="font-mono text-sm text-text">
                {files.length === 0
                  ? "Drop .mp3 / .m4a files here · or click to browse"
                  : `${files.length} file(s) selected`}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".mp3,.m4a,audio/mpeg,audio/mp4"
                hidden
                onChange={(e) => onPickFiles(e.target.files)}
              />
            </div>
            {files.length > 0 && (
              <ul className="bg-panel2 border border-line rounded divide-y divide-line">
                {files.map((f) => {
                  const valid = FILENAME_RE.test(f.name);
                  return (
                    <li key={f.name} className="px-3 py-1.5 flex items-center justify-between font-mono text-xs">
                      <span className={valid ? "text-text" : "text-warn"} title={valid ? "" : "Filename doesn't match expected pattern; parser may fail"}>
                        {valid ? "✓" : "⚠"} {f.name}
                      </span>
                      <span className="text-muted">{(f.size / 1_000_000).toFixed(1)} MB</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex gap-2">
              <button
                onClick={uploadAll}
                disabled={uploading || !pat || verified !== "ok" || files.length === 0}
                className="bg-accent text-ink font-bold text-xs px-4 py-2 rounded hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading ? "UPLOADING…" : `UPLOAD ${files.length || ""}`}
              </button>
              {files.length > 0 && (
                <button
                  onClick={() => setFiles([])}
                  disabled={uploading}
                  className="border border-line text-muted text-xs px-4 py-2 rounded hover:text-text"
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Status log */}
        <section className="bg-panel border border-line rounded">
          <div className="border-b border-line px-4 py-2 font-mono text-[11px] tracking-widest uppercase text-muted">
            3 · Status log
          </div>
          <div className="p-3 font-mono text-[11px] text-text bg-ink/50 max-h-40 overflow-auto">
            {statusLines.length === 0 ? (
              <span className="text-muted italic">no events yet</span>
            ) : (
              statusLines.map((l, i) => <div key={i}>{l}</div>)
            )}
          </div>
        </section>

        {/* Workflow runs */}
        <section className="bg-panel border border-line rounded">
          <div className="border-b border-line px-4 py-2 font-mono text-[11px] tracking-widest uppercase text-muted flex justify-between">
            <span>4 · Recent pipeline runs</span>
            <button onClick={fetchRuns} className="text-accent hover:text-text">refresh</button>
          </div>
          <div className="divide-y divide-line">
            {runs.length === 0 ? (
              <div className="p-4 text-xs text-muted italic">{pat ? "no runs yet" : "save a token to see runs"}</div>
            ) : (
              runs.map((r) => {
                const color =
                  r.conclusion === "success" ? "text-accent"
                  : r.conclusion === "failure" ? "text-alert"
                  : r.status === "in_progress" || r.status === "queued" ? "text-warn"
                  : "text-muted";
                return (
                  <a
                    key={r.id}
                    href={r.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block px-4 py-2 hover:bg-panel2 transition"
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className={`${color} font-bold uppercase`}>
                        {r.conclusion ?? r.status}
                      </span>
                      <span className="text-muted">{new Date(r.created_at).toLocaleString("en-GB", { hour12: false })}</span>
                    </div>
                    <div className="text-text text-sm truncate">{r.display_title || r.name}</div>
                  </a>
                );
              })
            )}
          </div>
        </section>

        {/* One-time setup notes */}
        <section className="bg-panel2 border border-line rounded p-4 text-xs text-muted leading-relaxed">
          <div className="font-mono text-[10px] tracking-widest uppercase text-muted mb-2">One-time setup</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Add <span className="font-mono text-text">OPENAI_API_KEY</span> as a repo secret at{" "}
              <a className="text-accent underline" href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/secrets/actions`} target="_blank" rel="noreferrer">
                Settings → Secrets and variables → Actions
              </a>{" "}
              so the GitHub Action can call Whisper.
            </li>
            <li>
              Make sure your OpenAI account has credit (one lesson costs ~$0.40
              for transcription EN+SW + translation).
            </li>
            <li>
              Each upload commits an audio file (~5MB) plus its preprocess outputs
              (~20MB). GitHub Pages caps the deployed site at 1GB.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
