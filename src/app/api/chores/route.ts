import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const choreSchema = z.object({
  name: z.string().min(1).max(100),
  points: z.number().int().min(1).max(1000),
  categoryId: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  });

  if (!user?.familyId) {
    return NextResponse.json({ chores: [] });
  }

  const chores = await prisma.chore.findMany({
    where: { familyId: user.familyId },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ chores });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  });

  if (!user?.familyId) {
    return NextResponse.json({ error: "Family not found" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = choreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const chore = await prisma.chore.create({
    data: {
      name: parsed.data.name,
      points: parsed.data.points,
      categoryId: parsed.data.categoryId ?? null,
      familyId: user.familyId,
    },
    include: { category: true },
  });

  return NextResponse.json({ chore }, { status: 201 });
}
