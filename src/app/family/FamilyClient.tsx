"use client";

import { useState, useEffect, useCallback } from "react";

interface FamilyMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Family {
  id: string;
  name: string;
  ownerId: string;
  members: FamilyMember[];
  owner: { id: string; name: string | null; image: string | null };
}

interface Props {
  currentUserId: string;
}

export default function FamilyClient({ currentUserId }: Props) {
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [familyName, setFamilyName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const fetchFamily = useCallback(async () => {
    const res = await fetch("/api/families");
    if (res.ok) {
      const data = await res.json();
      setFamily(data.family);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  async function handleCreateFamily(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: familyName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create family");
      }
      setFamilyName("");
      fetchFamily();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateInvite() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/families/invite", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create invite");
      }
      const data = await res.json();
      setInviteToken(data.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  function getInviteUrl() {
    if (!inviteToken) return "";
    return `${window.location.origin}/invite?token=${inviteToken}`;
  }

  async function copyInviteUrl() {
    const url = getInviteUrl();
    await navigator.clipboard.writeText(url);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  const isOwner = family?.ownerId === currentUserId;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <span>👨‍👩‍👧‍👦</span> ファミリー管理
      </h1>

      {error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!family ? (
        /* Create Family */
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-2">ファミリーを作成</h2>
          <p className="text-sm text-gray-400 mb-5">
            ファミリーを作成して、家族と家事を共有しましょう
          </p>
          <form onSubmit={handleCreateFamily} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">ファミリー名</label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="例: 田中家"
                required
                className="w-full bg-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-xl border border-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
            >
              ファミリーを作成する
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Family Info */}
          <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{family.name}</h2>
                <p className="text-sm text-gray-400">
                  オーナー: {family.owner.name}
                </p>
              </div>
              {isOwner && (
                <span className="px-2 py-1 bg-indigo-900/50 text-indigo-300 text-xs rounded-full border border-indigo-700">
                  オーナー
                </span>
              )}
            </div>

            {/* Members */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                メンバー ({family.members.length}人)
              </h3>
              <div className="space-y-2">
                {family.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0"
                  >
                    {member.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.image}
                        alt={member.name ?? ""}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm">
                        {(member.name ?? member.email)[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-white">{member.name ?? "No name"}</p>
                      <p className="text-xs text-gray-400">{member.email}</p>
                    </div>
                    {member.id === family.ownerId && (
                      <span className="ml-auto text-xs text-indigo-400">オーナー</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Invite */}
          {isOwner && (
            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <h2 className="text-base font-semibold text-white mb-2">
                メンバーを招待
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                招待リンクを作成して家族と共有してください（7日間有効）
              </p>

              {inviteToken ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getInviteUrl()}
                      className="flex-1 bg-gray-700 text-gray-300 text-sm px-3 py-2 rounded-xl border border-gray-600 truncate"
                    />
                    <button
                      onClick={copyInviteUrl}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition-colors"
                    >
                      {inviteCopied ? "✓ コピー済み" : "コピー"}
                    </button>
                  </div>
                  <button
                    onClick={() => setInviteToken(null)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    閉じる
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreateInvite}
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm disabled:opacity-50 transition-colors"
                >
                  招待リンクを作成
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
