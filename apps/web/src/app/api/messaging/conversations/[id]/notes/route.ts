import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@shorterlink/shared";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await authorize(PERMISSIONS.MESSAGING_NOTES_READ);
  if (error) return error;

  const { id } = await params;

  const notes = await prisma.internalNote.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(notes);
}
