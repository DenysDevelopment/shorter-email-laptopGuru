import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@shorterlink/shared";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { error } = await authorize(PERMISSIONS.MESSAGING_TEAMS_MANAGE);
  if (error) return error;

  const { id: teamId, memberId } = await params;

  await prisma.teamMember.deleteMany({
    where: {
      teamId,
      userId: memberId,
    },
  });

  return NextResponse.json({ ok: true });
}
