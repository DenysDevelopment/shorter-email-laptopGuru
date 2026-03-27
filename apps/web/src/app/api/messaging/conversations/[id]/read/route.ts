import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@shorterlink/shared";
import { emitMessagingEvent } from "@/lib/messaging-events";

/**
 * POST /api/messaging/conversations/:id/read
 * Mark all inbound messages in conversation as READ.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await authorize(PERMISSIONS.MESSAGING_CONVERSATIONS_READ);
  if (error) return error;

  const { id } = await params;

  // Find all inbound messages in this conversation that don't have READ status
  const unreadMessages = await prisma.message.findMany({
    where: {
      conversationId: id,
      direction: "INBOUND",
      statuses: { none: { status: "READ" } },
    },
    select: { id: true },
  });

  if (unreadMessages.length > 0) {
    // Create READ status events for all unread messages
    await prisma.messageStatusEvent.createMany({
      data: unreadMessages.map((m) => ({
        messageId: m.id,
        status: "READ" as const,
      })),
    });
  }

  if (unreadMessages.length > 0) {
    emitMessagingEvent({
      type: "conversation_updated",
      conversationId: id,
      data: { action: "read" },
    });
  }

  return NextResponse.json({ ok: true, markedRead: unreadMessages.length });
}
