import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function normalizeDbUrl(url: string): string {
  // Add 'file:' prefix only for bare file paths (no protocol)
  if (!url.includes("://") && !url.startsWith("file:")) {
    return `file:${url}`;
  }
  return url;
}

function createPrismaClient() {
  const url = normalizeDbUrl(process.env.DATABASE_URL ?? "file:./dev.db");
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
