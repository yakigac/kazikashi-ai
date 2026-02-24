"use client";

import { useState, useEffect, useCallback } from "react";

interface Category {
  id: string;
  name: string;
}

interface Chore {
  id: string;
  name: string;
  points: number;
  category?: { id: string; name: string } | null;
  categoryId?: string | null;
}

export default function ChoresClient() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChore, setShowAddChore] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);

  // Form state
  const [choreName, setChoreName] = useState("");
  const [chorePoints, setChorePoints] = useState(10);
  const [choreCategoryId, setChoreCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [choresRes, categoriesRes] = await Promise.all([
      fetch("/api/chores"),
      fetch("/api/categories"),
    ]);
    if (choresRes.ok) {
      const data = await choresRes.json();
      setChores(data.chores ?? []);
    }
    if (categoriesRes.ok) {
      const data = await categoriesRes.json();
      setCategories(data.categories ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAddChore(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = editingChore ? `/api/chores/${editingChore.id}` : "/api/chores";
      const method = editingChore ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: choreName,
          points: chorePoints,
          categoryId: choreCategoryId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save chore");
      }
      setChoreName("");
      setChorePoints(10);
      setChoreCategoryId("");
      setShowAddChore(false);
      setEditingChore(null);
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteChore(id: string) {
    if (!confirm("この家事を削除しますか？")) return;
    const res = await fetch(`/api/chores/${id}`, { method: "DELETE" });
    if (res.ok) fetchData();
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save category");
      }
      setCategoryName("");
      setShowAddCategory(false);
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(chore: Chore) {
    setEditingChore(chore);
    setChoreName(chore.name);
    setChorePoints(chore.points);
    setChoreCategoryId(chore.categoryId ?? "");
    setShowAddChore(true);
  }

  function cancelForm() {
    setShowAddChore(false);
    setEditingChore(null);
    setChoreName("");
    setChorePoints(10);
    setChoreCategoryId("");
    setError(null);
  }

  // Group chores by category
  const choresByCategory: Record<string, Chore[]> = {};
  const uncategorized: Chore[] = [];
  for (const chore of chores) {
    if (chore.category) {
      const key = chore.category.id;
      if (!choresByCategory[key]) choresByCategory[key] = [];
      choresByCategory[key].push(chore);
    } else {
      uncategorized.push(chore);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>✏️</span> 家事管理
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
          >
            + カテゴリ
          </button>
          <button
            onClick={() => {
              cancelForm();
              setShowAddChore(true);
            }}
            className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors"
          >
            + 家事を追加
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Add Category Form */}
      {showAddCategory && (
        <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
          <h2 className="text-base font-semibold text-white mb-4">カテゴリを追加</h2>
          <form onSubmit={handleAddCategory} className="flex gap-3">
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="カテゴリ名"
              required
              className="flex-1 bg-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-xl border border-gray-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm disabled:opacity-50"
            >
              追加
            </button>
            <button
              type="button"
              onClick={() => setShowAddCategory(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm"
            >
              キャンセル
            </button>
          </form>
        </div>
      )}

      {/* Add/Edit Chore Form */}
      {showAddChore && (
        <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
          <h2 className="text-base font-semibold text-white mb-4">
            {editingChore ? "家事を編集" : "家事を追加"}
          </h2>
          <form onSubmit={handleAddChore} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">家事名</label>
              <input
                type="text"
                value={choreName}
                onChange={(e) => setChoreName(e.target.value)}
                placeholder="例: 皿洗い、掃除機がけ..."
                required
                className="w-full bg-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-xl border border-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                ポイント: <span className="text-yellow-400 font-bold">{chorePoints}pt</span>
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={chorePoints}
                onChange={(e) => setChorePoints(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1pt</span>
                <span>50pt</span>
                <span>100pt</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">カテゴリ（任意）</label>
              <select
                value={choreCategoryId}
                onChange={(e) => setChoreCategoryId(e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-xl border border-gray-600 focus:outline-none focus:border-indigo-500"
              >
                <option value="">カテゴリなし</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {editingChore ? "更新" : "追加"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Chore List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chores.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-gray-800 rounded-2xl border border-gray-700">
          <p className="text-4xl mb-3">📋</p>
          <p>家事が登録されていません</p>
          <button
            onClick={() => setShowAddChore(true)}
            className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm"
          >
            最初の家事を追加する
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Categorized chores */}
          {Object.entries(choresByCategory).map(([catId, choreList]) => {
            const category = categories.find((c) => c.id === catId);
            return (
              <div key={catId} className="bg-gray-800 rounded-2xl border border-gray-700">
                <div className="px-5 py-3 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-300">
                    {category?.name ?? "Unknown"}
                  </h3>
                </div>
                <div className="divide-y divide-gray-700">
                  {choreList.map((chore) => (
                    <ChoreRow
                      key={chore.id}
                      chore={chore}
                      onEdit={startEdit}
                      onDelete={handleDeleteChore}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Uncategorized chores */}
          {uncategorized.length > 0 && (
            <div className="bg-gray-800 rounded-2xl border border-gray-700">
              {Object.keys(choresByCategory).length > 0 && (
                <div className="px-5 py-3 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-300">未分類</h3>
                </div>
              )}
              <div className="divide-y divide-gray-700">
                {uncategorized.map((chore) => (
                  <ChoreRow
                    key={chore.id}
                    chore={chore}
                    onEdit={startEdit}
                    onDelete={handleDeleteChore}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChoreRow({
  chore,
  onEdit,
  onDelete,
}: {
  chore: Chore;
  onEdit: (chore: Chore) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div>
        <p className="text-sm font-medium text-white">{chore.name}</p>
        <p className="text-xs text-yellow-400">{chore.points}pt</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(chore)}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
        >
          編集
        </button>
        <button
          onClick={() => onDelete(chore.id)}
          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-gray-700 transition-colors"
        >
          削除
        </button>
      </div>
    </div>
  );
}
