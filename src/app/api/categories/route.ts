import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1).max(50),
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
    return NextResponse.json({ categories: [] });
  }

  const categories = await prisma.choreCategory.findMany({
    where: { familyId: user.familyId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
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
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const category = await prisma.choreCategory.create({
    data: {
      name: parsed.data.name,
      familyId: user.familyId,
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}
