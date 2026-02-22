"use client";

import { useState, useEffect } from "react";
import ChoreLogForm from "@/components/ChoreLogForm";
import MonthlyChart from "@/components/MonthlyChart";

interface Chore {
  id: string;
  name: string;
  points: number;
  category?: { id: string; name: string } | null;
}

interface ChoreRecord {
  id: string;
  points: number;
  date: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  chore: {
    name: string;
    category?: { name: string } | null;
  };
}

interface FamilyMember {
  id: string;
  name: string | null;
  image: string | null;
}

interface Family {
  id: string;
  name: string;
  members: FamilyMember[];
}

interface Props {
  currentUserId: string;
}

export default function HomeClient({ currentUserId }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [chores, setChores] = useState<Chore[]>([]);
  const [records, setRecords] = useState<ChoreRecord[]>([]);
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const [choresRes, recordsRes, familyRes] = await Promise.all([
        fetch("/api/chores"),
        fetch(`/api/chore-records?year=${year}&month=${month}`),
        fetch("/api/families"),
      ]);

      if (cancelled) return;

      if (choresRes.ok) {
        const data = await choresRes.json();
        if (!cancelled) setChores(data.chores ?? []);
      }
      if (recordsRes.ok) {
        const data = await recordsRes.json();
        if (!cancelled) setRecords(data.records ?? []);
      }
      if (familyRes.ok) {
        const data = await familyRes.json();
        if (!cancelled) setFamily(data.family);
      }
      if (!cancelled) setLoading(false);
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [year, month, refreshKey]);

  function handleSuccess() {
    setRefreshKey((k) => k + 1);
  }

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const recentRecords = records.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Quick Log Section */}
      <section className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>✅</span> 家事を記録する
          </h2>
          {!family && !loading && (
            <a href="/family" className="text-xs text-indigo-400 hover:underline">
              ファミリーを作成 →
            </a>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !family ? (
          <div className="text-center py-6 text-gray-400">
            <p className="text-3xl mb-2">👨‍👩‍👧‍👦</p>
            <p>まずファミリーを作成してください</p>
            <a
              href="/family"
              className="inline-block mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition-colors"
            >
              ファミリーを作成する
            </a>
          </div>
        ) : (
          <ChoreLogForm
            chores={chores}
            members={family.members}
            currentUserId={currentUserId}
            onSuccess={handleSuccess}
          />
        )}
      </section>

      {/* Monthly Chart Section */}
      <section className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📊</span> 今月のポイント
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              ‹
            </button>
            <span className="text-sm text-gray-300 min-w-[80px] text-center">
              {year}年{month}月
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              ›
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <MonthlyChart records={records} year={year} month={month} />
        )}
      </section>

      {/* Recent Records */}
      {recentRecords.length > 0 && (
        <section className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>🕐</span> 最近の記録
          </h2>
          <div className="space-y-2">
            {recentRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  {record.user.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={record.user.image}
                      alt={record.user.name ?? ""}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <div>
                    <p className="text-sm text-white">{record.chore.name}</p>
                    <p className="text-xs text-gray-400">
                      {record.user.name} · {new Date(record.date).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-yellow-400">+{record.points}pt</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
