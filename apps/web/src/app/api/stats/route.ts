import { NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@laptopguru-crm/shared";

export async function GET() {
  const { session, error } = await authorize(PERMISSIONS.DASHBOARD_READ);
  if (error) return error;

  const companyId = session.user.companyId ?? "";

  const [
    totalEmails,
    unprocessedEmails,
    totalVideos,
    totalLandings,
    totalSent,
    failedSent,
    recentEmails,
  ] = await Promise.all([
    prisma.incomingEmail.count({ where: { companyId, archived: false } }),
    prisma.incomingEmail.count({ where: { companyId, processed: false, archived: false } }),
    prisma.video.count({ where: { companyId, active: true } }),
    prisma.landing.count({ where: { companyId } }),
    prisma.sentEmail.count({ where: { companyId } }),
    prisma.sentEmail.count({ where: { companyId, status: "failed" } }),
    prisma.incomingEmail.findMany({
      where: { companyId, archived: false },
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
