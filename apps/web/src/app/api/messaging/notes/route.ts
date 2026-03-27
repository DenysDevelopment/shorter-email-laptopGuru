import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@shorterlink/shared";

export async function POST(request: NextRequest) {
  const { session, error } = await authorize(PERMISSIONS.MESSAGING_NOTES_WRITE);
  if (error) return error;

  const body = await request.json();
  const { conversationId, body: noteBody } = body;

  if (!conversationId || !noteBody?.trim()) {
    return NextResponse.json(
      { error: "conversationId and body are required" },
      { status: 400 },
    );
  }

  const note = await prisma.internalNote.create({
    data: {
      conversationId,
      authorId: session.user!.id,
      body: noteBody.trim(),
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(note, { status: 201 });
}
