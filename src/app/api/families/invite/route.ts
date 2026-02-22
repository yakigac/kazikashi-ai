import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/families/invite - Create invitation link
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const family = await prisma.family.findFirst({
    where: { ownerId: session.user.id },
  });

  if (!family) {
    return NextResponse.json({ error: "Only family owner can invite" }, { status: 403 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.familyInvitation.create({
    data: {
      familyId: family.id,
      expiresAt,
    },
  });

  return NextResponse.json({ token: invitation.token }, { status: 201 });
}

// GET /api/families/invite?token=xxx - Accept or preview invitation
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const preview = searchParams.get("preview") === "true";

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const invitation = await prisma.familyInvitation.findUnique({
    where: { token },
    include: { family: true },
  });

  if (!invitation || invitation.used || invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
  }

  // Preview mode: just return family info without accepting
  if (preview) {
    return NextResponse.json({ family: invitation.family });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  });

  if (user?.familyId) {
    return NextResponse.json({ error: "Already in a family" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { familyId: invitation.familyId },
    }),
    prisma.family.update({
      where: { id: invitation.familyId },
      data: { members: { connect: { id: session.user.id } } },
    }),
    prisma.familyInvitation.update({
      where: { id: invitation.id },
      data: { used: true },
    }),
  ]);

  return NextResponse.json({ family: invitation.family });
}
