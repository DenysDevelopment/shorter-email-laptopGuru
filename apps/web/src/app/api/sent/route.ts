import { NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@shorterlink/shared";

export async function GET() {
  const { error } = await authorize(PERMISSIONS.SENT_READ);
  if (error) return error;

  try {
    const sentEmails = await prisma.sentEmail.findMany({
      orderBy: { sentAt: "desc" },
      include: {
        landing: {
          select: {
            slug: true,
            title: true,
            video: { select: { title: true } },
          },
        },
        sentBy: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(sentEmails);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
