import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const familySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      family: {
        include: {
          members: { select: { id: true, name: true, image: true, email: true } },
          owner: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  return NextResponse.json({ family: user?.family ?? null });
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

  if (user?.familyId) {
    return NextResponse.json({ error: "Already in a family" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = familySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const family = await prisma.family.create({
    data: {
      name: parsed.data.name,
      ownerId: session.user.id,
      members: { connect: { id: session.user.id } },
    },
    include: {
      members: { select: { id: true, name: true, image: true, email: true } },
      owner: { select: { id: true, name: true, image: true } },
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { familyId: family.id },
  });

  return NextResponse.json({ family }, { status: 201 });
}
