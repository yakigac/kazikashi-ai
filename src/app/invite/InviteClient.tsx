"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  token: string;
}

interface Family {
  id: string;
  name: string;
}

export default function InviteClient({ token }: Props) {
  const router = useRouter();
  const [family, setFamily] = useState<Family | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Preview the invitation
    fetch(`/api/families/invite?token=${token}&preview=true`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setFamily(data.family);
      })
      .catch(() => setError("招待の読み込みに失敗しました"));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/families/invite?token=${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to accept invitation");
      }
      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-xl border border-gray-700 text-center">
        {success ? (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-xl font-bold text-white mb-2">参加しました！</h1>
            <p className="text-gray-400 text-sm">ホームに移動します...</p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
            <h1 className="text-xl font-bold text-white mb-2">ファミリーへの招待</h1>
            {family ? (
              <>
                <p className="text-gray-300 mb-6">
                  <span className="font-semibold text-white">{family.name}</span> に招待されています
                </p>
                {error && (
                  <div className="bg-red-900/30 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm mb-4">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
                >
                  {accepting ? "参加中..." : "参加する"}
                </button>
              </>
            ) : error ? (
              <div className="text-red-400">{error}</div>
            ) : (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
