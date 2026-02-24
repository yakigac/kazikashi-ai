import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "家事カシ AI - 家事の可視化アプリ",
  description: "家族の家事を簡単に記録・可視化できるアプリ",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="ja">
      <body className="antialiased bg-gray-900 text-white">
        <SessionProvider session={session}>
          {session?.user && <Navigation user={session.user} />}
          <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
