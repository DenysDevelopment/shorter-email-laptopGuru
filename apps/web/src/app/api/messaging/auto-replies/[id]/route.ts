import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@shorterlink/shared";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await authorize(PERMISSIONS.MESSAGING_AUTO_REPLY_MANAGE);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") data.isActive = body.enabled;
  if (body.body) data.responseBody = body.body.trim();
  if (body.triggerValue !== undefined) data.keyword = body.triggerValue || null;
  if (body.triggerType) {
    const triggerMap: Record<string, string> = {
      NEW_CONVERSATION: "FIRST_MESSAGE",
      KEYWORD: "KEYWORD_MATCH",
      OUTSIDE_HOURS: "OUTSIDE_BUSINESS_HOURS",
      NO_AGENT: "FIRST_MESSAGE",
      WAIT_TIMEOUT: "FIRST_MESSAGE",
    };
    data.trigger = triggerMap[body.triggerType] || "FIRST_MESSAGE";
  }
  if (body.channelType !== undefined) {
    if (body.channelType) {
      const channel = await prisma.channel.findFirst({
        where: { type: body.channelType },
        select: { id: true },
      });
      data.channelId = channel?.id || null;
    } else {
      data.channelId = null;
    }
  }

  const rule = await prisma.autoReplyRule.update({
    where: { id },
    data,
    include: {
      channel: { select: { type: true } },
    },
  });

  return NextResponse.json({
    id: rule.id,
    name: rule.keyword ? `${rule.trigger}: ${rule.keyword}` : String(rule.trigger),
    triggerType: rule.trigger,
    triggerValue: rule.keyword,
    body: rule.responseBody,
    enabled: rule.isActive,
    channelType: rule.channel?.type || null,
    createdAt: rule.createdAt,
  });
}
