import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const choreSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  points: z.number().int().min(1).max(1000).optional(),
  categoryId: z.string().optional().nullable(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  });

  const chore = await prisma.chore.findFirst({
    where: { id, familyId: user?.familyId ?? "" },
  });

  if (!chore) {
    return NextResponse.json({ error: "Chore not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = choreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.chore.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.points !== undefined && { points: parsed.data.points }),
      ...(parsed.data.categoryId !== undefined && { categoryId: parsed.data.categoryId }),
    },
    include: { category: true },
  });

  return NextResponse.json({ chore: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  });

  const chore = await prisma.chore.findFirst({
    where: { id, familyId: user?.familyId ?? "" },
  });

  if (!chore) {
    return NextResponse.json({ error: "Chore not found" }, { status: 404 });
  }

  await prisma.chore.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
