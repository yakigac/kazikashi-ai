"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ChoreRecord {
  id: string;
  points: number;
  date: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface Props {
  records: ChoreRecord[];
  year: number;
  month: number;
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function MonthlyChart({ records, year, month }: Props) {
  // Aggregate points by user
  const userPoints: Record<string, { name: string; points: number; count: number }> = {};

  for (const record of records) {
    const userId = record.user.id;
    if (!userPoints[userId]) {
      userPoints[userId] = {
        name: record.user.name ?? "Unknown",
        points: 0,
        count: 0,
      };
    }
    userPoints[userId].points += record.points;
    userPoints[userId].count += 1;
  }

  const chartData = Object.values(userPoints).sort((a, b) => b.points - a.points);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <p className="text-4xl mb-3">📊</p>
        <p>
          {year}年{month}月の記録はまだありません
        </p>
      </div>
    );
  }

  const monthLabel = `${year}年${month}月`;

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4 text-center">{monthLabel} の家事ポイント</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={{ stroke: "#4b5563" }}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={{ stroke: "#4b5563" }}
            label={{
              value: "pt",
              position: "insideTop",
              offset: -5,
              fill: "#6b7280",
              fontSize: 10,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#f9fafb",
            }}
            formatter={(value: number | undefined) => [`${value ?? 0}pt`, "ポイント" as const]}
          />
          <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
          <Bar dataKey="points" name="ポイント" radius={[6, 6, 0, 0]} maxBarSize={80}>
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary table */}
      <div className="mt-4 space-y-2">
        {chartData.map((user, index) => (
          <div
            key={user.name}
            className="flex items-center justify-between px-3 py-2 bg-gray-700/50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm text-white">{user.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{user.count}件</span>
              <span className="text-sm font-bold text-yellow-400">{user.points}pt</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
