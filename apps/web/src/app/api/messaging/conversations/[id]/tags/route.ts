import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@shorterlink/shared";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await authorize(PERMISSIONS.MESSAGING_TAGS_MANAGE);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { tagId } = body;

  if (!tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }

  const conversationTag = await prisma.conversationTag.create({
    data: {
      conversationId: id,
      tagId,
      addedBy: session.user!.id,
    },
    include: {
      tag: true,
    },
  });

  return NextResponse.json({
    id: conversationTag.tag.id,
    name: conversationTag.tag.name,
    color: conversationTag.tag.color || "#6B7280",
  }, { status: 201 });
}
