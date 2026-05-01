import { useMemo } from "react";
import { useApp } from "../state";

export function Sidebar() {
  const {
    keywords,
    schools,
    allSignals,
    schoolsById,
    filters,
    setFilters,
    resetFilters,
  } = useApp();

  // Counts for live feedback
  const lgaCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of allSignals) {
      const lga = schoolsById[s.school_id]?.lga;
      if (lga) m.set(lga, (m.get(lga) ?? 0) + 1);
    }
    return m;
  }, [allSignals, schoolsById]);

  const kwCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of allSignals) m.set(s.keyword, (m.get(s.keyword) ?? 0) + 1);
    return m;
  }, [allSignals]);

  const sortedLgas = useMemo(
    () => [...lgaCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k),
    [lgaCounts],
  );

  const activeCount =
    (filters.lgas.length ? 1 : 0) +
    (filters.keywords.length ? 1 : 0) +
    (filters.schoolId ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0);

  function toggleLga(lga: string) {
    const next = filters.lgas.includes(lga)
      ? filters.lgas.filter((x) => x !== lga)
      : [...filters.lgas, lga];
    setFilters({ lgas: next });
  }

  function toggleKeyword(kw: string) {
    const next = filters.keywords.includes(kw)
      ? filters.keywords.filter((x) => x !== kw)
      : [...filters.keywords, kw];
    setFilters({ keywords: next });
  }

  return (
    <aside className="w-64 shrink-0 border-r border-line bg-panel flex flex-col">
      <div className="h-12 border-b border-line flex items-center px-4 font-mono text-xs tracking-widest text-muted">
        FILTERS · APPLIED ({activeCount})
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-4 text-sm">
        {/* Time Period */}
        <Section label="Time Period">
          <div className="grid grid-cols-2 gap-1">
            <DateInput
              value={filters.dateFrom ?? ""}
              onChange={(v) => setFilters({ dateFrom: v || null })}
              placeholder="From"
            />
            <DateInput
              value={filters.dateTo ?? ""}
              onChange={(v) => setFilters({ dateTo: v || null })}
              placeholder="To"
            />
          </div>
        </Section>

        {/* Programme — locked, only KwaraLEARN in data */}
        <Section label="Programme">
          <Locked text="KwaraLEARN" />
        </Section>

        {/* Local Government */}
        <Section
          label={`Local Government · ${filters.lgas.length || "all"}`}
          right={
            filters.lgas.length > 0 && (
              <button
                onClick={() => setFilters({ lgas: [] })}
                className="text-[10px] text-accent hover:text-text"
              >
                clear
              </button>
            )
          }
        >
          <div className="bg-panel2 border border-line rounded max-h-44 overflow-auto">
            {sortedLgas.map((lga) => {
              const checked = filters.lgas.includes(lga);
              return (
                <label
                  key={lga}
                  className={`flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-line/50 ${
                    checked ? "text-text" : "text-muted"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLga(lga)}
                      className="accent-accent"
                    />
                    <span className="text-xs">{lga}</span>
                  </span>
                  <span className="font-mono text-[10px] text-alert">
                    {lgaCounts.get(lga)}
                  </span>
                </label>
              );
            })}
          </div>
        </Section>

        {/* School */}
        <Section
          label="School"
          right={
            filters.schoolId && (
              <button
                onClick={() => setFilters({ schoolId: null })}
                className="text-[10px] text-accent hover:text-text"
              >
                clear
              </button>
            )
          }
        >
          <select
            value={filters.schoolId ?? ""}
            onChange={(e) => setFilters({ schoolId: e.target.value || null })}
            className="w-full bg-panel2 border border-line rounded px-2 py-1.5 text-xs font-mono text-text"
          >
            <option value="">All schools</option>
            {schools
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((s) => (
                <option key={s.school_id} value={s.school_id}>
                  {s.name} · {s.lga}
                </option>
              ))}
          </select>
        </Section>

        {/* Keywords */}
        <Section
          label={`Keyword Watchlist · ${keywords.length}`}
          right={
            filters.keywords.length > 0 && (
              <button
                onClick={() => setFilters({ keywords: [] })}
                className="text-[10px] text-accent hover:text-text"
              >
                clear
              </button>
            )
          }
        >
          <div className="flex flex-wrap gap-1">
            {keywords.map((k) => {
              const on = filters.keywords.includes(k);
              const c = kwCounts.get(k) ?? 0;
              return (
                <button
                  key={k}
                  onClick={() => toggleKeyword(k)}
                  className={`font-mono text-[11px] px-1.5 py-0.5 rounded border transition ${
                    on
                      ? "bg-alert text-ink border-alert"
                      : "bg-alert/10 border-alert/40 text-alert hover:bg-alert/20"
                  }`}
                  title={`${c} signal${c === 1 ? "" : "s"}`}
                >
                  {k} <span className="opacity-60">{c}</span>
                </button>
              );
            })}
          </div>
        </Section>
      </div>
      <div className="p-3 border-t border-line">
        <button
          onClick={resetFilters}
          disabled={activeCount === 0}
          className="w-full border border-line text-muted text-xs py-1.5 rounded hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
        >
          CLEAR ALL FILTERS
        </button>
      </div>
    </aside>
  );
}

function Section({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Locked({ text }: { text: string }) {
  return (
    <div className="bg-panel2 border border-line rounded px-2 py-1.5 font-mono text-xs text-muted flex items-center justify-between">
      <span>{text}</span>
      <span className="text-[10px] text-muted/60">●</span>
    </div>
  );
}

function DateInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-panel2 border border-line rounded px-2 py-1 text-xs font-mono text-text [color-scheme:dark]"
      title={placeholder}
    />
  );
}
