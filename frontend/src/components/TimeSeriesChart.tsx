import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "../state";
import { Panel } from "./Panel";

export function TimeSeriesChart() {
  const { signals } = useApp();

  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of signals) {
      const d = s.lesson_datetime.slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return [...map.entries()].sort().map(([date, count]) => ({ date, count }));
  }, [signals]);

  return (
    <Panel title="Signals for Selected Period">
      <div className="h-full p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
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
            <Line
              type="monotone"
              dataKey="count"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 2, fill: "#ef4444" }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
