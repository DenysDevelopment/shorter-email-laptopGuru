import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@shorterlink/shared";

export async function GET(request: NextRequest) {
  const { error } = await authorize(PERMISSIONS.MESSAGING_ANALYTICS_READ);
  if (error) return error;

  const url = request.nextUrl;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const dateFilter = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to) } : {}),
  };

  const hasDateFilter = from || to;

  const [
    totalConversations,
    openConversations,
    closedConversations,
    totalMessages,
    newContacts,
  ] = await Promise.all([
    prisma.conversation.count({
      where: hasDateFilter ? { createdAt: dateFilter } : {},
    }),
    prisma.conversation.count({
      where: {
        status: { in: ["NEW", "OPEN", "WAITING_REPLY"] },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
    }),
    prisma.conversation.count({
      where: {
        status: { in: ["CLOSED", "RESOLVED"] },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
    }),
    prisma.message.count({
      where: hasDateFilter ? { createdAt: dateFilter } : {},
    }),
    prisma.contact.count({
      where: hasDateFilter ? { createdAt: dateFilter } : {},
    }),
  ]);

  // Calculate avg response time from analytics table
  let avgResponseTime = 0;
  if (hasDateFilter) {
    const responseStats = await prisma.analyticsResponseTime.aggregate({
      where: { date: dateFilter },
      _avg: { avgResponseMs: true },
    });
    avgResponseTime = (responseStats._avg.avgResponseMs || 0) / 1000;
  }

  return NextResponse.json({
    totalConversations,
    totalMessages,
    avgResponseTime,
    openConversations,
    closedConversations,
    newContacts,
  });
}
