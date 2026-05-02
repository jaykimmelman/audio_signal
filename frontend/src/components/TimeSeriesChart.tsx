import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "../state";
import { Panel } from "./Panel";

export function TimeSeriesChart() {
  const { signals, selectedDate, setSelectedDate } = useApp();

  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of signals) {
      const d = s.lesson_datetime.slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return [...map.entries()].sort().map(([date, count]) => ({ date, count }));
  }, [signals]);

  return (
    <Panel
      title="Signals for Selected Period"
      right={
        selectedDate ? (
          <button
            onClick={() => setSelectedDate(null)}
            className="font-mono text-[10px] text-accent hover:text-text"
            title="Clear selected date"
          >
            ✕ {selectedDate}
          </button>
        ) : (
          <span className="font-mono text-[10px] text-muted">CLICK A DATE</span>
        )
      }
    >
      <div className="h-full p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            onClick={(state) => {
              const label = (state as { activeLabel?: string } | null)?.activeLabel;
              if (label) setSelectedDate(label === selectedDate ? null : label);
            }}
            style={{ cursor: "crosshair" }}
          >
            <CartesianGrid stroke="#1f2a44" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#7a8aa6" fontSize={11} />
            <YAxis stroke="#7a8aa6" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "#0b1220",
                border: "1px solid #1f2a44",
                fontSize: 12,
              }}
              labelStyle={{ color: "#d6e1f2" }}
            />
            {selectedDate && (
              <ReferenceLine
                x={selectedDate}
                stroke="#f5a524"
                strokeWidth={2}
                strokeDasharray="2 2"
              />
            )}
            <Line
              type="monotone"
              dataKey="count"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#f5a524", stroke: "#f5a524" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
