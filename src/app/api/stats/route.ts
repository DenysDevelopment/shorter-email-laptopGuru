import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    totalEmails,
    unprocessedEmails,
    totalVideos,
    totalLandings,
    totalSent,
    failedSent,
    recentEmails,
  ] = await Promise.all([
    prisma.incomingEmail.count({ where: { archived: false } }),
    prisma.incomingEmail.count({ where: { processed: false, archived: false } }),
    prisma.video.count({ where: { active: true } }),
    prisma.landing.count(),
    prisma.sentEmail.count(),
    prisma.sentEmail.count({ where: { status: "failed" } }),
    prisma.incomingEmail.findMany({
      where: { archived: false },
      orderBy: { receivedAt: "desc" },
      take: 5,
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        subject: true,
        processed: true,
        receivedAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    totalEmails,
    unprocessedEmails,
    totalVideos,
    totalLandings,
    totalSent,
    failedSent,
    recentEmails,
  });
}
