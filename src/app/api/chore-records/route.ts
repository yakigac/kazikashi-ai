import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const recordSchema = z.object({
  choreId: z.string().min(1),
  date: z.string().datetime().optional(),
  userId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  });

  if (!user?.familyId) {
    return NextResponse.json({ records: [] });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  let dateFilter = {};
  if (year && month) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    dateFilter = { date: { gte: start, lte: end } };
  }

  const records = await prisma.choreRecord.findMany({
    where: { familyId: user.familyId, ...dateFilter },
    include: {
      chore: { include: { category: true } },
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ records });
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
  const parsed = recordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const chore = await prisma.chore.findFirst({
    where: { id: parsed.data.choreId, familyId: user.familyId },
  });

  if (!chore) {
    return NextResponse.json({ error: "Chore not found" }, { status: 404 });
  }

  const targetUserId = parsed.data.userId ?? session.user.id;

  const record = await prisma.choreRecord.create({
    data: {
      choreId: parsed.data.choreId,
      userId: targetUserId,
      familyId: user.familyId,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      points: chore.points,
    },
    include: {
      chore: { include: { category: true } },
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json({ record }, { status: 201 });
}
