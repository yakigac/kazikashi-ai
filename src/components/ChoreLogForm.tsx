"use client";

import { useState } from "react";

interface Chore {
  id: string;
  name: string;
  points: number;
  category?: { id: string; name: string } | null;
}

interface FamilyMember {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  chores: Chore[];
  members: FamilyMember[];
  currentUserId: string;
  onSuccess: () => void;
}

export default function ChoreLogForm({ chores, members, currentUserId, onSuccess }: Props) {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(choreId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chore-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choreId,
          userId: selectedUserId,
          date: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to log chore");
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (chores.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>家事が登録されていません</p>
        <p className="text-sm mt-1">
          <a href="/chores" className="text-indigo-400 hover:underline">
            家事管理
          </a>{" "}
          から家事を追加してください
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/30 border border-green-500/30 text-green-300 px-4 py-2 rounded-lg text-sm">
          ✓ 記録しました
        </div>
      )}

      {/* Member selector */}
      {members.length > 1 && (
        <div>
          <label className="block text-xs text-gray-400 mb-2">実施した人</label>
          <div className="flex gap-2 flex-wrap">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedUserId(member.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                  selectedUserId === member.id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {member.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.image}
                    alt={member.name ?? ""}
                    className="w-5 h-5 rounded-full"
                  />
                )}
                {member.name ?? "Unknown"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick chore buttons */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">家事を選択してタップで記録</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {chores.map((chore) => (
            <button
              key={chore.id}
              onClick={() => handleSubmit(chore.id)}
              disabled={loading}
              className="flex flex-col items-start p-3 bg-gray-700 hover:bg-gray-600 active:bg-indigo-600 rounded-xl transition-all disabled:opacity-50 text-left"
            >
              <span className="text-sm font-medium text-white">{chore.name}</span>
              <span className="text-xs text-yellow-400 mt-1">+{chore.points}pt</span>
              {chore.category && (
                <span className="text-xs text-gray-400 mt-0.5">{chore.category.name}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">家事をタップすると即座に記録されます</p>
    </div>
  );
}
