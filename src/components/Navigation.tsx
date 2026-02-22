"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface Props {
  user: User;
}

const navItems = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/chores", label: "家事管理", icon: "✏️" },
  { href: "/family", label: "ファミリー", icon: "👨‍👩‍👧‍👦" },
];

export default function Navigation({ user }: Props) {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <span className="text-xl mr-2">🧹</span>
            <span className="font-bold text-white text-sm hidden sm:block">家事カシ AI</span>
            <div className="flex items-center gap-1 ml-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    pathname === item.href
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="hidden sm:block">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name ?? ""}
                className="w-7 h-7 rounded-full"
              />
            )}
            <span className="text-sm text-gray-300 hidden sm:block">
              {user.name ?? user.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
